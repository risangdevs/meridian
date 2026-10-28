import type { District } from "../types";
// Schematic coordinates in a local 900 × 570 city plane; not real geography.
export const districts: District[] = [
  ["northgate", "Northgate", 410, 68, 1.5, 0.35, 0.3],
  ["airport", "Airport", 665, 62, 0.2, 1.1, 0.4],
  ["hillcrest", "Hillcrest", 230, 104, 1.4, 0.3, 0.3],
  ["university", "University", 526, 137, 0.8, 1.1, 0.7],
  ["eastwood", "Eastwood", 762, 177, 1.5, 0.4, 0.5],
  ["westpark", "West Park", 119, 224, 1.1, 0.35, 1.2],
  ["midtown", "Midtown", 350, 206, 0.8, 1.6, 0.8],
  ["tech", "Tech Quarter", 650, 230, 0.5, 1.7, 0.5],
  ["oldtown", "Old Town", 226, 292, 0.8, 0.7, 1.6],
  ["central", "Central", 467, 284, 0.5, 2.4, 1.2],
  ["riverside", "Riverside", 565, 349, 1, 0.7, 1.4],
  ["financial", "Financial", 371, 352, 0.3, 2.3, 0.4],
  ["harbor", "Harbor", 765, 348, 0.4, 1.2, 0.9],
  ["market", "Market District", 161, 403, 0.9, 1.1, 1.5],
  ["southbank", "Southbank", 460, 445, 1.4, 0.55, 0.8],
  ["arts", "Arts District", 279, 461, 0.7, 0.6, 1.8],
  ["industrial", "Industrial", 666, 445, 0.3, 1.5, 0.2],
  ["lakeside", "Lakeside", 130, 510, 1.2, 0.2, 1.3],
  ["greenfield", "Greenfield", 390, 535, 1.6, 0.25, 0.5],
  ["southgate", "Southgate", 577, 530, 1.5, 0.4, 0.4],
].map(
  ([id, name, x, y, residents, jobs, leisure]) =>
    ({ id, name, x, y, residents, jobs, leisure }) as District,
);
export const districtById = new Map(districts.map((d) => [d.id, d]));
export const districtName = (id: string) => districtById.get(id)?.name ?? id;
