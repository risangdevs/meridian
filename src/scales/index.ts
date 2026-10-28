import { scaleLinear } from "d3";
import type { Mode } from "../types";
export const modeColor: Record<Mode, string> = {
  Metro: "#b5e88b",
  Bus: "#69bec5",
  Car: "#dbab74",
  Bike: "#a996d8",
};
export const congestionColor = scaleLinear<string>()
  .domain([0, 0.25, 0.5, 0.75, 1])
  .range(["#1d343b", "#3c7476", "#a6bd79", "#e0ac61", "#e47858"])
  .clamp(true);
export const duration = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 450;
