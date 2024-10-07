import { check, validationResult } from "express-validator";

export const validateExpense = [
  check("groupId", "Group is required").not().isEmpty(),
  check("amount", "Amount is required").isNumeric(),
  check("description", "Description is required").not().isEmpty(),
  check("category", "Category is required").not().isEmpty(),
  check("spenderId", "Spender is required").not().isEmpty(),
  check("splitDetails", "Split members are required").isArray(),
  check("splitType", "Split type is required and must be valid").isIn([
    "equally",
    "unequally",
    "percentage",
  ]),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
