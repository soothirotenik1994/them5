/**
 * Utility functions for parsing Thai event dates, filtering past events,
 * and organizing upcoming events into weekly schedules.
 */

export interface ParsedEventDate {
  startDate: Date;
  endDate: Date;
  isValid: boolean;
}

export interface WeekGroup {
  weekKey: string;
  weekLabel: string;
  weekRangeText: string;
  isCurrentWeek: boolean;
  isNextWeek: boolean;
  events: any[];
}

const THAI_MONTHS: Record<string, number> = {
  "มกราคม": 0, "ม.ค.": 0, "ม.ค": 0, "january": 0, "jan": 0,
  "กุมภาพันธ์": 1, "ก.พ.": 1, "ก.พ": 1, "february": 1, "feb": 1,
  "มีนาคม": 2, "มี.ค.": 2, "มี.ค": 2, "march": 2, "mar": 2,
  "เมษายน": 3, "เม.ย.": 3, "เม.ย": 3, "april": 3, "apr": 3,
  "พฤษภาคม": 4, "พ.ค.": 4, "พ.ค": 4, "may": 4,
  "มิถุนายน": 5, "มิ.ย.": 5, "มิ.ย": 5, "june": 5, "jun": 5,
  "กรกฎาคม": 6, "ก.ค.": 6, "ก.ค": 6, "july": 6, "jul": 6,
  "สิงหาคม": 7, "ส.ค.": 7, "ส.ค": 7, "august": 7, "aug": 7,
  "กันยายน": 8, "ก.ย.": 8, "ก.ย": 8, "september": 8, "sep": 8,
  "ตุลาคม": 9, "ต.ค.": 9, "ต.ค": 9, "october": 9, "oct": 9,
  "พฤศจิกายน": 10, "พ.ย.": 10, "พ.ย": 10, "november": 10, "nov": 10,
  "ธันวาคม": 11, "ธ.ค.": 11, "ธ.ค": 11, "december": 11, "dec": 11
};

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_MONTH_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

/**
 * Normalizes Thai Buddhist Era year (2569) to CE year (2026)
 */
function normalizeYear(rawYear: number): number {
  if (rawYear >= 2400) {
    return rawYear - 543;
  }
  return rawYear;
}

/**
 * Parses various Thai and ISO date strings into valid Start and End Date objects.
 * Examples:
 * - "16-18 กันยายน 2569"
 * - "30 กรกฎาคม - 02 สิงหาคม 2569"
 * - "18 กรกฎาคม 2569"
 * - "2026-09-25 - 2026-09-27"
 */
