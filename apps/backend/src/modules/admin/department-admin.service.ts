import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { Types } from "mongoose";
import { User } from "../users/user.model";
import { Department } from "../departments/department.model";
import { Complaint } from "../complaints/complaint.model";
import { AppError } from "../../utils/app-error";

export interface CreateDepartmentAdminInput {
  departmentId: string;
  fullName: string;
  email: string;
}

export function isDemoModeEnabled(): boolean {
  if (process.env.CIVICAI_DEMO_MODE === "true") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

function generateTemporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";

  const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];

  // Guarantee at least one of each required category
  const parts = [
    pick(letters),
    pick(lower),
    pick(numbers),
    pick(symbols),
    ...Array.from({ length: 6 }, () => pick(letters + lower + numbers + symbols)),
  ];

  return parts.sort(() => Math.random() - 0.5).join("");
}

export async function createDepartmentAdmin(input: CreateDepartmentAdminInput) {
  const fullName = input.fullName?.trim();
  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    throw new AppError("A valid admin name (2-120 characters) is required.", 400, "INVALID_INPUT");
  }

  const email = input.email?.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new AppError("A valid email address is required.", 400, "INVALID_EMAIL");
  }

  if (!Types.ObjectId.isValid(input.departmentId)) {
    throw new AppError("Invalid department ID provided.", 400, "INVALID_DEPARTMENT");
  }

  const department = await Department.findById(input.departmentId);
  if (!department || !department.isActive) {
    throw new AppError("The selected department does not exist or is inactive.", 404, "DEPARTMENT_NOT_FOUND");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(
      "An account with this email address already exists.",
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const admin = await User.create({
    fullName,
    email,
    passwordHash,
    role: "DEPARTMENT_ADMIN",
    departmentId: department._id,
    emailVerified: true,
    accountStatus: "ACTIVE",
  });

  const demoMode = isDemoModeEnabled();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (demoMode) {
    console.log("\n==================================================");
    console.log("CIVICAI PMC — DEMO DEPARTMENT ADMIN CREATED");
    console.log(`Name:               ${admin.fullName}`);
    console.log(`Department:         ${department.name}`);
    console.log(`Demo Email:         ${admin.email}`);
    console.log(`Temporary Password: ${temporaryPassword}`);
    console.log(`Account Status:     Active`);
    console.log(`Login Page:         ${frontendUrl}`);
    console.log("==================================================\n");
  }

  return {
    admin: {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      department: {
        id: department.id,
        name: department.name,
        slug: department.slug,
      },
      accountStatus: admin.accountStatus,
      createdAt: admin.createdAt,
    },
    ...(demoMode ? { temporaryPassword } : {}),
  };
}

export async function listDepartmentAdmins() {
  const admins = await User.find({
    role: { $in: ["DEPARTMENT_ADMIN", "ADMIN"] },
    departmentId: { $ne: null },
  })
    .populate("departmentId", "name slug")
    .sort({ createdAt: -1 });

  return admins.map((admin) => {
    const dept = admin.departmentId as any;
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      department: dept
        ? { id: dept._id.toString(), name: dept.name, slug: dept.slug }
        : null,
      accountStatus: admin.accountStatus,
      createdAt: admin.createdAt,
    };
  });
}

export async function getDepartmentDashboard(departmentId: string) {
  if (!Types.ObjectId.isValid(departmentId)) {
    throw new AppError("Invalid department ID provided.", 400, "INVALID_DEPARTMENT");
  }

  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError("Department not found.", 404, "DEPARTMENT_NOT_FOUND");
  }

  const deptObjectId = new Types.ObjectId(departmentId);

  const [total, pending, inProgress, resolved, rejected] = await Promise.all([
    Complaint.countDocuments({ departmentId: deptObjectId }),
    Complaint.countDocuments({
      departmentId: deptObjectId,
      status: { $in: ["SUBMITTED", "UNDER_REVIEW"] },
    }),
    Complaint.countDocuments({
      departmentId: deptObjectId,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
    }),
    Complaint.countDocuments({
      departmentId: deptObjectId,
      status: "RESOLVED",
    }),
    Complaint.countDocuments({
      departmentId: deptObjectId,
      status: "REJECTED",
    }),
  ]);

  return {
    department: {
      id: department.id,
      name: department.name,
      slug: department.slug,
    },
    counts: {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
    },
  };
}

export async function getDepartmentComplaints(departmentId: string) {
  if (!Types.ObjectId.isValid(departmentId)) {
    throw new AppError("Invalid department ID provided.", 400, "INVALID_DEPARTMENT");
  }

  const complaints = await Complaint.find({
    departmentId: new Types.ObjectId(departmentId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return complaints;
}
