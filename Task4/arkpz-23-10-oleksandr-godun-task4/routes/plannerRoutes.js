import express from "express";
import {
  createPlanner,
  getPlanners,
  subscribeToPlanner,
  unsubscribeFromPlanner,
  getPlannerSubscribers,
  updateSubscriberRole,
  getUserSubscriptions,
} from "../controllers/plannerController.js";

const router = express.Router();

router.post("/", createPlanner);
router.get("/", getPlanners);

router.post("/subscribe", subscribeToPlanner);
router.delete("/unsubscribe", unsubscribeFromPlanner);

router.get("/:id/subscribers", getPlannerSubscribers);
router.put("/role", updateSubscriberRole);

router.get("/user/:user_id", getUserSubscriptions);

export default router;
