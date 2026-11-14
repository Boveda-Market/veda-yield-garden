import { createServerFn } from "@tanstack/react-start";

// The GA4 measurement ID is public by design; it is read server-side and returned to the browser.
export const getAnalyticsId = createServerFn({ method: "GET" }).handler(async () => {
  const id = process.env['GOOGLE_ANALYTICS_MEASUREMENT_ID'] ?? "";
  return /^G-[A-Z0-9]{4,20}$/i.test(id) ? id : null;
});
