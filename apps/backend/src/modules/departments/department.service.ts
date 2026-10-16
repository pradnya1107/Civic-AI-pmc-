import { Types } from "mongoose";
import { Department } from "./department.model";
import { Complaint } from "../complaints/complaint.model";
import { User } from "../users/user.model";
import { AppError } from "../../utils/app-error";

export async function listDepartments(options?: { includeInactive?: boolean }) {
  const filter = options?.includeInactive ? {} : { isActive: true };
  const departments = await Department.find(filter).sort({ name: 1 }).lean();

  const [complaintCounts, adminCounts] = await Promise.all([
    Complaint.aggregate([
      { $group: { _id: "$departmentId", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } } } },
    ]),
    User.aggregate([
      { $match: { role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] }, departmentId: { $ne: null } } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
  ]);

  const complaintMap = new Map<string, { total: number; resolved: number }>();
  complaintCounts.forEach((c: { _id: Types.ObjectId | null; total: number; resolved: number }) => {
    if (c._id) complaintMap.set(c._id.toString(), { total: c.total, resolved: c.resolved });
  });

  const adminMap = new Map<string, number>();
  adminCounts.forEach((a: { _id: Types.ObjectId | null; count: number }) => {
    if (a._id) adminMap.set(a._id.toString(), a.count);
  });

  return departments.map((dept) => {
    const id = dept._id.toString();
    const cData = complaintMap.get(id) || { total: 0, resolved: 0 };
    const adminCount = adminMap.get(id) || 0;
    const resolutionRate = cData.total > 0 ? Math.round((cData.resolved / cData.total) * 100) : 100;

    return {
      _id: dept._id,
      id,
      name: dept.name,
      slug: dept.slug,
      description: dept.description || "",
      isActive: dept.isActive,
      complaintCount: cData.total,
      resolvedCount: cData.resolved,
      resolutionRate,
      adminCount,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    };
  });
}

export async function getDepartmentById(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid department ID provided.", 400, "INVALID_INPUT");
  }

  const dept = await Department.findById(id).lean();
  if (!dept) {
    throw new AppError("Department not found.", 404, "DEPARTMENT_NOT_FOUND");
  }

  const [complaintsCount, admins] = await Promise.all([
    Complaint.countDocuments({ departmentId: dept._id }),
    User.find({ departmentId: dept._id, role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] } })
      .select("fullName email role accountStatus createdAt")
      .lean(),
  ]);

  return {
    ...dept,
    id: dept._id.toString(),
    complaintCount: complaintsCount,
    admins,
  };
}

export async function createDepartment(input: {
  name: string;
  description?: string;
  slug?: string;
}) {
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    throw new AppError("Department name must be between 2 and 100 characters.", 400, "INVALID_INPUT");
  }

  const slug = (input.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) || "dept-" + Date.now();

  const existing = await Department.findOne({
    $or: [{ name: { $regex: new RegExp(`^${name}$`, "i") } }, { slug }],
  });

  if (existing) {
    throw new AppError("A department with this name or slug already exists.", 409, "DEPARTMENT_ALREADY_EXISTS");
  }

  const dept = await Department.create({
    name,
    slug,
    description: input.description?.trim() || "",
    isActive: true,
  });

  return dept.toJSON();
}

export async function updateDepartment(
  id: string,
  input: { name?: string; description?: string; isActive?: boolean },
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid department ID provided.", 400, "INVALID_INPUT");
  }

  const dept = await Department.findById(id);
  if (!dept) {
    throw new AppError("Department not found.", 404, "DEPARTMENT_NOT_FOUND");
  }

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
      throw new AppError("Department name must be between 2 and 100 characters.", 400, "INVALID_INPUT");
    }
    dept.name = trimmed;
  }

  if (input.description !== undefined) {
    dept.description = input.description.trim();
  }

  if (input.isActive !== undefined) {
    dept.isActive = Boolean(input.isActive);
  }

  await dept.save();
  return dept.toJSON();
}

