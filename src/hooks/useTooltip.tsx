import { useCallback, useState } from "react";
export function useTooltip() {
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    title: string;
    detail: string;
  } | null>(null);
  const show = useCallback(
    (
      event: Pick<MouseEvent, "clientX" | "clientY">,
      title: string,
      detail: string,
    ) => {
      setTip({
        x: Math.max(8, Math.min(event.clientX + 14, window.innerWidth - 270)),
        y: Math.max(8, Math.min(event.clientY + 14, window.innerHeight - 100)),
        title,
        detail,
      });
    },
    [],
  );
  const hide = useCallback(() => setTip(null), []);
  return {
    show,
    hide,
    element: tip ? (
      <div
        className="tooltip"
        role="tooltip"
        style={{ left: tip.x, top: tip.y }}
      >
        <strong>{tip.title}</strong>
        <span>{tip.detail}</span>
      </div>
    ) : null,
  };
}
