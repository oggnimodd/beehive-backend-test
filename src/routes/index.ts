import { Router } from "express";
import authRoutes from "./auth.routes";

const mainRouter = Router();

mainRouter.use("/api/v1/auth", authRoutes);

export default mainRouter;
