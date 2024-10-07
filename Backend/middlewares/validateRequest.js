import pkg from "express-validator";
const { check, validationResult } = pkg;

export const validateSignUp = [
  check("username", "Username is required").not().isEmpty(),
  check("email", "Please enter valid email").isEmail(),
  check("password", "Password must be 6 or more characters").isLength({
    min: 6,
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    next();
  },
];
