import { generateTasks, summarize } from "../services/ai.service.js";
import { asyncHandler, ok } from "../utils/http.js";

// POST /api/ai/generate-tasks — propose a task breakdown for a project title.
export const generateTasksHandler = asyncHandler(async (req, res) =>
  ok(res, await generateTasks({ projectTitle: req.body.projectTitle, projectDescription: req.body.projectDescription ?? "" }))
);

// POST /api/ai/summarize — condense a long text into a short summary.
export const summarizeHandler = asyncHandler(async (req, res) =>
  ok(res, await summarize({ text: req.body.text }))
);