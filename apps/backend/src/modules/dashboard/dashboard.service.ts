import { Complaint } from "../complaints/complaint.model";

export async function getAdminDashboard() {
  const [total, byStatus, byPriority, recentComplaints] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("complaintNumber title category status priority createdAt")
      .lean(),
  ]);

  return {
    totalComplaints: total,
    complaintsByStatus: byStatus,
    complaintsByPriority: byPriority,
    recentComplaints,
  };
}