export function parseEventDateRange(dateStr: string): ParsedEventDate {
  if (!dateStr || typeof dateStr !== "string") {
    const fallback = new Date();
    return { startDate: fallback, endDate: fallback, isValid: false };
  }

  const trimmed = dateStr.trim();
  const currentYear = new Date().getFullYear();

  // Pattern 1: ISO range "YYYY-MM-DD - YYYY-MM-DD" or single "YYYY-MM-DD"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*-\s*(\d{4})-(\d{2})-(\d{2}))?/);
  if (isoMatch) {
    const sYear = parseInt(isoMatch[1], 10);
    const sMonth = parseInt(isoMatch[2], 10) - 1;
    const sDay = parseInt(isoMatch[3], 10);
    const start = new Date(sYear, sMonth, sDay, 0, 0, 0);

    if (isoMatch[4]) {
      const eYear = parseInt(isoMatch[4], 10);
      const eMonth = parseInt(isoMatch[5], 10) - 1;
      const eDay = parseInt(isoMatch[6], 10);
      const end = new Date(eYear, eMonth, eDay, 23, 59, 59);
      return { startDate: start, endDate: end, isValid: true };
    }
    const end = new Date(sYear, sMonth, sDay, 23, 59, 59);
    return { startDate: start, endDate: end, isValid: true };
  }

  // Pattern 2: Range across different months e.g. "30 กรกฎาคม - 02 สิงหาคม 2569"
  const crossMonthMatch = trimmed.match(/(\d{1,2})\s+([ก-๙a-zA-Z\.]+)\s*-\s*(\d{1,2})\s+([ก-๙a-zA-Z\.]+)(?:\s+(\d{4}))?/);
  if (crossMonthMatch) {
    const sDay = parseInt(crossMonthMatch[1], 10);
    const sMonthKey = crossMonthMatch[2].toLowerCase();
    const eDay = parseInt(crossMonthMatch[3], 10);
    const eMonthKey = crossMonthMatch[4].toLowerCase();
    const rawYear = crossMonthMatch[5] ? parseInt(crossMonthMatch[5], 10) : (currentYear + 543);
    const year = normalizeYear(rawYear);

    const sMonth = THAI_MONTHS[sMonthKey] ?? 0;
    const eMonth = THAI_MONTHS[eMonthKey] ?? sMonth;

    const start = new Date(year, sMonth, sDay, 0, 0, 0);
    const end = new Date(year, eMonth, eDay, 23, 59, 59);
    return { startDate: start, endDate: end, isValid: true };
  }

  // Pattern 3: Range within same month e.g. "16-18 กันยายน 2569" or "16 - 18 กันยายน 2569"
  const sameMonthRangeMatch = trimmed.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([ก-๙a-zA-Z\.]+)(?:\s+(\d{4}))?/);
  if (sameMonthRangeMatch) {
    const sDay = parseInt(sameMonthRangeMatch[1], 10);
    const eDay = parseInt(sameMonthRangeMatch[2], 10);
    const monthKey = sameMonthRangeMatch[3].toLowerCase();
    const rawYear = sameMonthRangeMatch[4] ? parseInt(sameMonthRangeMatch[4], 10) : (currentYear + 543);
    const year = normalizeYear(rawYear);

    const month = THAI_MONTHS[monthKey] ?? 0;

    const start = new Date(year, month, sDay, 0, 0, 0);
    const end = new Date(year, month, eDay, 23, 59, 59);
    return { startDate: start, endDate: end, isValid: true };
  }

  // Pattern 4: Single day e.g. "18 กรกฎาคม 2569"
  const singleDayMatch = trimmed.match(/(\d{1,2})\s+([ก-๙a-zA-Z\.]+)(?:\s+(\d{4}))?/);
  if (singleDayMatch) {
    const day = parseInt(singleDayMatch[1], 10);
    const monthKey = singleDayMatch[2].toLowerCase();
    const rawYear = singleDayMatch[3] ? parseInt(singleDayMatch[3], 10) : (currentYear + 543);
    const year = normalizeYear(rawYear);

    const month = THAI_MONTHS[monthKey] ?? 0;

    const start = new Date(year, month, day, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59);
    return { startDate: start, endDate: end, isValid: true };
  }

  // Fallback: Try JavaScript default Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0);
    const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59);
    return { startDate: start, endDate: end, isValid: true };
  }

  // Unable to parse, treat as today
  const fallback = new Date();
  return { startDate: fallback, endDate: fallback, isValid: false };
}

/**
 * Checks if an event is in the past (ended before today).
 */
export function isPastEvent(dateStr: string, referenceDate: Date = new Date()): boolean {
  const { endDate, isValid } = parseEventDateRange(dateStr);
  if (!isValid) return false;

  // Start of reference day (00:00:00)
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0, 0, 0
  );

  return endDate.getTime() < todayStart.getTime();
}

/**
 * Checks if an event is upcoming or currently ongoing (ends on or after today).
 */
export function isUpcomingEvent(dateStr: string, referenceDate: Date = new Date()): boolean {
  return !isPastEvent(dateStr, referenceDate);
}

/**
 * Calculates start of week (Monday 00:00:00) and end of week (Sunday 23:59:59).
 */
export function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
  const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust when Sunday

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Formats a Date range into Thai text e.g. "21 - 27 ก.ย. 2569"
 */
