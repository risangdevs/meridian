export const MODES = ["Metro", "Bus", "Car", "Bike"] as const;
export type Mode = (typeof MODES)[number];
export type DayType = "Weekday" | "Weekend";
export interface District {
  id: string;
  name: string;
  x: number;
  y: number;
  residents: number;
  jobs: number;
  leisure: number;
}
export interface TripRecord {
  origin: string;
  destination: string;
  trips: number;
  mode: Mode;
  travelTime: number;
  distance: number;
  hour: number;
  dayType: DayType;
  congestion: number;
}
export interface Filters {
  hours: [number, number];
  modes: Mode[];
  dayType: DayType;
  origin: string;
  destination: string;
  district: string;
  direction: "both" | "incoming" | "outgoing";
}
export type RankingMetric =
  "departures" | "arrivals" | "congestion" | "travelTime";
export interface Route {
  id: string;
  origin: string;
  destination: string;
  trips: number;
  congestion: number;
  travelTime: number;
  mode: Mode;
}
export interface DistrictStat {
  id: string;
  name: string;
  departures: number;
  arrivals: number;
  congestion: number;
  travelTime: number;
  total: number;
}
export interface HourStat {
  hour: number;
  trips: number;
  Metro: number;
  Bus: number;
  Car: number;
  Bike: number;
}
