import { z } from "zod";

export const generateTasksSchema = z.object({
  projectTitle: z.string().min(3, "project title is required").max(120),
  projectDescription: z.string().max(2000).optional().default(""),
}).strict();

export const summarizeSchema = z.object({
  text: z.string().min(1, "text is required").max(8000),
}).strict();