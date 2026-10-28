import { districts } from "./districts";
import { MODES, type TripRecord, type DayType } from "../types";
export const DATA_SEED = 271828;
const bell = (hour: number, peak: number, spread: number) =>
  Math.exp(-0.5 * ((hour - peak) / spread) ** 2);
export function generateData(seed = DATA_SEED): TripRecord[] {
  let state = seed;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const records: TripRecord[] = [];
  for (const dayType of ["Weekday", "Weekend"] as DayType[])
    for (let hour = 0; hour < 24; hour++) {
      const morning = bell(hour, 8, 1.45),
        evening = bell(hour, 17, 1.8),
        midday = bell(hour, 13, 3.3);
      for (const o of districts)
        for (const d of districts) {
          if (o.id === d.id) continue;
          const distance = Math.hypot(o.x - d.x, o.y - d.y) / 34 + 1.1;
          const crossRiver = o.x > 500 !== d.x > 500;
          const attraction =
            dayType === "Weekday"
              ? 0.07 +
                0.83 * morning * o.residents * d.jobs +
                0.76 * evening * o.jobs * d.residents +
                0.2 * midday * (o.residents + d.leisure)
              : 0.035 +
                0.48 * bell(hour, 14, 3.5) * o.residents * d.leisure +
                0.24 * bell(hour, 19, 2.1) * o.leisure * d.residents;
          const roadPressure = Math.min(
            0.97,
            0.12 +
              (dayType === "Weekday"
                ? 0.51 * morning + 0.47 * evening
                : 0.3 * midday) +
              0.075 * d.jobs +
              (crossRiver ? 0.12 : 0),
          );
          for (const mode of MODES) {
            const affinity =
              mode === "Metro"
                ? 0.42 * (distance > 4 ? 1.3 : 0.55)
                : mode === "Bus"
                  ? 0.27
                  : mode === "Car"
                    ? 0.32
                    : 0.18 * Math.exp(-distance / 4);
            const trips = Math.round(
              210 *
                attraction *
                affinity *
                Math.exp(-distance / 15) *
                (0.8 + 0.4 * random()),
            );
            if (!trips) continue;
            const congestion =
              mode === "Metro"
                ? Math.min(0.52, 0.16 + roadPressure * 0.27)
                : mode === "Bike"
                  ? 0.08 + roadPressure * 0.1
                  : roadPressure;
            const speed = { Metro: 38, Bus: 24, Car: 34, Bike: 15 }[mode];
            const travelTime =
              (distance / speed) *
                60 *
                (1 +
                  congestion *
                    (mode === "Car" || mode === "Bus" ? 1.35 : 0.15)) +
              (mode === "Metro" ? 5 : mode === "Bus" ? 4 : 1);
            records.push({
              origin: o.id,
              destination: d.id,
              trips,
              mode,
              hour,
              dayType,
              distance: +distance.toFixed(2),
              travelTime: +travelTime.toFixed(1),
              congestion: +congestion.toFixed(3),
            });
          }
        }
    }
  return records;
}
export const records = generateData();
