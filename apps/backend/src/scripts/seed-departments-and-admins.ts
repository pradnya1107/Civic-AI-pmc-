import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { connectToDatabase, disconnectFromDatabase } from "../database/connection";
import { User } from "../modules/users/user.model";
import { Department } from "../modules/departments/department.model";
import { Complaint } from "../modules/complaints/complaint.model";

// Load environment variables from apps/backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/**
 * 10 Canonical Pune Municipal Corporation Departments matching Frontend Categories
 */
export const CANONICAL_DEPARTMENTS = [
  {
    name: "Roads & Potholes Department",
    slug: "roads-potholes",
    code: "ROADS",
    category: "Roads & Potholes",
    officialEmail: "roads.admin@punecorporation.org",
    contactNumber: "020-25501001",
    description: "Manages road network, asphalt repair, potholes, road dividers, and pedestrian footpaths.",
    adminName: "Roads Department Admin",
    adminEmail: "roads.demo@civicai.local",
    adminPassword: "Roads@Demo2026!",
    legacySlugs: ["roads", "roads-infrastructure"],
  },
  {
    name: "Solid Waste & Garbage Department",
    slug: "solid-waste-garbage",
    code: "SWMB",
    category: "Solid Waste & Garbage",
    officialEmail: "waste.admin@punecorporation.org",
    contactNumber: "020-25501002",
    description: "Handles garbage clearance, trash bins, dumping sites, and solid waste processing.",
    adminName: "Waste Management Admin",
    adminEmail: "waste.demo@civicai.local",
    adminPassword: "Waste@Demo2026!",
    legacySlugs: ["waste", "waste-management"],
  },
  {
    name: "Water Supply Department",
    slug: "water-supply",
    code: "WATER",
    category: "Water Supply",
    officialEmail: "water.admin@punecorporation.org",
    contactNumber: "020-25501003",
    description: "Manages municipal drinking water supply, pipeline leakages, and water contamination.",
    adminName: "Water Supply Admin",
    adminEmail: "water.demo@civicai.local",
    adminPassword: "Water@Demo2026!",
    legacySlugs: ["water"],
  },
  {
    name: "Drainage & Sewerage Department",
    slug: "drainage-sewerage",
    code: "DRAINAGE",
    category: "Drainage & Sewerage",
    officialEmail: "drainage.admin@punecorporation.org",
    contactNumber: "020-25501004",
    description: "Handles stormwater drainage, open manholes, sewer overflows, and monsoon flooding.",
    adminName: "Drainage Admin",
    adminEmail: "drainage.demo@civicai.local",
    adminPassword: "Drainage@Demo2026!",
    legacySlugs: ["drainage"],
  },
  {
    name: "Street Lighting & Electrical Department",
    slug: "street-lighting-electrical",
    code: "ELECTRICAL",
    category: "Street Lighting & Electrical",
    officialEmail: "electrical.admin@punecorporation.org",
    contactNumber: "020-25501005",
    description: "Manages streetlight outages, faulty lampposts, exposed electrical wires, and public lighting.",
    adminName: "Street Lighting Admin",
    adminEmail: "lighting.demo@civicai.local",
    adminPassword: "Lighting@Demo2026!",
    legacySlugs: ["street-lighting", "electricity"],
  },
  {
    name: "Health & Sanitation Department",
    slug: "health-sanitation",
    code: "HEALTH",
    category: "Health & Sanitation",
    officialEmail: "health.admin@punecorporation.org",
    contactNumber: "020-25501006",
    description: "Manages public hygiene, mosquito breeding control, anti-epidemic sanitation, and public toilets.",
    adminName: "Public Health Admin",
    adminEmail: "health.demo@civicai.local",
    adminPassword: "Health@Demo2026!",
    legacySlugs: ["public-health"],
  },
  {
    name: "Garden & Tree Trimming Department",
    slug: "garden-tree-trimming",
    code: "GARDEN",
    category: "Garden & Tree Trimming",
    officialEmail: "garden.admin@punecorporation.org",
    contactNumber: "020-25501007",
    description: "Maintains municipal parks, trims dangerous tree branches overhanging roads, and urban forestry.",
    adminName: "Garden & Tree Admin",
    adminEmail: "garden.demo@civicai.local",
    adminPassword: "Garden@Demo2026!",
    legacySlugs: ["parks-gardens"],
  },
  {
    name: "Encroachment & Anti-Unauthorized Construction",
    slug: "encroachment",
    code: "ENCROACH",
    category: "Encroachment",
    officialEmail: "encroach.admin@punecorporation.org",
    contactNumber: "020-25501008",
    description: "Enforces removal of illegal footpaths encroachment, unauthorized stalls, and construction violations.",
    adminName: "Encroachment Admin",
    adminEmail: "encroach.demo@civicai.local",
    adminPassword: "Encroach@Demo2026!",
    legacySlugs: ["building-construction"],
  },
  {
    name: "Traffic & Signage Department",
    slug: "traffic-signage",
    code: "TRAFFIC",
    category: "Traffic & Signage",
    officialEmail: "traffic.admin@punecorporation.org",
    contactNumber: "020-25501009",
    description: "Maintains traffic signals, zebra crossings, road safety signboards, and speed breakers.",
    adminName: "Traffic & Signage Admin",
    adminEmail: "traffic.demo@civicai.local",
    adminPassword: "Traffic@Demo2026!",
    legacySlugs: [],
  },
  {
    name: "General Administration & Citizen Welfare",
    slug: "general-administration",
    code: "GENADMIN",
    category: "Other Civic Grievance",
    officialEmail: "general.admin@punecorporation.org",
    contactNumber: "020-25501010",
    description: "Handles miscellaneous civic grievances, citizen welfare inquiries, and multi-department coordination.",
    adminName: "General Administration Admin",
    adminEmail: "general.demo@civicai.local",
    adminPassword: "General@Demo2026!",
    legacySlugs: [],
  },
];

