// Public identity helpers for user accounts.
// Each account gets a short, human-friendly public ID like "FB-7KQ2XM" and a
// @handle username so teammates can search and share without exposing emails.

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I for readability

const randomOf = (n) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

/** Short public ID, e.g. "FB-7KQ2XM". Unique across the app (verified on save). */
export const makeUid = () => `FB-${randomOf(6)}`;

/** Lowercased handle derived from a display name, e.g. "Jane Smith" -> "janesmith". */
export const makeUsername = (name = "") =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "member";

/** Normalize an edited username: lowercase, allow a-z 0-9 . _ -, no spaces. */
export const normalizeUsername = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 24);
