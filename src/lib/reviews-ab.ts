/** Home A/B test: half of new visitors see the reviews, half don't. ?reviews=0|1 forces an arm; the arm is remembered per browser. */
export const REVIEWS_AB_KEY = "boveda-reviews-ab";
export const REVIEWS_SHARE = 0.5;

export function pickReviewsArm(forced: string | null, saved: string | null, rand: number): boolean {
  if (forced === "0" || forced === "1") return forced === "1";
  if (saved === "0" || saved === "1") return saved === "1";
  return rand < REVIEWS_SHARE;
}
