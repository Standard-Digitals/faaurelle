import "server-only";

export function commerceDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" || process.env.COMMERCE_DEBUG_LOGS !== "true") return;
  console.info(`[commerce:debug:${label}]`, details);
}

export function commerceDebugJson(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" || process.env.COMMERCE_DEBUG_LOGS !== "true") return;
  console.info(`[commerce:debug:${label}]\n${JSON.stringify(details, null, 2)}`);
}
