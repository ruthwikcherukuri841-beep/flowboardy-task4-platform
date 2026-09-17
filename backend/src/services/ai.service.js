// AI-assisted helpers for FlowBoard.
//
// Two modes:
//   1. LIVE — when AI_PROVIDER + AI_API_KEY are set, calls a real LLM over HTTP
//      (Gemini via the REST API, or OpenAI-compatible chat completions).
//   2. DEMO — deterministic, clearly-labeled fallback so the product never
//      breaks when no key is configured. Every response advertises its mode so
//      the UI can show "Demo mode" honestly.
import { env } from "../config/env.js";

const DEMO_NOTE = "Demo mode — add AI_API_KEY to use a real model.";

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:generateContent`;
  const res = await fetch(`${url}?key=${env.aiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned an empty response");
  return text;
}

async function callOpenAICompatible(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.aiApiKey}` },
    body: JSON.stringify({ model: env.aiModel, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`AI provider error ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("AI provider returned an empty response");
  return text;
}

// Never let a slow provider stall a request longer than this.
async function callAi(prompt) {
  const fn = env.aiProvider === "openai" ? callOpenAICompatible : callGemini;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("AI request timed out")), 9000));
  return await Promise.race([fn(prompt), timeout]);
}

const toLines = (raw) =>
  raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length >= 3)
    .slice(0, 8);

function fallbackTasks(projectTitle, projectDescription) {
  const base = projectTitle.trim() || "this project";
  const scope = projectDescription?.trim();
  const specifics = scope ? ` (${scope.slice(0, 60)}${scope.length > 60 ? "…" : ""})` : "";
  return [
    `Scope goals and success criteria for ${base}`,
    `Design the core workflow for ${base}`,
    `Build the MVP foundation of ${base}`,
    `Test ${base} with real users${specifics}`,
    `Ship, document and hand off ${base}`,
  ];
}

export async function generateTasks({ projectTitle, projectDescription }) {
  if (!env.aiApiKey) {
    return { mode: "demo", provider: "demo", model: null, note: DEMO_NOTE, tasks: fallbackTasks(projectTitle, projectDescription) };
  }
  try {
    const raw = await callAi(
      `You are a product planner. Break the project "${projectTitle}"${
        projectDescription ? ` (${projectDescription})` : ""
      } into 5 concrete, concise (max 12 words each) subtasks in the same language as the title. Return ONLY a flat list, one task per line, no bullets.`
    );
    return { mode: "live", provider: env.aiProvider, model: env.aiModel, tasks: toLines(raw) };
  } catch (err) {
    return { mode: "demo", provider: "demo", model: null, note: `${DEMO_NOTE} (${err.message})`, tasks: fallbackTasks(projectTitle, projectDescription) };
  }
}

export async function summarize({ text }) {
  const clean = (text ?? "").toString().trim();
  if (!env.aiApiKey) {
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    const lead = sentences.slice(0, 2).join(" ");
    const summary = lead
      ? `${lead}${sentences.length > 2 ? " …" : ""}`
      : clean.slice(0, 160);
    return { mode: "demo", provider: "demo", model: null, note: DEMO_NOTE, summary: `${summary}\n\n(${clean.split(/\s+/).filter(Boolean).length} words)` };
  }
  try {
    const raw = await callAi(
      `Summarize the following text in 2-3 tight sentences, same language as the source. Return ONLY the summary.\n\n${clean.slice(0, 4000)}`
    );
    return { mode: "live", provider: env.aiProvider, model: env.aiModel, summary: raw.trim() };
  } catch (err) {
    const fallback = await summarize({ text: clean });
    return { ...fallback, note: `${DEMO_NOTE} (${err.message})` };
  }
}