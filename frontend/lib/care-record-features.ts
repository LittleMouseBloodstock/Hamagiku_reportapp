/**
 * Temporary safety switch for the care-record add-ons.
 *
 * The underlying draft data and translation fields remain backward-compatible,
 * but the unreliable translation/report-linking workflow is not exposed until
 * it has deterministic validation and recovery behavior.
 */
export const CARE_RECORD_TRANSLATION_ENABLED = false;
export const CARE_RECORD_REPORT_LINKING_ENABLED = false;
