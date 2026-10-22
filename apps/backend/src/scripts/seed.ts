import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../database/connection";
import { User } from "../modules/users/user.model";
import { Department } from "../modules/departments/department.model";
import { Complaint, calculateSlaDeadline } from "../modules/complaints/complaint.model";

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

/* ─────────────────────── Demo Citizen Account ─────────────────────── */
const DEMO_CITIZEN_EMAIL = "citizen@example.com";
const DEMO_CITIZEN_PASSWORD = "Citizen@12345678";

async function seedCitizen(): Promise<void> {
  const email = DEMO_CITIZEN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(DEMO_CITIZEN_PASSWORD, 12);

  if (existing) {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: "CITIZEN",
          emailVerified: true,
          accountStatus: "ACTIVE",
          passwordHash,
        },
      },
    );
    console.log(`✅ Demo Citizen ready: ${email}`);
    return;
  }

  await User.create({
    fullName: "Civic Citizen",
    email,
    passwordHash,
    role: "CITIZEN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });

  console.log("✅ Demo citizen user created successfully:");
  console.log(`   📧 Email:    ${email}`);
  console.log(`   🔑 Password: ${DEMO_CITIZEN_PASSWORD}`);
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

/* ─────────────────────── Demo Smart City Complaints ─────────────────────── */
async function seedDemoComplaints(): Promise<void> {
  const citizen = await User.findOne({ email: DEMO_CITIZEN_EMAIL.toLowerCase() });
  if (!citizen) return;

  const existingCount = await Complaint.countDocuments();
  if (existingCount >= 6) {
    console.log(`✅ Demo Complaints: ${existingCount} already present.`);
    return;
  }

  const roadsDept = await Department.findOne({ slug: "roads" });
  const wasteDept = await Department.findOne({ slug: "waste" });
  const drainageDept = await Department.findOne({ slug: "drainage" });
  const lightingDept = await Department.findOne({ slug: "street-lighting" });
  const waterDept = await Department.findOne({ slug: "water" });

  const demoItems = [
    {
      complaintNumber: "PMC-2026-00101",
      title: "Major Dangerous Pothole near Goodluck Chowk",
      description: "Deep cavity in the middle of active road lane on FC Road. Causes sudden swerving by motorists and risk of two-wheeler crashes during peak traffic.",
      category: "Roads & Potholes",
      departmentId: roadsDept?._id,
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      location: {
        address: "FC Road, near Goodluck Cafe, Shivajinagar, Pune",
        ward: "Ward 1 - Shivajinagar / Ghole Road",
        latitude: 18.5186,
        longitude: 73.8415,
      },
      imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      supportCount: 14,
      slaDeadline: calculateSlaDeadline("CRITICAL"),
      aiAnalysis: {
        severity: "CRITICAL",
        score: 94,
        reasoning: "High vehicular density combined with deep cavity exceeds safe threshold.",
        suggestedDepartment: "Roads",
        detectedIssues: ["Pothole", "Active Corridor"],
      },
      citizenId: citizen._id,
    },
    {
      complaintNumber: "PMC-2026-00102",
      title: "Overflowing Garbage Container outside Karve Statue",
      description: "Municipal waste bin overflowing onto sidewalk. Stray dogs scattering litter and intense foul odor affecting pedestrians and nearby shopkeepers.",
      category: "Solid Waste & Garbage",
      departmentId: wasteDept?._id,
      priority: "HIGH",
      status: "ASSIGNED",
      location: {
        address: "Karve Road, Near Karve Statue, Kothrud, Pune",
        ward: "Ward 2 - Kothrud / Bavdhan",
        latitude: 18.5074,
        longitude: 73.8077,
      },
      imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800",
      supportCount: 8,
      slaDeadline: calculateSlaDeadline("HIGH"),
      aiAnalysis: {
        severity: "HIGH",
        score: 79,
        reasoning: "Sanitation hazard in high pedestrian commercial zone.",
        suggestedDepartment: "Waste",
      },
      citizenId: citizen._id,
    },
    {
      complaintNumber: "PMC-2026-00103",
      title: "Severe Stormwater Waterlogging at Magarpatta Flyover Base",
      description: "Knee-deep water accumulating after evening shower. Inadequate drainage slope causing severe traffic standstill toward Hadapsar.",
      category: "Drainage & Sewerage",
      departmentId: drainageDept?._id,
      priority: "CRITICAL",
      status: "SUBMITTED",
      location: {
        address: "Magarpatta Road, Hadapsar, Pune",
        ward: "Ward 9 - Hadapsar / Mundhwa",
        latitude: 18.5167,
        longitude: 73.926,
      },
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800",
      supportCount: 19,
      slaDeadline: calculateSlaDeadline("CRITICAL"),
      citizenId: citizen._id,
    },
    {
      complaintNumber: "PMC-2026-00104",
      title: "Streetlight Pole Darkened for 4 Consecutive Days",
      description: "Five streetlights completely off from High Street circle toward Baner bridge. Road pitch dark creating safety hazards for women and commuters.",
      category: "Street Lighting & Electrical",
      departmentId: lightingDept?._id,
      priority: "MEDIUM",
      status: "UNDER_REVIEW",
      location: {
        address: "Baner Road, Near Balewadi High Street, Baner, Pune",
        ward: "Ward 15 - Aundh / Baner / Pashan",
        latitude: 18.5642,
        longitude: 73.7769,
      },
      imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800",
      supportCount: 5,
      slaDeadline: calculateSlaDeadline("MEDIUM"),
      citizenId: citizen._id,
    },
    {
      complaintNumber: "PMC-2026-00105",
      title: "Drinking Water Pipeline Leak Flooding Bus Terminal Road",
      description: "Clean pressurized potable water gushing from underground joint near Swargate terminal. Gallons of clean water wasting down storm drain.",
      category: "Water Supply",
      departmentId: waterDept?._id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      location: {
        address: "Near Swargate ST Stand, Pune",
        ward: "Ward 7 - Bhavani Peth",
        latitude: 18.5018,
        longitude: 73.8587,
      },
      imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800",
      supportCount: 11,
      slaDeadline: calculateSlaDeadline("HIGH"),
      citizenId: citizen._id,
    },
    {
      complaintNumber: "PMC-2026-00106",
      title: "Large Cavity near Sambhaji Park Entrance",
      description: "Pothole that opened up after water pipe excavation. Required urgent bituminous filling.",
      category: "Roads & Potholes",
      departmentId: roadsDept?._id,
      priority: "HIGH",
      status: "RESOLVED",
      location: {
        address: "Jangali Maharaj Road, Shivajinagar, Pune",
        ward: "Ward 1 - Shivajinagar / Ghole Road",
        latitude: 18.5246,
        longitude: 73.8496,
      },
      imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      resolutionImageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800",
      resolutionNotes: "PMC Road Engineering team resurfaced and compacted cold-mix bitumen. Surface verified level.",
      aiAnalysis: {
        severity: "HIGH",
        score: 78,
        resolutionVerdict: "RESOLVED_VERIFIED",
        resolutionConfidence: 94,
        resolutionAnalysis: "Photographic inspection verifies asphalt patch has sealed the cavity flush with surrounding road.",
      },
      citizenConfirmation: {
        confirmed: true,
        rating: 5,
        feedback: "Repaired very quickly within 24 hours. Excellent response from PMC!",
      },
      supportCount: 7,
      slaDeadline: calculateSlaDeadline("HIGH"),
      citizenId: citizen._id,
    },
  ];

  await Complaint.insertMany(demoItems);
  console.log(`✅ Demo Complaints: ${demoItems.length} created with Pune coordinates.`);
}

/* ─────────────────────── Demo Department Officers ─────────────────────── */
const DEMO_OFFICERS = [
  { fullName: "Ramesh Patil", email: "ramesh.patil@civicai.local", phone: "9822014521", deptSlug: "roads", designation: "Senior Road Engineer" },
  { fullName: "Sneha Joshi", email: "sneha.joshi@civicai.local", phone: "9822018833", deptSlug: "roads", designation: "Assistant Road Inspector" },
  { fullName: "Anil Deshmukh", email: "anil.deshmukh@civicai.local", phone: "9822019944", deptSlug: "roads", designation: "Junior Field Supervisor" },
  { fullName: "Santosh Gaikwad", email: "santosh.gaikwad@civicai.local", phone: "9822021144", deptSlug: "waste", designation: "Sanitation Supervisor" },
  { fullName: "Priya Kulkarni", email: "priya.kulkarni@civicai.local", phone: "9822025566", deptSlug: "waste", designation: "Solid Waste Inspector" },
  { fullName: "Mahesh Shinde", email: "mahesh.shinde@civicai.local", phone: "9822031122", deptSlug: "water", designation: "Pipeline Maintenance Officer" },
  { fullName: "Kavita Pawar", email: "kavita.pawar@civicai.local", phone: "9822034455", deptSlug: "water", designation: "Water Quality Analyst" },
  { fullName: "Vikas Jadhav", email: "vikas.jadhav@civicai.local", phone: "9822043344", deptSlug: "drainage", designation: "Stormwater Drainage Engineer" },
  { fullName: "Ganesh More", email: "ganesh.more@civicai.local", phone: "9822055566", deptSlug: "street-lighting", designation: "Electrical Field Inspector" },
  { fullName: "Anita Kamble", email: "anita.kamble@civicai.local", phone: "9822067788", deptSlug: "public-health", designation: "Public Health Inspector" },
];

async function seedDemoOfficers(): Promise<void> {
  let created = 0;
  let skipped = 0;
  const passwordHash = await bcrypt.hash("Officer@Demo2026!", 10);

  for (const item of DEMO_OFFICERS) {
    const dept = await Department.findOne({ slug: item.deptSlug });
    if (!dept) continue;

    const existing = await User.findOne({ email: item.email.toLowerCase() });
    if (existing) {
      skipped++;
    } else {
      await User.create({
        fullName: item.fullName,
        email: item.email.toLowerCase(),
        passwordHash,
        phoneNumber: item.phone,
        role: "OFFICER",
        departmentId: dept._id,
        emailVerified: true,
        accountStatus: "ACTIVE",
      });
      created++;
    }
  }

  console.log(`✅ Demo Officers: ${created} created, ${skipped} already existed.`);
}

/* ─────────────────────── Main Runner ─────────────────────── */

async function seed(): Promise<void> {
  console.log("\n🌱 Starting database seed...\n");

  await connectToDatabase();

  await seedAdmin();
  await seedCitizen();
  await seedDepartments();
  await seedDemoDepartmentAdmins();
  await seedDemoOfficers();
  await seedDemoComplaints();

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
