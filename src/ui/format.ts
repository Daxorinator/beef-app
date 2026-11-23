export const kg = (x: number, dp = 1) => `${x.toFixed(dp)} kg`;
export const g = (xKg: number) => `${Math.round(xKg * 1000)} g`;
export const weight = (xKg: number) => (xKg < 1 ? g(xKg) : kg(xKg, xKg < 10 ? 2 : 1));
export const pct = (x: number, dp = 1) => `${x.toFixed(dp)} %`;
