export const INS_MIN = 380;
export const INS_COMFORT = 480;
const INS_MAX_FLOOR = 720;
const MAP_FLOOR = 520;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function insMax(viewW: number, rail: number): number {
  return Math.max(INS_MAX_FLOOR, viewW - rail - MAP_FLOOR);
}

export function insDefault(viewW: number, rail: number): number {
  return clamp(Math.round(viewW * 0.28), INS_COMFORT, insMax(viewW, rail));
}

export function clampIns(width: number, viewW: number, rail: number): number {
  return clamp(width, INS_MIN, insMax(viewW, rail));
}

export function clampRail(width: number): number {
  return clamp(width, 186, 460);
}
