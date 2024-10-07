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
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
