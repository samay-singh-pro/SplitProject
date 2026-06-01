import express from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { validateSignUp } from "../middlewares/validateRequest.js";
import { validateSignIn } from "../middlewares/validateLogin.js";
import { authenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", validateSignUp, registerUser);
router.post("/signin", validateSignIn, loginUser);
router.post("/logout", authenticated, logoutUser);

// Password reset (public): request a 6-digit code, then verify + reset.
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Profile
router.get("/me", authenticated, getMe);
router.patch("/me", authenticated, updateMe);

export default router;
