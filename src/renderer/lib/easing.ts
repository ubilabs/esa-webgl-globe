// ease in out quad: https://easings.net/#easeInOutQuad
export const easeInQutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
