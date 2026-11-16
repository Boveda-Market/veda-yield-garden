/** The official safety notice shows on a device's 1st app visit and again every SAFETY_REPEAT_EVERY visits after it. */
export const SAFETY_REPEAT_EVERY = 10;
export const shouldShowSafety = (visit: number) => visit >= 1 && (visit - 1) % SAFETY_REPEAT_EVERY === 0;
