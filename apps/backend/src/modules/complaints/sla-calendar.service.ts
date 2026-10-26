/**
 * Pune Municipal Corporation (PMC) Working-Day SLA Calendar Service
 * 
 * Implements civic grievance SLA deadlines based on official municipal working days,
 * excluding weekends (Saturdays & Sundays) and official Maharashtra / PMC gazetted public holidays.
 * 
 * For CRITICAL severity: Operates 24x7 emergency response without holiday delay.
 * For HIGH, MEDIUM, LOW: Accounts for municipal working calendar (09:30 to 18:00 IST).
 */

import type { ComplaintPriority } from "./complaint.model";

// Official Maharashtra / PMC Gazetted Public Holidays
export const PMC_PUBLIC_HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-01-26": "Republic Day",
  "2025-02-19": "Chhatrapati Shivaji Maharaj Jayanti",
  "2025-03-14": "Holi (Dhulivandan)",
  "2025-03-30": "Gudi Padwa",
  "2025-03-31": "Ramzan Eid (Id-ul-Fitr)",
  "2025-04-14": "Dr. Babasaheb Ambedkar Jayanti",
  "2025-05-01": "Maharashtra Day / Labour Day",
  "2025-06-07": "Bakri Eid (Eid-ul-Adha)",
  "2025-07-06": "Muharram",
  "2025-08-15": "Independence Day",
  "2025-08-27": "Ganesh Chaturthi",
  "2025-09-06": "Anant Chaturdashi (Ganesh Visarjan)",
  "2025-10-02": "Mahatma Gandhi Jayanti",
  "2025-10-21": "Diwali (Laxmi Pujan)",
  "2025-10-22": "Diwali (Balipratipada)",
  "2025-10-23": "Bhaubeej",
  "2025-12-25": "Christmas",

  // 2026
  "2026-01-26": "Republic Day",
  "2026-02-19": "Chhatrapati Shivaji Maharaj Jayanti",
  "2026-03-03": "Holi (Dhulivandan)",
  "2026-03-19": "Gudi Padwa",
  "2026-03-21": "Ramzan Eid (Id-ul-Fitr)",
  "2026-04-14": "Dr. Babasaheb Ambedkar Jayanti",
  "2026-05-01": "Maharashtra Day / Labour Day",
  "2026-05-27": "Bakri Eid (Eid-ul-Adha)",
  "2026-06-26": "Muharram",
  "2026-08-15": "Independence Day",
  "2026-08-28": "Milad-un-Nabi (Eid-e-Milad)",
  "2026-09-14": "Ganesh Chaturthi",
  "2026-09-25": "Anant Chaturdashi (Ganesh Visarjan)",
  "2026-10-02": "Mahatma Gandhi Jayanti",
  "2026-10-20": "Dussehra (Vijayadashami)",
  "2026-11-08": "Diwali (Laxmi Pujan)",
  "2026-11-09": "Diwali (Balipratipada)",
  "2026-11-10": "Bhaubeej",
  "2026-11-24": "Guru Nanak Jayanti",
  "2026-12-25": "Christmas",

  // 2027
  "2027-01-26": "Republic Day",
  "2027-02-19": "Chhatrapati Shivaji Maharaj Jayanti",
  "2027-04-14": "Dr. Babasaheb Ambedkar Jayanti",
  "2027-05-01": "Maharashtra Day / Labour Day",
  "2027-08-15": "Independence Day",
  "2027-10-02": "Mahatma Gandhi Jayanti",
  "2027-12-25": "Christmas",
};

export interface SlaCalculationResult {
  deadline: Date;
  allottedDays: number;
  allottedHours: number;
  isEmergency24x7: boolean;
  skippedWeekendDays: number;
  skippedHolidays: Array<{ date: string; name: string }>;
  explanation: string;
}

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a registered PMC gazetted holiday
 */
export function isHoliday(date: Date): boolean {
  const key = formatDateKey(date);
  return Boolean(PMC_PUBLIC_HOLIDAYS[key]);
}

/**
 * Get the name of the holiday if the date is a holiday
 */
export function getHolidayName(date: Date): string | null {
  const key = formatDateKey(date);
  return PMC_PUBLIC_HOLIDAYS[key] || null;
}

/**
 * Check if a given day is a municipal working day (Monday - Friday and not a holiday)
 */
export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  return !isHoliday(date);
}

/**
 * Normalizes start time to municipal business hours (09:30 to 18:00).
 * If submitted on a weekend, holiday, or after 18:00, advances to 09:30 of the next working day.
 */
export function getNextWorkingDayStart(fromDate: Date): Date {
  const current = new Date(fromDate);

  // If outside working hours on a weekday or on a non-working day
  while (!isWorkingDay(current) || current.getHours() >= 18) {
    // Advance to next day at 09:30
    current.setDate(current.getDate() + 1);
    current.setHours(9, 30, 0, 0);
  }

  // If submitted before 09:30 on a working day, set to 09:30
  if (current.getHours() < 9 || (current.getHours() === 9 && current.getMinutes() < 30)) {
    current.setHours(9, 30, 0, 0);
  }

  return current;
}

