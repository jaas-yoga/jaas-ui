/** Shared between the Custom Rules list and the rule draft editor so the
 * two never drift — category/kind options a custom rule can be authored
 * with (guardrails/custom_rules.py's CATEGORIES, jaas_guardrails/
 * executors.py's EXECUTORS_BY_KIND). */
export const CUSTOM_GUARDRAIL_CATEGORIES = [
  "SECRET",
  "SIZE",
  "CODE_SAFETY",
  "PROMPT_SAFETY",
  "PERMISSIONS",
  "LICENSING",
  "SUPPLY_CHAIN",
  "PRIVACY",
  "COMPLIANCE",
  "CONTENT_SAFETY",
] as const;

// A custom rule can only ever use one of these, never a new kind — no
// code-execution path (see that service's README "Custom rules" section).
export const CUSTOM_GUARDRAIL_KINDS = [
  "regex_file_scan",
  "filename_pattern_scan",
  "package_size",
  "permission_pair_risk",
  "permission_count_threshold",
  "dependency_constraint",
  "dependency_count",
  "dependency_typosquat",
  "file_extension_scan",
  "wordlist_scan",
  "file_text_presence",
] as const;
