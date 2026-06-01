import express from "express";
import {
  listMyInvites,
  respondToInvite,
} from "../controllers/inviteController.js";
import { authenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All invite routes require auth — invites are private to the
// invitee and only they can list / respond.
router.get("/me", authenticated, listMyInvites);
router.patch("/:id", authenticated, respondToInvite);

export default router;
