import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Email is the single identity + discovery key. Normalize to lowercase
// + trimmed so lookups and member-matching round-trip reliably
// regardless of how the address was typed.
export const normalizeEmail = (raw) =>
  String(raw || "").trim().toLowerCase();

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "please provide a username"],
    },
    email: {
      type: String,
      required: [true, "please add a email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    // User-preferred display currency (e.g. INR, USD). UI only — we
    // don't currency-convert; this just labels amounts in their view.
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    // Soft inbox prefs — used by the invite rate limiter / privacy
    // toggle in the profile menu.
    acceptInvitesFrom: {
      type: String,
      enum: ["anyone", "nobody"],
      default: "anyone",
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
      minlength: 6,
    },
    // Password-reset OTP: we store a HASH of the 6-digit code (never the
    // code itself), an expiry, and a wrong-attempt counter so a short
    // numeric code can't be brute-forced within its window.
    resetOtpHash: { type: String, default: null, select: false },
    resetOtpExpires: { type: Date, default: null, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
  }
);
userSchema.pre("save", async function (next) {
  // Only (re)hash when the password actually changed. The early return
  // is essential: without it, a plain profile save (currency, prefs)
  // would re-hash the already-hashed password and lock the user out.
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) {
    throw new Error("Password and hashed password are required");
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
