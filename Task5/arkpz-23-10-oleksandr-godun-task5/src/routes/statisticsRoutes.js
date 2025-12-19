import express from "express";
import {
  createStatistics,
  getStatistics,
  updateStatistics,
  deleteStatistics,
  getUserStatistics
} from "../controllers/statisticsController.js";

const router = express.Router();

router.post("/", createStatistics);
router.get("/", getStatistics);
router.put("/:id", updateStatistics);
router.delete("/:id", deleteStatistics);
router.get("/user/:id", getUserStatistics);

export default router;
