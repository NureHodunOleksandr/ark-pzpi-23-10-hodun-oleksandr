import express from "express";
import {
  createStatus,
  getStatuses,
  updateStatus,
  deleteStatus,
} from "../controllers/statusController.js";

const router = express.Router();

router.post("/", createStatus);
router.get("/", getStatuses);
router.put("/:id", updateStatus);
router.delete("/:id", deleteStatus);

export default router;
