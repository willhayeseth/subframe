import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subdomainsRouter from "./subdomains";
import walletsRouter from "./wallets";
import openaiRouter from "./openai";
import uploadRouter from "./upload";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subdomainsRouter);
router.use(walletsRouter);
router.use(openaiRouter);
router.use(uploadRouter);
router.use(adminRouter);

export default router;
