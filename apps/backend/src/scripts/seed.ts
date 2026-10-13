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
  const existingAdmin = await User.findOne({ role: "ADMIN" });

  if (existingAdmin) {
    console.log(`⏭️  Admin already exists: ${existingAdmin.email} — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await User.create({
    fullName: ADMIN_FULL_NAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });

  console.log("✅ Admin user created successfully:");
  console.log(`   📧 Email:    ${ADMIN_EMAIL}`);
  console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
}

async function seedDepartments(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const dept of DEFAULT_DEPARTMENTS) {
    const exists = await Department.findOne({ slug: dept.slug });
    if (exists) {
      skipped++;
      continue;
    }
    await Department.create(dept);
    created++;
  }

  console.log(
    `✅ Departments: ${created} created, ${skipped} already existed.`,
  );
}

/* ─────────────────────── Main Runner ─────────────────────── */

async function seed(): Promise<void> {
  console.log("\n🌱 Starting database seed...\n");

  await connectToDatabase();

  await seedAdmin();
  await seedDepartments();

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
