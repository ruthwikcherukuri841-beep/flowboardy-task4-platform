import { Router } from "express";
import { generateTasksHandler, summarizeHandler } from "../controllers/ai.controller.js";
import { validate } from "../middlewares/http.js";
import { generateTasksSchema, summarizeSchema } from "../validators/ai.schema.js";

export const aiRouter = Router();

aiRouter.post("/generate-tasks", validate(generateTasksSchema), generateTasksHandler);
aiRouter.post("/summarize", validate(summarizeSchema), summarizeHandler);