import { Router } from "express";
import authRoutes from "./auth.routes";

const mainRouter = Router();

const API_PREFIX = "/api/v1";

mainRouter.use(`${API_PREFIX}/auth`, authRoutes);

export default mainRouter;
