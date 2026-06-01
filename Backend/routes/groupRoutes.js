import { authenticated } from "../middlewares/authMiddleware.js";
import express from "express";
import {
  createGroup,
  getUserGroups,
  updateGroup,
  addMember,
  removeMember,
  deleteGroup,
  includeMe,
} from "../controllers/groupController.js";
import multer from "multer";
import { config } from "dotenv";
import cloudinaryModule from "cloudinary";
import { getGroupStats } from "../controllers/statsController.js";

config({ path: "./config/config.env" });
const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage instead of CloudinaryStorage
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, JPEG, and PNG are allowed.'));
    }
  }
});

const router = express.Router();

router.post("/create", upload.single("image"), authenticated, createGroup);
router.get("/getAll", authenticated, getUserGroups);
router.get("/:groupId/stats", authenticated, getGroupStats);

// Edit / delete group and member management
router.patch(
  "/:groupId",
  upload.single("image"),
  authenticated,
  updateGroup
);
router.delete("/:groupId", authenticated, deleteGroup);
router.post("/:groupId/members", authenticated, addMember);
router.delete("/:groupId/members/:memberId", authenticated, removeMember);
// Add the current user to the group as an accepted member.
router.post("/:groupId/include-me", authenticated, includeMe);

export default router;
