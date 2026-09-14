export const HI = "#c58a72";
export const MED = "#b9a06a";
export const ACC = "#9184d9";
export const ACC3 = "#d2cefd";
export const ADD = "#8fbf98";

export function riskColor(sev: string): string {
  if (sev === "high") {
    return HI;
  }
  if (sev === "medium") {
    return MED;
  }
  return "#75798c";
}
