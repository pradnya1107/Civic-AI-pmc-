import { describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { Complaint } from "../src/modules/complaints/complaint.model";
import {
  calculateWorkingDaySla,
  calculateSlaDeadline,
  isWorkingDay,
  isHoliday,
  getHolidayName,
  getSlaStatusDetails,
  PMC_PUBLIC_HOLIDAYS,
} from "../src/modules/complaints/sla-calendar.service";

const defaultPassword = "SecurePassword#123!";

async function createVerifiedAdmin(email = "admin-sla@civicai.local") {
  return User.create({
    fullName: "PMC SLA Administrator",
    email,
    passwordHash: await bcrypt.hash(defaultPassword, 4),
    role: "ADMIN",
    emailVerified: true,
    accountStatus: "ACTIVE",
  });
}

async function signIn(email = "admin-sla@civicai.local") {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: defaultPassword });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("Pune Municipal Corporation (PMC) Working-Day SLA Service", () => {
  describe("1. Municipal Holiday and Working Day Detection", () => {
    it("correctly identifies official PMC gazetted holidays", () => {
      // 2026-01-26 is Republic Day
      const republicDay = new Date(2026, 0, 26, 10, 0, 0); // Jan 26, 2026
      expect(isHoliday(republicDay)).toBe(true);
      expect(getHolidayName(republicDay)).toBe("Republic Day");
      expect(isWorkingDay(republicDay)).toBe(false);

      // 2026-05-01 is Maharashtra Day
      const maharashtraDay = new Date(2026, 4, 1, 11, 0, 0); // May 1, 2026
      expect(isHoliday(maharashtraDay)).toBe(true);
      expect(getHolidayName(maharashtraDay)).toBe("Maharashtra Day / Labour Day");
      expect(isWorkingDay(maharashtraDay)).toBe(false);
    });

    it("correctly identifies weekend non-working days", () => {
      // 2026-05-02 is Saturday
      const saturday = new Date(2026, 4, 2, 12, 0, 0);
      expect(saturday.getDay()).toBe(6);
      expect(isWorkingDay(saturday)).toBe(false);

      // 2026-05-03 is Sunday
      const sunday = new Date(2026, 4, 3, 14, 0, 0);
      expect(sunday.getDay()).toBe(0);
      expect(isWorkingDay(sunday)).toBe(false);
    });

    it("identifies ordinary weekdays as active municipal working days", () => {
      // 2026-05-06 is Wednesday (no holiday)
      const ordinaryWednesday = new Date(2026, 4, 6, 10, 30, 0);
      expect(ordinaryWednesday.getDay()).toBe(3);
      expect(isHoliday(ordinaryWednesday)).toBe(false);
      expect(isWorkingDay(ordinaryWednesday)).toBe(true);
    });
  });

  describe("2. Working-Day SLA Deadline Calculation", () => {
    it("excludes weekends when calculating HIGH priority (2 working days) deadline", () => {
      // Friday, May 8, 2026 at 14:00
      const friday = new Date(2026, 4, 8, 14, 0, 0);
      expect(friday.getDay()).toBe(5); // Friday

      const result = calculateWorkingDaySla("HIGH", friday);

      // Expected:
      // Day 1: Monday, May 11
      // Day 2: Tuesday, May 12 at 14:00
      expect(result.allottedDays).toBe(2);
      expect(result.isEmergency24x7).toBe(false);
      expect(result.skippedWeekendDays).toBe(2); // Saturday + Sunday skipped
      expect(result.deadline.getDay()).toBe(2); // Tuesday
      expect(result.deadline.getDate()).toBe(12);
      expect(result.deadline.getMonth()).toBe(4); // May
      expect(result.deadline.getHours()).toBe(14);
    });

    it("excludes both weekends and public holidays from SLA calculation", () => {
      // Friday, Jan 23, 2026 at 11:00
      // Sat Jan 24: Weekend
      // Sun Jan 25: Weekend
      // Mon Jan 26: Republic Day (Holiday!)
      // Day 1: Tuesday Jan 27
      // Day 2: Wednesday Jan 28
      const fridayBeforeHoliday = new Date(2026, 0, 23, 11, 0, 0);

      const result = calculateWorkingDaySla("HIGH", fridayBeforeHoliday);

      expect(result.allottedDays).toBe(2);
      expect(result.skippedWeekendDays).toBe(2);
      expect(result.skippedHolidays.length).toBe(1);
      expect(result.skippedHolidays[0].name).toBe("Republic Day");
      expect(result.deadline.getDate()).toBe(28); // Wednesday Jan 28
      expect(result.deadline.getDay()).toBe(3); // Wednesday
    });

    it("exempts CRITICAL priority from working day delay (24x7 emergency protocol)", () => {
      // Friday evening at 18:00
      const fridayEvening = new Date(2026, 4, 8, 18, 0, 0);

      const result = calculateWorkingDaySla("CRITICAL", fridayEvening);

      expect(result.isEmergency24x7).toBe(true);
      expect(result.allottedHours).toBe(12);
      // Deadline is exactly 12 hours later: Saturday morning at 06:00
      const expectedTime = fridayEvening.getTime() + 12 * 60 * 60 * 1000;
      expect(result.deadline.getTime()).toBe(expectedTime);
      expect(result.skippedWeekendDays).toBe(0);
    });

    it("supports backward-compatible calculateSlaDeadline function signature", () => {
      const start = new Date(2026, 4, 6, 10, 0, 0); // Wednesday
      const deadline = calculateSlaDeadline("MEDIUM", start); // 4 working days -> Tuesday May 12
      expect(deadline).toBeInstanceOf(Date);
      expect(deadline.getTime()).toBeGreaterThan(start.getTime());
      expect(deadline.getDay()).toBe(2); // Tuesday
      expect(deadline.getDate()).toBe(12);
    });
  });

  describe("3. SLA Status Details & Human-Friendly Badges", () => {
    it("reports ON_TRACK when current time is well before deadline", () => {
      const now = new Date(2026, 4, 6, 10, 0, 0);
      const deadline = new Date(2026, 4, 10, 10, 0, 0);

      const details = getSlaStatusDetails(deadline, "IN_PROGRESS", now);
      expect(details.isOverdue).toBe(false);
      expect(details.badge).toBe("ON_TRACK");
      expect(details.humanLabel).toContain("working day");
    });

    it("reports OVERDUE when current time has surpassed the deadline", () => {
      const deadline = new Date(2026, 4, 6, 10, 0, 0);
      const now = new Date(2026, 4, 6, 18, 0, 0); // 8 hours later

      const details = getSlaStatusDetails(deadline, "IN_PROGRESS", now);
      expect(details.isOverdue).toBe(true);
      expect(details.badge).toBe("OVERDUE");
      expect(details.humanLabel).toContain("SLA Breached (Overdue by 8h)");
    });

    it("reports RESOLVED when complaint is resolved", () => {
      const deadline = new Date(2026, 4, 6, 10, 0, 0);
      const now = new Date(2026, 4, 7, 10, 0, 0);

      const details = getSlaStatusDetails(deadline, "RESOLVED", now);
      expect(details.isOverdue).toBe(false);
      expect(details.badge).toBe("RESOLVED");
      expect(details.humanLabel).toBe("Resolved within SLA");
    });
  });

  describe("4. SLA Monitoring API Endpoint Integration", () => {
    it("GET /api/v1/complaints/sla-monitoring returns workingCalendar metadata and slaDetails", async () => {
      const admin = await createVerifiedAdmin("admin-slatest@civicai.local");
      const token = await signIn(admin.email);

      // Create a test complaint to monitor
      await Complaint.create({
        complaintNumber: "CIV-SLA-TEST-01",
        title: "Pothole on Tilak Road",
        description: "Large cavity on carriageway.",
        category: "Roads",
        citizenId: admin._id,
        priority: "HIGH",
        status: "IN_PROGRESS",
        location: { address: "Tilak Road, Pune" },
        slaDeadline: calculateSlaDeadline("HIGH"),
      });

      const response = await request(app)
        .get("/api/v1/complaints/sla-monitoring")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workingCalendar).toBeDefined();
      expect(response.body.data.workingCalendar.standardHours).toContain("09:30 - 18:00 IST");
      expect(response.body.data.workingCalendar.weekendPolicy).toContain("Saturdays & Sundays excluded");
      expect(response.body.data.workingCalendar.totalRegisteredHolidays).toBeGreaterThanOrEqual(15);
    });
  });
});
