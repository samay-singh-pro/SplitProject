import User, { normalizeEmail } from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import TokenBlacklist from "../models/TokenBlacklist.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

// Hash a reset OTP before storing/comparing — we never persist the raw
// code. SHA-256 is fine here: the code is short-lived + attempt-limited.
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

// Single source of truth for the user payload returned by login,
// signup, /me and after profile updates. Keeps the client store
// consistent regardless of which endpoint produced the response.
const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  currency: user.currency || "INR",
  acceptInvitesFrom: user.acceptInvitesFrom || "anyone",
});

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (user && (await user.comparePassword(password))) {
      res.status(200).json({
        status: 200,
        ...publicUser(user),
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
  const { username, password } = req.body;
  const email = normalizeEmail(req.body.email);

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
      ...publicUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// POST /user/forgot-password — email a 6-digit reset code.
export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    // Generic response so we don't reveal which emails have accounts.
    const generic = {
      message:
        "If an account exists for that email, a reset code has been sent.",
    };
    if (!email) return res.status(200).json(generic);

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json(generic);

    const otp = String(crypto.randomInt(100000, 1000000)); // 6 digits
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    user.resetOtpAttempts = 0;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Your splitit password reset code",
        text: `Your splitit password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        html: `
          <div style="font-family:Poppins,Arial,sans-serif;max-width:420px;margin:auto">
            <h2 style="color:#6e1a6e;margin:0 0 8px">Reset your password</h2>
            <p style="color:#444;margin:0 0 16px">Use this code to reset your splitit password. It expires in 10 minutes.</p>
            <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#1a1a1a;background:#f3eef3;border-radius:12px;padding:16px;text-align:center">${otp}</div>
            <p style="color:#888;font-size:13px;margin:16px 0 0">Didn't request this? You can safely ignore this email.</p>
          </div>`,
      });
    } catch (mailErr) {
      // Roll back so a failed send doesn't leave a dangling code.
      console.error("Failed to send reset email:", mailErr.message);
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      await user.save();
      return res.status(500).json({
        message: "Couldn't send the reset email right now. Please try again.",
      });
    }

    res.status(200).json(generic);
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /user/reset-password — verify the code + set a new password.
export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const password = String(req.body.password || "");

    const errors = {};
    if (!otp) errors.otp = "Enter the code from your email.";
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const user = await User.findOne({ email }).select(
      "+resetOtpHash +resetOtpExpires +resetOtpAttempts"
    );
    if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
      return res
        .status(400)
        .json({ message: "No active reset request. Request a new code." });
    }
    if (user.resetOtpExpires.getTime() < Date.now()) {
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res
        .status(400)
        .json({ message: "That code has expired. Request a new one." });
    }
    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res
        .status(429)
        .json({ message: "Too many attempts. Request a new code." });
    }
    if (hashOtp(otp) !== user.resetOtpHash) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({
        message: "Incorrect code. Please try again.",
        errors: { otp: "Incorrect code." },
      });
    }

    // Success — set the new password (the pre-save hook hashes it) and
    // clear the reset state so the code can't be reused.
    user.password = password;
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    await user.save();

    res.status(200).json({ message: "Password updated. You can now log in." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /auth/me — refresh the cached user (called on app boot or
// after profile edits from another tab).
export const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /auth/me — update profile fields the user can edit from
// their ProfileMenu. Currency and invite preference. Never
// trust the client for _id / email / role / etc — those stay
// immutable here.
export const updateMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const errors = {};

    if (req.body.currency !== undefined) {
      const c = String(req.body.currency || "")
        .trim()
        .toUpperCase();
      if (c && !/^[A-Z]{3,5}$/.test(c)) {
        errors.currency = "Currency must be a 3-5 letter code.";
      } else {
        user.currency = c || "INR";
      }
    }

    if (req.body.acceptInvitesFrom !== undefined) {
      const v = String(req.body.acceptInvitesFrom);
      if (v !== "anyone" && v !== "nobody") {
        errors.acceptInvitesFrom = "Must be 'anyone' or 'nobody'.";
      } else {
        user.acceptInvitesFrom = v;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    await user.save();
    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Error in updateMe:", error);
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
