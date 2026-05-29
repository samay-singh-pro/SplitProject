import express from "express";
import {
  getAllExpense,
  logExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import { authenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", authenticated, logExpense);
router.get("/getAll/:groupId", authenticated, getAllExpense);
router.patch("/:expenseId", authenticated, updateExpense);
router.delete("/:expenseId", authenticated, deleteExpense);

export default router;
