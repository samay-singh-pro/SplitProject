import { authenticated } from "../middlewares/authMiddleware.js";
import express from "express";
import { createGroup, getUserGroups } from "../controllers/groupController.js";
import multer from "multer";
import { config } from "dotenv";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinaryModule from "cloudinary";
import { getGroupStats } from "../controllers/statsController.js";

config({ path: "./config/config.env" });
const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "group_images", // The folder where images will be uploaded
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage: storage });

const router = express.Router();

router.post("/create", upload.single("image"), authenticated, createGroup);
router.get("/getAll", authenticated, getUserGroups);
router.get('/:groupId/stats',authenticated, getGroupStats);

export default router;
