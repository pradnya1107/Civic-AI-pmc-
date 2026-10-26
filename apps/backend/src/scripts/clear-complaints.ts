import dotenv from "dotenv";
import { connectToDatabase, disconnectFromDatabase } from "../database/connection";
import { Complaint } from "../modules/complaints/complaint.model";

dotenv.config();

async function clearAllComplaints() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();
    
    const countBefore = await Complaint.countDocuments();
    console.log(`Found ${countBefore} complaints in database.`);
    
    const result = await Complaint.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} complaints! All dashboards are now clean.`);
  } catch (error) {
    console.error("Failed to clear complaints:", error);
  } finally {
    await disconnectFromDatabase();
    console.log("Disconnected from database.");
  }
}

clearAllComplaints();
