import { Complaint } from "../complaints/complaint.model";
import { Department } from "../departments/department.model";
import { User } from "../users/user.model";

export async function getAdminDashboard() {
  const [
    total,
    byStatus,
    byPriority,
    byCategory,
    recentComplaints,
    totalDepartments,
    activeAdmins,
    totalCitizens,
    departments,
    admins,
  ] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Complaint.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("departmentId", "name slug")
      .select("complaintNumber title category status priority location createdAt departmentId")
      .lean(),
    Department.countDocuments(),
    User.countDocuments({ role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] }, accountStatus: "ACTIVE" }),
    User.countDocuments({ role: "CITIZEN" }),
    Department.find().sort({ name: 1 }).lean(),
    User.find({ role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] }, departmentId: { $ne: null } })
      .select("fullName email departmentId accountStatus")
      .lean(),
  ]);

  // Status mapping
  const statusCounts = {
    submitted: 0,
    underReview: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    closed: 0,
  };

  byStatus.forEach((item: { _id: string; count: number }) => {
    const st = (item._id || "").toUpperCase();
    if (st === "SUBMITTED") statusCounts.submitted += item.count;
    else if (st === "UNDER_REVIEW" || st === "VERIFIED") statusCounts.underReview += item.count;
    else if (st === "ASSIGNED") statusCounts.assigned += item.count;
    else if (st === "IN_PROGRESS") statusCounts.inProgress += item.count;
    else if (st === "RESOLVED") statusCounts.resolved += item.count;
    else if (st === "REJECTED") statusCounts.rejected += item.count;
    else if (st === "CLOSED") statusCounts.closed += item.count;
  });

  const pendingComplaints = statusCounts.submitted + statusCounts.underReview;
  const inProgressTotal = statusCounts.assigned + statusCounts.inProgress;
  const resolvedTotal = statusCounts.resolved + statusCounts.closed;

  // Build department cards data with real complaint breakdown
  const departmentWorkloads = await Promise.all(
    departments.map(async (dept) => {
      const deptId = dept._id;
      const [deptTotal, deptResolved, deptPending, deptInProgress] = await Promise.all([
        Complaint.countDocuments({ departmentId: deptId as any }),
        Complaint.countDocuments({ departmentId: deptId as any, status: "RESOLVED" }),
        Complaint.countDocuments({ departmentId: deptId as any, status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } }),
        Complaint.countDocuments({ departmentId: deptId as any, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
      ]);

      const assignedAdmins = admins.filter(
        (a) => a.departmentId && a.departmentId.toString() === deptId.toString(),
      );

      const resolutionRate =
        deptTotal > 0 ? Math.round((deptResolved / deptTotal) * 100) : 100;

      return {
        id: dept._id.toString(),
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        isActive: dept.isActive,
        totalComplaints: deptTotal,
        resolvedComplaints: deptResolved,
        pendingComplaints: deptPending,
        inProgressComplaints: deptInProgress,
        resolutionRate,
        assignedAdmins: assignedAdmins.map((a) => ({
          name: a.fullName,
          email: a.email,
          status: a.accountStatus,
        })),
      };
    }),
  );

  return {
    totalComplaints: total,
    pendingComplaints,
    inProgressComplaints: inProgressTotal,
    resolvedComplaints: resolvedTotal,
    totalDepartments,
    activeAdmins,
    totalCitizens,
    statusCounts,
    complaintsByStatus: byStatus,
    complaintsByPriority: byPriority,
    complaintsByCategory: byCategory,
    recentComplaints,
    departmentWorkloads,
  };
}