export async function seedDepartmentsAndAdmins(): Promise<void> {
  console.log("🏛️  Seeding PMC Canonical Departments and Demo Department Admins...");

  for (const item of CANONICAL_DEPARTMENTS) {
    // 1. Find or create canonical department
    let dept = await Department.findOne({ slug: item.slug });

    // Check if legacy department exists that can be upgraded
    if (!dept && item.legacySlugs.length > 0) {
      dept = await Department.findOne({ slug: { $in: item.legacySlugs } });
      if (dept) {
        console.log(`🔄 Upgrading legacy department "${dept.name}" (${dept.slug}) to "${item.name}" (${item.slug})`);
        dept.name = item.name;
        dept.slug = item.slug;
        dept.code = item.code;
        dept.category = item.category;
        dept.description = item.description;
        dept.officialEmail = item.officialEmail;
        dept.contactNumber = item.contactNumber;
        dept.isActive = true;
        await dept.save();
      }
    }

    if (!dept) {
      dept = await Department.create({
        name: item.name,
        slug: item.slug,
        code: item.code,
        category: item.category,
        description: item.description,
        officialEmail: item.officialEmail,
        contactNumber: item.contactNumber,
        isActive: true,
      });
      console.log(`✅ Created department: ${dept.name} (${dept.code})`);
    } else {
      dept.name = item.name;
      dept.code = item.code;
      dept.category = item.category;
      dept.description = item.description;
      dept.isActive = true;
      await dept.save();
      console.log(`✅ Verified department: ${dept.name} (${dept.code})`);
    }

    // 2. Find or create the corresponding Department Admin user
    const adminEmail = item.adminEmail.toLowerCase();
    let adminUser = await User.findOne({ email: adminEmail });
    const passwordHash = await bcrypt.hash(item.adminPassword, 12);

    if (adminUser) {
      adminUser.fullName = item.adminName;
      adminUser.departmentId = dept._id;
      adminUser.role = "DEPARTMENT_ADMIN";
      adminUser.accountStatus = "ACTIVE";
      adminUser.emailVerified = true;
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
      console.log(`   👤 Updated Department Admin: ${adminEmail}`);
    } else {
      adminUser = await User.create({
        fullName: item.adminName,
        email: adminEmail,
        passwordHash,
        role: "DEPARTMENT_ADMIN",
        departmentId: dept._id,
        accountStatus: "ACTIVE",
        emailVerified: true,
      });
      console.log(`   👤 Created Department Admin: ${adminEmail} (Pwd: ${item.adminPassword})`);
    }

    // Link admin to department
    if (!dept.adminId || dept.adminId.toString() !== adminUser._id.toString()) {
      dept.adminId = adminUser._id;
      await dept.save();
    }

    // 3. Re-link legacy complaints to this canonical department
    // E.g. Any complaints pointing to legacy slugs or matching category
    const legacyDepts = await Department.find({
      slug: { $in: item.legacySlugs },
      _id: { $ne: dept._id },
    });
    const legacyIds = legacyDepts.map((d) => d._id);

    const updateFilter: any = {
      $or: [
        { category: item.category },
        ...(legacyIds.length > 0 ? [{ departmentId: { $in: legacyIds } }] : []),
      ],
    };

    const remappedResult = await Complaint.updateMany(updateFilter, {
      $set: { departmentId: dept._id },
    });

    if (remappedResult.modifiedCount > 0) {
      console.log(`   📦 Re-linked ${remappedResult.modifiedCount} complaints to ${dept.name}`);
    }

    // Delete legacy duplicate departments that are now replaced
    if (item.legacySlugs.length > 0) {
      const deletedLegacy = await Department.deleteMany({
        slug: { $in: item.legacySlugs },
        _id: { $ne: dept._id },
      });
      if (deletedLegacy.deletedCount && deletedLegacy.deletedCount > 0) {
        console.log(`   🧹 Removed ${deletedLegacy.deletedCount} legacy duplicate department records for ${dept.slug}`);
      }
    }
  }

  // Ensure Super Admin exists
  const superAdminEmail = (process.env.ADMIN_EMAIL || "admin@civicai.com").toLowerCase();
  const superAdminPassword = process.env.ADMIN_PASSWORD || "Admin@12345678";
  let superAdmin = await User.findOne({ email: superAdminEmail });
  if (!superAdmin) {
    const hash = await bcrypt.hash(superAdminPassword, 12);
    await User.create({
      fullName: process.env.ADMIN_FULL_NAME || "CivicAI Central Admin",
      email: superAdminEmail,
      passwordHash: hash,
      role: "SUPER_ADMIN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });
    console.log(`⭐ Created Super Admin: ${superAdminEmail}`);
  } else {
    superAdmin.role = "SUPER_ADMIN";
    superAdmin.accountStatus = "ACTIVE";
    superAdmin.emailVerified = true;
    await superAdmin.save();
    console.log(`⭐ Verified Super Admin: ${superAdminEmail}`);
  }

  // Ensure Citizen demo exists
  const citizenEmail = "citizen@example.com";
  let citizen = await User.findOne({ email: citizenEmail });
  if (!citizen) {
    const hash = await bcrypt.hash("Citizen@12345678", 12);
    await User.create({
      fullName: "Civic Citizen",
      email: citizenEmail,
      passwordHash: hash,
      role: "CITIZEN",
      emailVerified: true,
      accountStatus: "ACTIVE",
    });
    console.log(`👤 Created Demo Citizen: ${citizenEmail}`);
  }

  console.log("🎉 All 10 PMC Departments and Admins successfully configured!");
}

// Execute standalone if directly invoked
if (require.main === module) {
  connectToDatabase()
    .then(() => seedDepartmentsAndAdmins())
    .then(() => disconnectFromDatabase())
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
