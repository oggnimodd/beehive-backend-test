import { Router } from "express";
import authRoutes from "./auth.routes";
import authorRoutes from "./author.routes";

const mainRouter = Router();
const API_PREFIX = "/api/v1";

mainRouter.use(`${API_PREFIX}/auth`, authRoutes);
mainRouter.use(`${API_PREFIX}/authors`, authorRoutes);

export default mainRouter;
