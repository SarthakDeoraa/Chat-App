import { Router } from "express";
import { getMe, getAllUsers } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/me", authenticate, getMe);
router.get("/", authenticate, getAllUsers);

export default router;
