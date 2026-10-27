import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import mongoose from "mongoose";
import { Complaint } from "../modules/complaints/complaint.model";
import { AIAnalysis } from "../modules/ai/aiAnalysis.model";
import { Notification } from "../modules/notifications/notification.model";
import { AuditLog } from "../modules/audit/auditLog.model";

async function clearAllComplaints() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB Atlas");

  console.log("🧹 Clearing all complaints, progress, and duplicate history...");

  const complaintsResult = await Complaint.deleteMany({});
  console.log(`🗑️ Deleted ${complaintsResult.deletedCount} complaints`);

  const aiResult = await AIAnalysis.deleteMany({});
  console.log(`🗑️ Deleted ${aiResult.deletedCount} AI analysis records`);

  const notifResult = await Notification.deleteMany({});
  console.log(`🗑️ Deleted ${notifResult.deletedCount} notifications`);

  const auditResult = await AuditLog.deleteMany({});
  console.log(`🗑️ Deleted ${auditResult.deletedCount} audit logs`);

  console.log("✨ All complaints and duplicate tracking cleared successfully!");
  console.log("🚀 System is completely reset for fresh complaint testing.");

  await mongoose.disconnect();
}

clearAllComplaints()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error clearing complaints:", err);
    process.exit(1);
  });
