/** Bouncing arrow shows only on the first visits per screen; the bottom fade always shows until the end. */
export const ARROW_VISITS = 3;
export const scrollHintKey = (view: string) => `boveda:scroll-hint:${view}`;
export const showArrow = (seen: number) => seen < ARROW_VISITS;
/** More content below when the page bottom is further than `slack` px from the viewport bottom. */
export const hasMoreBelow = (scrollY: number, viewH: number, docH: number, slack = 24) => scrollY + viewH < docH - slack;
