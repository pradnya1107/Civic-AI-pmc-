import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../database/connection";
import { User } from "../modules/users/user.model";
import { Department } from "../modules/departments/department.model";

dotenv.config();

/* ─────────────────────── Admin Credentials ─────────────────────── */
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "CivicAI Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@civicai.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345678";

/* ─────────────────────── Default Departments ─────────────────────── */
const DEFAULT_DEPARTMENTS = [
  {
    name: "Water Supply",
    slug: "water-supply",
    description: "Handles water supply issues, leaks, and contamination complaints.",
  },
  {
    name: "Roads & Infrastructure",
    slug: "roads-infrastructure",
    description: "Manages potholes, road damage, streetlight, and bridge complaints.",
  },
  {
    name: "Waste Management",
    slug: "waste-management",
    description: "Handles garbage collection, illegal dumping, and sanitation issues.",
  },
  {
    name: "Electricity",
    slug: "electricity",
    description: "Manages power outages, faulty wiring, and streetlight issues.",
  },
  {
    name: "Drainage",
    slug: "drainage",
    description: "Handles storm water drains, sewage clogs, and waterlogging.",
  },
  {
    name: "Street Lighting",
    slug: "street-lighting",
    description: "Manages public street lighting, damaged poles, and dark spots.",
  },
  {
    name: "Public Health",
    slug: "public-health",
    description: "Handles health hazards, mosquito breeding, and sanitation concerns.",
  },
  {
    name: "Building & Construction",
    slug: "building-construction",
    description: "Manages unauthorized construction, building violations, and permits.",
  },
  {
    name: "Parks & Gardens",
    slug: "parks-gardens",
    description: "Handles park maintenance, tree trimming, and public garden issues.",
  },
  {
    name: "General Administration",
    slug: "general-administration",
    description: "Handles general civic complaints that don't fit other categories.",
  },
];

/* ─────────────────────── Seed Functions ─────────────────────── */

async function seedAdmin(): Promise<void> {
  // Normalize email (lowercase + trim) to match User model behavior
  const adminEmail = ADMIN_EMAIL.trim().toLowerCase();

  // Look for an existing user with this email
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    const updates: Partial<any> = {};
    if (existing.role !== "SUPER_ADMIN") updates.role = "SUPER_ADMIN";
    if (!existing.emailVerified) updates.emailVerified = true;
    if (!existing.accountStatus) updates.accountStatus = "ACTIVE";
    // Apply updates only if needed
    if (Object.keys(updates).length > 0) {
      await User.updateOne({ _id: existing._id }, { $set: updates });
      console.log(`✅ Updated existing super admin: ${adminEmail}`);
    } else {
      console.log(`✅ Super admin already exists: ${adminEmail}`);
    }
    return;
  }

  // No existing user, create a new super admin
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await User.create({
    fullName: ADMIN_FULL_NAME,
    email: adminEmail,
    passwordHash,
    role: "SUPER_ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });

  console.log("✅ Super admin user created successfully:");
  console.log(`   📧 Email:    ${adminEmail}`);
  console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
}

async function seedDepartments(): Promise<void> {
  // Required six departments (slug must be unique)
  const required = [
    { name: "Roads", slug: "roads", description: "Handles road-related complaints such as potholes, streetlight, and bridge issues." },
    { name: "Waste", slug: "waste", description: "Manages garbage collection, illegal dumping, and sanitation issues." },
    { name: "Water", slug: "water", description: "Handles water supply issues, leaks, and contamination complaints." },
    { name: "Drainage", slug: "drainage", description: "Manages drainage, flooding, and stormwater problems." },
    { name: "Street Lighting", slug: "street-lighting", description: "Handles streetlight outages and maintenance." },
    { name: "Public Health", slug: "public-health", description: "Handles health hazards, mosquito breeding, and sanitation concerns." },
  ];

  let created = 0;
  let skipped = 0;

  for (const dept of required) {
    // Use upsert to avoid duplicates; $setOnInsert ensures existing records stay untouched
    const result = await Department.updateOne({ slug: dept.slug }, { $setOnInsert: dept }, { upsert: true });
    if (result.upsertedCount && result.upsertedCount > 0) {
      created++;
    } else {
      // If a document with the slug already existed, we consider it skipped
      skipped++;
    }
  }

  console.log(`✅ Departments: ${created} created, ${skipped} already existed.`);
}

/* ─────────────────────── Demo Department Admins ─────────────────────── */
const DEMO_DEPARTMENT_ADMINS = [
  {
    fullName: "Roads Department Admin",
    email: "roads.demo@civicai.local",
    password: "Roads@Demo2026!",
    deptSlug: "roads",
  },
  {
    fullName: "Waste Management Admin",
    email: "waste.demo@civicai.local",
    password: "Waste@Demo2026!",
    deptSlug: "waste",
  },
  {
    fullName: "Water Supply Admin",
    email: "water.demo@civicai.local",
    password: "Water@Demo2026!",
    deptSlug: "water",
  },
  {
    fullName: "Drainage Admin",
    email: "drainage.demo@civicai.local",
    password: "Drainage@Demo2026!",
    deptSlug: "drainage",
  },
  {
    fullName: "Street Lighting Admin",
    email: "lighting.demo@civicai.local",
    password: "Lighting@Demo2026!",
    deptSlug: "street-lighting",
  },
  {
    fullName: "Public Health Admin",
    email: "health.demo@civicai.local",
    password: "Health@Demo2026!",
    deptSlug: "public-health",
  },
];

async function seedDemoDepartmentAdmins(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const item of DEMO_DEPARTMENT_ADMINS) {
    const dept = await Department.findOne({ slug: item.deptSlug });
    if (!dept) continue;

    const existing = await User.findOne({ email: item.email.toLowerCase() });
    if (existing) {
      const updates: any = {};
      if (existing.role !== "DEPARTMENT_ADMIN") updates.role = "DEPARTMENT_ADMIN";
      if (!existing.departmentId) updates.departmentId = dept._id;
      if (!existing.emailVerified) updates.emailVerified = true;
      if (existing.accountStatus !== "ACTIVE") updates.accountStatus = "ACTIVE";

      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: existing._id }, { $set: updates });
      }
      skipped++;
    } else {
      const passwordHash = await bcrypt.hash(item.password, 12);
      await User.create({
        fullName: item.fullName,
        email: item.email.toLowerCase(),
        passwordHash,
        role: "DEPARTMENT_ADMIN",
        departmentId: dept._id,
        emailVerified: true,
        accountStatus: "ACTIVE",
      });
      created++;
    }
  }

  console.log(`✅ Demo Department Admins: ${created} created, ${skipped} already existed.`);
}

/* ─────────────────────── Main Runner ─────────────────────── */

async function seed(): Promise<void> {
  console.log("\n🌱 Starting database seed...\n");

  await connectToDatabase();

  await seedAdmin();
  await seedDepartments();
  await seedDemoDepartmentAdmins();

  console.log("\n🎉 Seed completed successfully!\n");
}

void seed()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown seed error.";
    console.error(`\n❌ Seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectFromDatabase();
    } catch {
      console.error("Database shutdown failed.");
      process.exitCode = 1;
    }
  });
