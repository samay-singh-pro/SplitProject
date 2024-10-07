import express from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/authController.js";
import { validateSignUp } from "../middlewares/validateRequest.js";
import { validateSignIn } from "../middlewares/validateLogin.js";
import { authenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", validateSignUp, registerUser);
router.post("/signin", validateSignIn, loginUser);
router.post('/logout', authenticated, logoutUser);

export default router;
