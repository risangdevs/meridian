import { RotateCcw, X } from "lucide-react";
import { districts, districtName } from "../../data/districts";
import { MODES, type Filters as FilterState } from "../../types";
import { modeColor } from "../../scales";
import { hourLabel } from "../../utils/aggregate";
export default function Filters({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  return (
    <div className="filter-surface">
      <div className="filter-row">
        <div className="filter-field day-field">
          <label htmlFor="day-type">DAY TYPE</label>
          <select
            id="day-type"
            value={filters.dayType}
            onChange={(e) =>
              onChange({ dayType: e.target.value as FilterState["dayType"] })
            }
          >
            <option>Weekday</option>
            <option>Weekend</option>
          </select>
        </div>
        <div className="filter-field">
          <span className="filter-label">TIME WINDOW</span>
          <div className="time-controls">
            <select
              aria-label="Start hour"
              value={filters.hours[0]}
              onChange={(e) => {
                const start = +e.target.value;
                onChange({
                  hours: [start, Math.max(start + 1, filters.hours[1])],
                });
              }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {hourLabel(i)}
                </option>
              ))}
            </select>
            <span>—</span>
            <select
              aria-label="End hour"
              value={filters.hours[1]}
              onChange={(e) => {
                const end = +e.target.value;
                onChange({ hours: [Math.min(end - 1, filters.hours[0]), end] });
              }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {hourLabel(i + 1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-field modes-field">
          <span className="filter-label">TRANSPORT MODE</span>
          <div className="mode-buttons">
            {MODES.map((mode) => (
              <button
                key={mode}
                aria-pressed={filters.modes.includes(mode)}
                className={filters.modes.includes(mode) ? "enabled" : ""}
                onClick={() =>
                  onChange({
                    modes: filters.modes.includes(mode)
                      ? filters.modes.filter((m) => m !== mode)
                      : [...filters.modes, mode],
                  })
                }
              >
                <i style={{ background: modeColor[mode] }} />
                {mode}
              </button>
            ))}
          </div>
        </div>
        {(["origin", "destination"] as const).map((kind) => (
          <div className="filter-field district-field" key={kind}>
            <label htmlFor={kind}>{kind.toUpperCase()}</label>
            <select
              id={kind}
              value={filters[kind]}
              onChange={(e) => onChange({ [kind]: e.target.value })}
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button className="reset-button" onClick={onReset}>
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
      {filters.district && (
        <div className="selection-bar">
          <span>EXPLORING</span>
          <strong>{districtName(filters.district)}</strong>
          <span>
            {filters.direction === "both"
              ? "Arrivals + departures"
              : filters.direction}
          </span>
          <button
            onClick={() => onChange({ district: "", direction: "both" })}
            aria-label="Clear district selection"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