/**
 * Calculates municipal working-day SLA deadline for a complaint.
 * 
 * Rules:
 * - CRITICAL: 12 Calendar Hours (Continuous 24x7 Emergency Disaster / Hazards Response)
 * - HIGH:     2 Municipal Working Days (excludes weekends & PMC gazetted holidays)
 * - MEDIUM:   4 Municipal Working Days (excludes weekends & PMC gazetted holidays)
 * - LOW:      7 Municipal Working Days (excludes weekends & PMC gazetted holidays)
 */
export function calculateWorkingDaySla(
  priority: ComplaintPriority,
  fromDate: Date = new Date(),
): SlaCalculationResult {
  const baseDate = new Date(fromDate);

  // CRITICAL: 24x7 Emergency response - continuous 12 calendar hours
  if (priority === "CRITICAL") {
    const deadline = new Date(baseDate.getTime() + 12 * 60 * 60 * 1000);
    return {
      deadline,
      allottedDays: 0.5,
      allottedHours: 12,
      isEmergency24x7: true,
      skippedWeekendDays: 0,
      skippedHolidays: [],
      explanation: "Emergency 24x7 Protocol: 12 continuous calendar hours allotted for critical disaster/life-safety remediation.",
    };
  }

  const workingDaysMap: Record<ComplaintPriority, number> = {
    CRITICAL: 0.5,
    HIGH: 2,
    MEDIUM: 4,
    LOW: 7,
  };

  const daysNeeded = workingDaysMap[priority] ?? 4;
  const skippedHolidays: Array<{ date: string; name: string }> = [];
  let skippedWeekendDays = 0;

  // Start from normalized working time
  let current = new Date(baseDate);

  // If initial submission happens outside working hours or on weekend/holiday, advance to next working day
  if (!isWorkingDay(current) || current.getHours() >= 18) {
    // Check initial skipped days
    while (!isWorkingDay(current) || current.getHours() >= 18) {
      if (current.getDay() === 0 || current.getDay() === 6) {
        skippedWeekendDays++;
      } else if (isHoliday(current)) {
        skippedHolidays.push({ date: formatDateKey(current), name: getHolidayName(current)! });
      }
      current.setDate(current.getDate() + 1);
      current.setHours(9, 30, 0, 0);
    }
  }

  // Preserve the submission time-of-day offset
  const startHours = current.getHours();
  const startMinutes = current.getMinutes();
  const startSeconds = current.getSeconds();

  let daysCounted = 0;

  // Step forward day by day until allotted working days are satisfied
  while (daysCounted < daysNeeded) {
    current.setDate(current.getDate() + 1);

    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      skippedWeekendDays++;
      continue;
    }

    if (isHoliday(current)) {
      skippedHolidays.push({
        date: formatDateKey(current),
        name: getHolidayName(current)!,
      });
      continue;
    }

    daysCounted++;
  }

  // Restore the time of day, ensuring it caps at close of business (18:00)
  current.setHours(Math.min(startHours, 18), startMinutes, startSeconds, 0);

  const holidayNote = skippedHolidays.length > 0
    ? ` (extended for ${skippedHolidays.map((h) => h.name).join(", ")})`
    : "";
  const weekendNote = skippedWeekendDays > 0 ? ` + ${skippedWeekendDays} weekend day(s) excluded` : "";

  const explanation = `${daysNeeded} municipal working days allotted${weekendNote}${holidayNote}.`;

  return {
    deadline: current,
    allottedDays: daysNeeded,
    allottedHours: daysNeeded * 8.5,
    isEmergency24x7: false,
    skippedWeekendDays,
    skippedHolidays,
    explanation,
  };
}

/**
 * Drop-in backward-compatible calculateSlaDeadline function for existing models and services
 */
export function calculateSlaDeadline(
  priority: ComplaintPriority,
  fromDate: Date = new Date(),
): Date {
  return calculateWorkingDaySla(priority, fromDate).deadline;
}

/**
 * Returns detailed SLA status and human-friendly time badge
 */
export function getSlaStatusDetails(
  deadline: Date,
  status: string,
  now: Date = new Date(),
) {
  const isResolved = status === "RESOLVED" || status === "CLOSED";
  const diffMs = deadline.getTime() - now.getTime();
  const isOverdue = !isResolved && diffMs < 0;
  const isApproaching = !isResolved && diffMs >= 0 && diffMs <= 4 * 60 * 60 * 1000;

  const totalHoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
  const workingDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let badge: "RESOLVED" | "OVERDUE" | "APPROACHING" | "ON_TRACK" = "ON_TRACK";
  if (isResolved) badge = "RESOLVED";
  else if (isOverdue) badge = "OVERDUE";
  else if (isApproaching) badge = "APPROACHING";

  let humanLabel = "";
  if (isResolved) {
    humanLabel = "Resolved within SLA";
  } else if (isOverdue) {
    humanLabel = `SLA Breached (Overdue by ${Math.abs(totalHoursRemaining)}h)`;
  } else if (isApproaching) {
    humanLabel = `Approaching Breach (${totalHoursRemaining}h remaining)`;
  } else {
    humanLabel = `${workingDaysRemaining} working day(s) remaining`;
  }

  return {
    isOverdue,
    isApproaching,
    badge,
    totalHoursRemaining,
    workingDaysRemaining,
    humanLabel,
  };
}
