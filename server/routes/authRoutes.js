import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  register,
} from "../controllers/authController.js";
import authenticate from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, getCurrentUser);

export default router;
