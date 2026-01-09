// =============================================================================
// PROJECTION CALENDAR — Standardized Time Handling for Projections
// =============================================================================
//
// This module provides consistent conversion between month indices and ISO dates
// for projection data. All chart inputs should use these utilities to ensure
// the system is consistent with formatting helpers.
//
// Key concepts:
// - monthIndex: 0-based index from projection start (0 = first month)
// - ISO date: 'YYYY-MM-DD' format for chart data
// - startDate: The reference date for the projection (usually current month)
//
// =============================================================================

/**
 * Result of date parsing/conversion
 */
export interface ProjectionDate {
  /** ISO date string: 'YYYY-MM-DD' */
  iso: string;
  /** Year component */
  year: number;
  /** Month component (1-12) */
  month: number;
  /** Day component (always 1 for projections) */
  day: number;
  /** 0-based month index from start date */
  monthIndex: number;
}

/**
 * Time range for projections
 */
export interface ProjectionRange {
  /** Start of range */
  start: ProjectionDate;
  /** End of range */
  end: ProjectionDate;
  /** Total months in range */
  totalMonths: number;
}

// =============================================================================
// CORE CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert a month index to an ISO date string
 *
 * @param startDate - The projection start date
 * @param monthIndex - 0-based month index from start
 * @returns ISO date string 'YYYY-MM-DD'
 *
 * @example
 * monthIndexToISO('2025-01-01', 0)  // '2025-01-01'
 * monthIndexToISO('2025-01-01', 12) // '2026-01-01'
 * monthIndexToISO('2025-06-15', 6)  // '2025-12-01'
 */
export function monthIndexToISO(startDate: Date | string, monthIndex: number): string {
  const start = normalizeToFirstOfMonth(startDate);
  const result = new Date(start);
  result.setMonth(result.getMonth() + monthIndex);
  return formatISO(result);
}

/**
 * Convert an ISO date string to a month index
 *
 * @param startDate - The projection start date
 * @param iso - ISO date string to convert
 * @returns 0-based month index, or -1 if date is before start
 *
 * @example
 * isoToMonthIndex('2025-01-01', '2025-01-01') // 0
 * isoToMonthIndex('2025-01-01', '2026-01-01') // 12
 * isoToMonthIndex('2025-01-01', '2024-12-01') // -1
 */
export function isoToMonthIndex(startDate: Date | string, iso: string): number {
  const start = normalizeToFirstOfMonth(startDate);
  const target = normalizeToFirstOfMonth(iso);

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();

  const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);

  return monthDiff;
}

/**
 * Get full projection date info for a month index
 */
export function getProjectionDate(startDate: Date | string, monthIndex: number): ProjectionDate {
  const iso = monthIndexToISO(startDate, monthIndex);
  const d = new Date(iso);

  return {
    iso,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: 1,
    monthIndex,
  };
}

/**
 * Get full projection date info from an ISO string
 */
export function parseProjectionDate(startDate: Date | string, iso: string): ProjectionDate {
  const monthIndex = isoToMonthIndex(startDate, iso);
  const d = new Date(iso);

  return {
    iso: formatISO(normalizeToFirstOfMonth(iso)),
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: 1,
    monthIndex,
  };
}

// =============================================================================
// RANGE FUNCTIONS
// =============================================================================

/**
 * Create a projection range from month indices
 */
export function createProjectionRange(
  startDate: Date | string,
  startIndex: number,
  endIndex: number
): ProjectionRange {
  return {
    start: getProjectionDate(startDate, startIndex),
    end: getProjectionDate(startDate, endIndex),
    totalMonths: endIndex - startIndex + 1,
  };
}

/**
 * Create a projection range for a given horizon
 *
 * @param startDate - Projection start date
 * @param horizonMonths - Number of months to project
 */
export function createHorizonRange(
  startDate: Date | string,
  horizonMonths: number
): ProjectionRange {
  return createProjectionRange(startDate, 0, horizonMonths - 1);
}

/**
 * Generate an array of ISO dates for a range
 *
 * @param startDate - Projection start date
 * @param startIndex - Starting month index (0-based)
 * @param count - Number of months to generate
 */
export function generateDateRange(
  startDate: Date | string,
  startIndex: number,
  count: number
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(monthIndexToISO(startDate, startIndex + i));
  }
  return dates;
}

