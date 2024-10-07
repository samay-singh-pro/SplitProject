import pkg from "express-validator";
const { check, validationResult } = pkg;

export const validateSignIn = [
  check("email", "Please enter a valid email").isEmail(),
  check("password", "Password is required").not().isEmpty(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
