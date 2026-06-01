import express from "express";
import {
  getPersonalExpenses,
  addPersonalExpense,
  updatePersonalExpense,
  deletePersonalExpense,
} from "../controllers/personalController.js";
import { authenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All personal-expense routes are private to the logged-in user.
router.get("/", authenticated, getPersonalExpenses);
router.post("/", authenticated, addPersonalExpense);
router.patch("/:id", authenticated, updatePersonalExpense);
router.delete("/:id", authenticated, deletePersonalExpense);

export default router;
