import express from "express";
import cors from "cors";
import helmet from "helmet";
import { getDatabaseStatus } from "./database/connection";
import authRouter from "./modules/auth/auth.routes";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import complaintRouter from "./modules/complaints/complaint.routes";
import departmentRouter from "./modules/departments/department.routes";
import dashboardRouter from "./modules/dashboard/dashboard.routes";
import notificationRouter from "./modules/notifications/notification.routes";
import { superAdminDeptRouter } from "./modules/admin/department-admin.routes";
import { departmentAdminRouter } from "./modules/department-admin/department-admin.routes";
import { AppError } from "./utils/app-error";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(requestOrigin, callback) {
      const allowedOrigin = process.env.FRONTEND_URL ?? "http://localhost:5173";

      // In development, allow any localhost/127.0.0.1 origin (Expo may auto-increment ports)
      if (process.env.NODE_ENV !== "production") {
        if (
          !requestOrigin ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
        ) {
          callback(null, true);
          return;
        }
      }

      // In production (or non-localhost requests), only allow the configured origin
      if (!requestOrigin || requestOrigin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to CivicAI PMC Backend API",
  });
});

app.get("/api/health", (_req, res) => {
  const database = getDatabaseStatus();
  const isHealthy = database === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? "ok" : "degraded",
    server: "running",
    database,
  });
});

app.get("/api/v1/health", (_req, res) => {
  const database = getDatabaseStatus();
  const isHealthy = database === "connected";

  res.status(200).json({
    success: true,
    message: "CivicAI API is running",
    status: isHealthy ? "ok" : "degraded",
    server: "running",
    database,
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/auth", authRouter);
app.use("/auth", authRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/v1/admin/dashboard", dashboardRouter);
app.use("/api/admin/dashboard", dashboardRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin/department-admins", superAdminDeptRouter);
app.use("/api/admin/department-admins", superAdminDeptRouter);
app.use("/api/v1/department-admin", departmentAdminRouter);
app.use("/api/department-admin", departmentAdminRouter);
app.use((_request, _response, next) => {
  next(new AppError("The requested endpoint does not exist.", 404, "NOT_FOUND"));
});
app.use(errorHandler);

export default app;