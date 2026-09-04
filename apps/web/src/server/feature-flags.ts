import "server-only";

/**
 * Minimal Stage 1 scaffold. Flags are read from environment variables so
 * they can be toggled per-deployment without a code change; a real
 * management UI/table (Stage 8, "feature rollout, provider kill switches")
 * replaces this without changing the isFeatureEnabled call sites.
 */
const FEATURE_FLAG_ENV_PREFIX = "FEATURE_";

export type FeatureFlag = "contactImport" | "directSend";

const FLAG_ENV_NAMES: Record<FeatureFlag, string> = {
  contactImport: `${FEATURE_FLAG_ENV_PREFIX}CONTACT_IMPORT`,
  directSend: `${FEATURE_FLAG_ENV_PREFIX}DIRECT_SEND`,
};

/** Every flag defaults to off — features ship opt-in, never silently on. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return process.env[FLAG_ENV_NAMES[flag]] === "true";
}
