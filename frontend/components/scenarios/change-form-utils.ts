import { FIELD_CONFIGS } from './change-field-config';

/**
 * Converts form parameters to API format
 * Handles number parsing and percentage conversion (e.g., 6.5% -> 0.065)
 */
export function convertFormParameters(params: Record<string, string>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    // Skip empty values
    if (value === '') return;

    const fieldConfig = FIELD_CONFIGS[key];

    if (fieldConfig?.type === 'number') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        // Convert percentages to decimal (e.g., 6.5 -> 0.065)
        converted[key] = fieldConfig.isPercentage ? parsed / 100 : parsed;
      }
    } else {
      // Keep as string for non-numeric fields
      converted[key] = value;
    }
  });

  return converted;
}
