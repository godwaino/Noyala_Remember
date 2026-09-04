import "server-only";
import { logger } from "@/server/logger";

/**
 * Behind configuration, per Stage 1 ("error monitoring hooks behind
 * configuration"): no-ops until ERROR_MONITORING_DSN is set, at which
 * point this is the single place a real provider (e.g. Sentry) gets wired
 * in — call sites never change. Never pass personal content as `context`.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (!process.env.ERROR_MONITORING_DSN) {
    logger.error("Unreported error (ERROR_MONITORING_DSN not configured)", {
      ...context,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // Placeholder for a real provider integration once ERROR_MONITORING_DSN
  // is set. Intentionally not implemented against a specific vendor yet —
  // see docs/roadmap.md.
  logger.error("Unreported error (monitoring provider not yet integrated)", {
    ...context,
    message: error instanceof Error ? error.message : String(error),
  });
}
