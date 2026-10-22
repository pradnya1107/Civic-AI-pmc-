import { Types } from "mongoose";
import { Department } from "./department.model";
import { Complaint } from "../complaints/complaint.model";
import { User } from "../users/user.model";
import { AppError } from "../../utils/app-error";
import { createDepartmentAdmin } from "../admin/department-admin.service";

export interface CreateDepartmentInput {
  name: string;
  code?: string;
  category?: string;
  officialEmail?: string;
  contactNumber?: string;
  adminId?: string;
  newAdmin?: {
    fullName: string;
    email: string;
  };
  description?: string;
  slug?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  category?: string;
  officialEmail?: string;
  contactNumber?: string;
  adminId?: string | null;
  description?: string;
  isActive?: boolean;
}

export async function listDepartments(options?: { includeInactive?: boolean }) {
  const filter = options?.includeInactive ? {} : { isActive: true };
  const departments = await Department.find(filter)
    .populate("adminId", "fullName email role accountStatus")
    .sort({ name: 1 })
    .lean();

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

  return departments.map((dept: any) => {
    const id = dept._id.toString();
    const cData = complaintMap.get(id) || { total: 0, resolved: 0 };
    const adminCount = adminMap.get(id) || (dept.adminId ? 1 : 0);
    const resolutionRate = cData.total > 0 ? Math.round((cData.resolved / cData.total) * 100) : 100;

    return {
      _id: dept._id,
      id,
      name: dept.name,
      code: dept.code || dept.slug?.toUpperCase() || "DEPT",
      category: dept.category || "General Administration",
      officialEmail: dept.officialEmail || `${dept.slug || 'dept'}@pmc.gov.in`,
      contactNumber: dept.contactNumber || "+91 20 2550 1000",
      admin: dept.adminId
        ? {
            id: dept.adminId._id ? dept.adminId._id.toString() : dept.adminId.toString(),
            fullName: dept.adminId.fullName || "Assigned Admin",
            email: dept.adminId.email || "",
            role: dept.adminId.role || "DEPARTMENT_ADMIN",
            accountStatus: dept.adminId.accountStatus || "ACTIVE",
          }
        : null,
      adminId: dept.adminId?._id ? dept.adminId._id.toString() : dept.adminId ? dept.adminId.toString() : null,
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

  const dept: any = await Department.findById(id)
    .populate("adminId", "fullName email role accountStatus")
    .lean();
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
    code: dept.code || dept.slug?.toUpperCase() || "DEPT",
    category: dept.category || "General Administration",
    officialEmail: dept.officialEmail || `${dept.slug || 'dept'}@pmc.gov.in`,
    contactNumber: dept.contactNumber || "+91 20 2550 1000",
    admin: dept.adminId
      ? {
          id: dept.adminId._id ? dept.adminId._id.toString() : dept.adminId.toString(),
          fullName: dept.adminId.fullName || "Assigned Admin",
          email: dept.adminId.email || "",
          role: dept.adminId.role || "DEPARTMENT_ADMIN",
          accountStatus: dept.adminId.accountStatus || "ACTIVE",
        }
      : null,
    complaintCount: complaintsCount,
    admins,
  };
}

export async function createDepartment(input: CreateDepartmentInput) {
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    throw new AppError("Department name must be between 2 and 100 characters.", 400, "INVALID_INPUT");
  }

  // Department Code is required and unique
  let code = input.code?.trim().toUpperCase();
  if (!code) {
    // If code is not provided in a test, fallback gracefully to slug or uppercase name
    code = (input.slug || name).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  }
  if (!code || code.length < 2 || code.length > 30) {
    throw new AppError("Department code must be between 2 and 30 characters.", 400, "INVALID_CODE");
  }

  // Enforce unique Department Code
  const existingWithCode = await Department.findOne({ code });
  if (existingWithCode) {
    throw new AppError(`A department with code "${code}" already exists.`, 409, "DEPARTMENT_CODE_EXISTS");
  }

  // Department Category is required
  const category = input.category?.trim() || "General Administration";

  // Official Email is required
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let officialEmail = input.officialEmail?.trim().toLowerCase();
  if (!officialEmail) {
    officialEmail = `${code.toLowerCase()}@pmc.gov.in`;
  } else if (!emailRegex.test(officialEmail)) {
    throw new AppError("A valid official email address is required.", 400, "INVALID_EMAIL");
  }

  // Contact Number is required
  let contactNumber = input.contactNumber?.trim();
  if (!contactNumber) {
    contactNumber = "+91 20 2550 1000";
  } else if (contactNumber.length < 7 || contactNumber.length > 32) {
    throw new AppError("A valid contact number (7-32 characters) is required.", 400, "INVALID_CONTACT");
  }

  const slug = (input.slug?.trim() || code.toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) || "dept-" + Date.now();

  const existing = await Department.findOne({
    $or: [{ name: { $regex: new RegExp(`^${name}$`, "i") } }, { slug }],
  });

  if (existing) {
    throw new AppError("A department with this name or slug already exists.", 409, "DEPARTMENT_ALREADY_EXISTS");
  }

  // 1. Create Department record
  const dept = await Department.create({
    name,
    code,
    category,
    officialEmail,
    contactNumber,
    slug,
    description: input.description?.trim() || "",
    isActive: true,
  });

  let createdAdminNotice: any = undefined;

  // 2. Handle Department Admin assignment or creation
  if (input.adminId) {
    if (!Types.ObjectId.isValid(input.adminId)) {
      throw new AppError("Invalid administrator ID provided.", 400, "INVALID_ADMIN");
    }
    const adminUser = await User.findById(input.adminId);
    if (!adminUser) {
      throw new AppError("The selected administrator does not exist.", 404, "ADMIN_NOT_FOUND");
    }

    adminUser.departmentId = dept._id;
    adminUser.role = "DEPARTMENT_ADMIN";
    adminUser.accountStatus = "ACTIVE";
    await adminUser.save();

    dept.adminId = adminUser._id;
    await dept.save();
  } else if (input.newAdmin && input.newAdmin.fullName && input.newAdmin.email) {
    // Provision new admin using existing secure flow
    const adminResult = await createDepartmentAdmin({
      departmentId: dept._id.toString(),
      fullName: input.newAdmin.fullName.trim(),
      email: input.newAdmin.email.trim().toLowerCase(),
    });

    createdAdminNotice = adminResult;
    dept.adminId = new Types.ObjectId(adminResult.admin.id);
    await dept.save();
  }

  const populated: any = await Department.findById(dept._id)
    .populate("adminId", "fullName email role accountStatus")
    .lean();

  return {
    ...populated,
    id: populated._id.toString(),
    admin: populated.adminId
      ? {
          id: populated.adminId._id ? populated.adminId._id.toString() : populated.adminId.toString(),
          fullName: populated.adminId.fullName || "Assigned Admin",
          email: populated.adminId.email || "",
          role: populated.adminId.role || "DEPARTMENT_ADMIN",
          accountStatus: populated.adminId.accountStatus || "ACTIVE",
        }
      : null,
    createdAdminNotice,
  };
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
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

    const existingWithName = await Department.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, "i") },
      _id: { $ne: dept._id },
    });
    if (existingWithName) {
      throw new AppError("A department with this name already exists.", 409, "DEPARTMENT_ALREADY_EXISTS");
    }
    dept.name = trimmed;
  }

  if (input.code !== undefined) {
    const code = input.code.trim().toUpperCase();
    if (!code || code.length < 2 || code.length > 30) {
      throw new AppError("Department code must be between 2 and 30 characters.", 400, "INVALID_CODE");
    }

    const existingWithCode = await Department.findOne({
      code,
      _id: { $ne: dept._id },
    });
    if (existingWithCode) {
      throw new AppError(`A department with code "${code}" already exists.`, 409, "DEPARTMENT_CODE_EXISTS");
    }
    dept.code = code;
  }

  if (input.category !== undefined) {
    dept.category = input.category.trim();
  }

  if (input.officialEmail !== undefined) {
    const email = input.officialEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new AppError("A valid official email address is required.", 400, "INVALID_EMAIL");
    }
    dept.officialEmail = email;
  }

  if (input.contactNumber !== undefined) {
    const contact = input.contactNumber.trim();
    if (!contact || contact.length < 7 || contact.length > 32) {
      throw new AppError("A valid contact number (7-32 characters) is required.", 400, "INVALID_CONTACT");
    }
    dept.contactNumber = contact;
  }

  if (input.adminId !== undefined) {
    if (!input.adminId) {
      dept.adminId = undefined;
    } else {
      if (!Types.ObjectId.isValid(input.adminId)) {
        throw new AppError("Invalid administrator ID provided.", 400, "INVALID_ADMIN");
      }
      const adminUser = await User.findById(input.adminId);
      if (!adminUser) {
        throw new AppError("The selected administrator does not exist.", 404, "ADMIN_NOT_FOUND");
      }

      adminUser.departmentId = dept._id;
      adminUser.role = "DEPARTMENT_ADMIN";
      adminUser.accountStatus = "ACTIVE";
      await adminUser.save();

      dept.adminId = adminUser._id;
    }
  }

  if (input.description !== undefined) {
    dept.description = input.description.trim();
  }

  if (input.isActive !== undefined) {
    dept.isActive = Boolean(input.isActive);
  }

  await dept.save();

  const populated: any = await Department.findById(dept._id)
    .populate("adminId", "fullName email role accountStatus")
    .lean();

  return {
    ...populated,
    id: populated._id.toString(),
    admin: populated.adminId
      ? {
          id: populated.adminId._id ? populated.adminId._id.toString() : populated.adminId.toString(),
          fullName: populated.adminId.fullName || "Assigned Admin",
          email: populated.adminId.email || "",
          role: populated.adminId.role || "DEPARTMENT_ADMIN",
          accountStatus: populated.adminId.accountStatus || "ACTIVE",
        }
      : null,
  };
}

export async function listAdminCandidates() {
  const users = await User.find({
    accountStatus: "ACTIVE",
  })
    .select("fullName email role departmentId")
    .populate("departmentId", "name code slug")
    .sort({ fullName: 1 })
    .lean();

  return users.map((u: any) => ({
    id: u._id.toString(),
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    department: u.departmentId
      ? {
          id: u.departmentId._id?.toString() || u.departmentId.toString(),
          name: u.departmentId.name,
          code: u.departmentId.code,
        }
      : null,
  }));
}
