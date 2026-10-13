import type { RequestHandler } from "express";
import { getAdminDashboard } from "./dashboard.service";

export const getDashboard: RequestHandler = async (_request, response) => {
  const dashboard = await getAdminDashboard();
  response.status(200).json({ success: true, data: dashboard });
};
