import express from "express";
import { getAllExpense, logExpense } from "../controllers/expenseController.js";
import { authenticated } from "../middlewares/authMiddleware.js";
import { validateExpense } from "../middlewares/expenseValidation.js";

const router = express.Router();

router.post("/add", authenticated, logExpense);
router.get("/getAll/:groupId", authenticated, getAllExpense);
export default router;
