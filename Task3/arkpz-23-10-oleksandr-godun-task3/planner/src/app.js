import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 📦 Імпорт маршрутів
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import statisticsRoutes from "./routes/statisticsRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import deviceCommandRoutes from "./routes/deviceCommandRoutes.js";

dotenv.config();

const app = express();

// 🟢 VERY IMPORTANT — включає body-parser
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🟦 IoT маршрути ПОВИННІ бути першими
app.use("/devices", deviceCommandRoutes);

// 🟨 CRUD маршрути — після IoT
app.use("/devices", deviceRoutes);

// 🔹 Решта системних маршрутів
app.use("/users", userRoutes);
app.use("/tasks", taskRoutes);
app.use("/categories", categoryRoutes);
app.use("/statuses", statusRoutes);
app.use("/statistics", statisticsRoutes);
app.use("/planners", plannerRoutes);

// 🔹 Перевірка API
app.get("/", (req, res) => {
  res.send("Planner API працює ✅");
});

export default app;
