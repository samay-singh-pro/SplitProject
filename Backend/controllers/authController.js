import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import TokenBlacklist from "../models/TokenBlacklist.js";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (user && (await user.comparePassword(password))) {
      res.status(200).json({
        status: 200,
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }
    const user = await User.create({
      username,
      email,
      password,
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    const blacklistToken = new TokenBlacklist({ token, expiresAt });
    await blacklistToken.save();
    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
