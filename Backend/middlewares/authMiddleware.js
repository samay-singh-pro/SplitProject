import jwt from "jsonwebtoken";
import User from "../models/User.js";
import TokenBlacklist from '../models/TokenBlacklist.js';

export const authenticated = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const blacklistedToken = await TokenBlacklist.findOne({ token });
      if (blacklistedToken) {
        return res.status(401).json({ message: 'expired Token, please login again' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      // Token is valid but the account is gone (e.g. user deleted / DB
      // reset). Treat as unauthorized rather than letting a null
      // `req.user` flow into controllers, where `req.user._id` throws and
      // surfaces as a misleading 500.
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Account no longer exists, please log in again." });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