export function formatWeekRangeThai(start: Date, end: Date): string {
  const sDay = start.getDate();
  const eDay = end.getDate();
  const sMonth = THAI_MONTH_SHORT[start.getMonth()];
  const eMonth = THAI_MONTH_SHORT[end.getMonth()];
  const thaiYear = end.getFullYear() + 543;

  if (start.getMonth() === end.getMonth()) {
    return `${sDay} - ${eDay} ${sMonth} ${thaiYear}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${thaiYear}`;
}

/**
 * Checks if an event falls inside the current week (Monday - Sunday).
 */
export function isEventInCurrentWeek(dateStr: string, referenceDate: Date = new Date()): boolean {
  const { startDate, endDate, isValid } = parseEventDateRange(dateStr);
  if (!isValid) return false;

  const { weekStart, weekEnd } = getWeekBounds(referenceDate);

  // Overlaps if event ends on/after weekStart AND starts on/before weekEnd
  return endDate.getTime() >= weekStart.getTime() && startDate.getTime() <= weekEnd.getTime();
}

/**
 * Checks if an event falls in the next week.
 */
export function isEventInNextWeek(dateStr: string, referenceDate: Date = new Date()): boolean {
  const { startDate, endDate, isValid } = parseEventDateRange(dateStr);
  if (!isValid) return false;

  const nextWeekRef = new Date(referenceDate);
  nextWeekRef.setDate(referenceDate.getDate() + 7);
  const { weekStart, weekEnd } = getWeekBounds(nextWeekRef);

  return endDate.getTime() >= weekStart.getTime() && startDate.getTime() <= weekEnd.getTime();
}

/**
 * Returns human-friendly badge info for the event (e.g. "กำลังจัดแสดง", "สัปดาห์นี้", "สัปดาห์หน้า", "อีก 8 วัน")
 */
export function getEventTimingBadge(dateStr: string, referenceDate: Date = new Date()): {
  text: string;
  color: string;
  isUrgent: boolean;
  daysRemaining: number;
} {
  const { startDate, endDate, isValid } = parseEventDateRange(dateStr);
  if (!isValid) {
    return { text: "เร็วๆ นี้", color: "bg-neutral-800 text-neutral-300", isUrgent: false, daysRemaining: 0 };
  }

  const todayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0);
  const todayEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59);

  // Currently happening today
  if (startDate.getTime() <= todayEnd.getTime() && endDate.getTime() >= todayStart.getTime()) {
    return { text: "🔴 กำลังจัดแสดงอยู่ตอนนี้", color: "bg-rose-500/20 text-rose-400 border border-rose-500/40", isUrgent: true, daysRemaining: 0 };
  }

  // Calculate days remaining until start
  const diffTime = startDate.getTime() - todayStart.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  if (isEventInCurrentWeek(dateStr, referenceDate)) {
    return { text: `⚡ สัปดาห์นี้ (อีก ${daysRemaining} วัน)`, color: "bg-amber-500/20 text-amber-300 border border-amber-500/40", isUrgent: true, daysRemaining };
  }

  if (isEventInNextWeek(dateStr, referenceDate)) {
    return { text: "📅 สัปดาห์หน้า", color: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40", isUrgent: false, daysRemaining };
  }

  if (daysRemaining <= 14) {
    return { text: `อีก ${daysRemaining} วัน`, color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40", isUrgent: false, daysRemaining };
  }

  return { text: `อีก ${daysRemaining} วัน`, color: "bg-neutral-850 text-neutral-350 border border-neutral-700", isUrgent: false, daysRemaining };
}

/**
 * Filter and sort upcoming events chronologically.
 */
export function getUpcomingEvents(events: any[], referenceDate: Date = new Date()): any[] {
  if (!Array.isArray(events)) return [];

  return events
    .filter((e) => e && e.active !== false && isUpcomingEvent(e.date, referenceDate))
    .sort((a, b) => {
      const aRange = parseEventDateRange(a.date);
      const bRange = parseEventDateRange(b.date);
      return aRange.startDate.getTime() - bRange.startDate.getTime();
    });
}

/**
 * Filter past events.
 */
export function getPastEvents(events: any[], referenceDate: Date = new Date()): any[] {
  if (!Array.isArray(events)) return [];

  return events
    .filter((e) => e && isPastEvent(e.date, referenceDate))
    .sort((a, b) => {
      const aRange = parseEventDateRange(a.date);
      const bRange = parseEventDateRange(b.date);
      return bRange.startDate.getTime() - aRange.startDate.getTime();
    });
}

/**
 * Groups upcoming events by weekly schedule ("สัปดาห์นั้นๆ").
 */
export function groupUpcomingEventsByWeek(events: any[], referenceDate: Date = new Date()): WeekGroup[] {
  const upcoming = getUpcomingEvents(events, referenceDate);
  const groupsMap = new Map<string, WeekGroup>();

  const currentBounds = getWeekBounds(referenceDate);
  const nextWeekRef = new Date(referenceDate);
  nextWeekRef.setDate(referenceDate.getDate() + 7);
  const nextBounds = getWeekBounds(nextWeekRef);

  upcoming.forEach((evt) => {
    const { startDate } = parseEventDateRange(evt.date);
    const { weekStart, weekEnd } = getWeekBounds(startDate);
    
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    
    if (!groupsMap.has(weekKey)) {
      const isCur = weekStart.getTime() === currentBounds.weekStart.getTime();
      const isNxt = weekStart.getTime() === nextBounds.weekStart.getTime();
      
      let weekLabel = formatWeekRangeThai(weekStart, weekEnd);
      if (isCur) {
        weekLabel = `สัปดาห์นี้ (${weekLabel})`;
      } else if (isNxt) {
        weekLabel = `สัปดาห์หน้า (${weekLabel})`;
      } else {
        weekLabel = `สัปดาห์ ${weekLabel}`;
      }

      groupsMap.set(weekKey, {
        weekKey,
        weekLabel,
        weekRangeText: formatWeekRangeThai(weekStart, weekEnd),
        isCurrentWeek: isCur,
        isNextWeek: isNxt,
        events: []
      });
    }

    groupsMap.get(weekKey)!.events.push(evt);
  });

  return Array.from(groupsMap.values());
}