/**
 * Generate monthly ISO dates for a horizon
 */
export function generateHorizonDates(startDate: Date | string, horizonMonths: number): string[] {
  return generateDateRange(startDate, 0, horizonMonths);
}

// =============================================================================
// HORIZON PRESETS
// =============================================================================

export type HorizonPreset = '1Y' | '2Y' | '5Y' | '10Y' | '30Y';

export const HORIZON_MONTHS: Record<HorizonPreset, number> = {
  '1Y': 12,
  '2Y': 24,
  '5Y': 60,
  '10Y': 120,
  '30Y': 360,
};

/**
 * Get month count for a horizon preset
 */
export function getHorizonMonths(preset: HorizonPreset | string): number {
  return HORIZON_MONTHS[preset as HorizonPreset] ?? 12;
}

/**
 * Create a projection range for a horizon preset
 */
export function createPresetRange(startDate: Date | string, preset: HorizonPreset): ProjectionRange {
  const months = HORIZON_MONTHS[preset];
  return createHorizonRange(startDate, months);
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format a projection date for display: "Jan 2026"
 */
export function formatProjectionMonth(date: ProjectionDate): string {
  const d = new Date(date.iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format a projection date for chart axis: "Jan '26"
 */
export function formatProjectionMonthShort(date: ProjectionDate): string {
  const d = new Date(date.iso);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

/**
 * Format a projection range for display: "Jan 2025 - Dec 2025"
 */
export function formatProjectionRange(range: ProjectionRange): string {
  return `${formatProjectionMonth(range.start)} - ${formatProjectionMonth(range.end)}`;
}

// =============================================================================
// COMPARISON HELPERS
// =============================================================================

/**
 * Check if an ISO date falls within a projection range
 */
export function isInRange(iso: string, range: ProjectionRange): boolean {
  const d = normalizeToFirstOfMonth(iso);
  const start = new Date(range.start.iso);
  const end = new Date(range.end.iso);
  return d >= start && d <= end;
}

/**
 * Get the relative position (0-1) of a date within a range
 */
export function getRelativePosition(iso: string, range: ProjectionRange): number {
  if (range.totalMonths <= 1) return 0;

  const startDate = range.start.iso;
  const monthIndex = isoToMonthIndex(startDate, iso);

  return Math.max(0, Math.min(1, monthIndex / (range.totalMonths - 1)));
}

// =============================================================================
// MILESTONE HELPERS
// =============================================================================

export interface ProjectionMilestone {
  /** Milestone identifier */
  id: string;
  /** Milestone label */
  label: string;
  /** Month index when milestone occurs */
  monthIndex: number;
  /** ISO date of milestone */
  iso: string;
  /** Formatted date */
  formatted: string;
}

/**
 * Create a milestone at a specific month index
 */
export function createMilestone(
  startDate: Date | string,
  monthIndex: number,
  id: string,
  label: string
): ProjectionMilestone {
  const date = getProjectionDate(startDate, monthIndex);
  return {
    id,
    label,
    monthIndex,
    iso: date.iso,
    formatted: formatProjectionMonth(date),
  };
}

/**
 * Find when a value crosses a threshold in projection data
 *
 * @returns Month index of first crossing, or -1 if never crosses
 */
export function findThresholdCrossing(
  values: number[],
  threshold: number,
  direction: 'above' | 'below'
): number {
  for (let i = 0; i < values.length; i++) {
    const meetsCondition =
      direction === 'above' ? values[i] >= threshold : values[i] <= threshold;

    if (meetsCondition) {
      return i;
    }
  }
  return -1;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Normalize a date to the first of the month
 */
function normalizeToFirstOfMonth(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Format a date as ISO string (YYYY-MM-DD)
 */
function formatISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// =============================================================================
// CURRENT DATE HELPERS
// =============================================================================

/**
 * Get today as a normalized projection start date
 */
export function getProjectionStartDate(): string {
  return formatISO(normalizeToFirstOfMonth(new Date()));
}

/**
 * Get the current month's projection date
 */
export function getCurrentProjectionDate(): ProjectionDate {
  const startDate = getProjectionStartDate();
  return getProjectionDate(startDate, 0);
}
