import express from "express";
import {
  createDevice,
  getDevices,
  getDevice,      
  updateDevice,
  deleteDevice,
} from "../controllers/deviceController.js";

const router = express.Router();

router.post("/", createDevice);
router.get("/", getDevices);
router.get("/:id", getDevice);     
router.patch("/:id", updateDevice);
router.delete("/:id", deleteDevice);

export default router;
