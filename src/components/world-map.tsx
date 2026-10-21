import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { worldMap, type Indicator } from "@/lib/atlas";

type Props = {
  classOf: (iso3: string) => number | null;
  selected: string | null;
  indicator: Indicator;
  labelFor: (iso3: string) => { name: string; value: string; year: string } | null;
  onSelect: (iso3: string) => void;
};

type Transform = { k: number; tx: number; ty: number };

const VB_W = 960;
const VB_H = 500;

function clamp(t: Transform): Transform {
  const k = Math.min(18, Math.max(1, t.k));
  if (k <= 1.001) return { k: 1, tx: 0, ty: 0 };
  const slack = 28;
  return {
    k,
    tx: Math.min(slack, Math.max(VB_W - VB_W * k - slack, t.tx)),
    ty: Math.min(slack, Math.max(VB_H - VB_H * k - slack, t.ty)),
  };
}

export function WorldMap({ classOf, selected, indicator, labelFor, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tf = useRef<Transform>({ k: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ dist: number; k: number; contentX: number; contentY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const frame = useRef(0);
  const [hover, setHover] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);

  function apply() {
    const { k, tx, ty } = tf.current;
    gRef.current?.setAttribute("transform", `translate(${tx} ${ty}) scale(${k})`);
  }

  function tweenTo(target: Transform) {
    const from = { ...tf.current };
    const next = clamp(target);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cancelAnimationFrame(frame.current);
    if (reduced) {
      tf.current = next;
      apply();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 340);
      const e = 1 - (1 - t) ** 3;
      tf.current = clamp({
        k: from.k + (next.k - from.k) * e,
        tx: from.tx + (next.tx - from.tx) * e,
        ty: from.ty + (next.ty - from.ty) * e,
      });
      apply();
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  function zoomAbout(anchor: { x: number; y: number }, nextK: number) {
    const current = tf.current;
    const k = Math.min(18, Math.max(1, nextK));
    const contentX = (anchor.x - current.tx) / current.k;
    const contentY = (anchor.y - current.ty) / current.k;
    tf.current = clamp({
      k,
      tx: anchor.x - contentX * k,
      ty: anchor.y - contentY * k,
    });
    apply();
  }

  function toViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const mapped = point.matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }

  useEffect(() => {
    if (!selected) return;
    const land = worldMap.lands.find((item) => item.iso3 === selected);
    if (!land?.box) return;
    const [x0, y0, x1, y1] = land.box;
    const bw = Math.max(10, x1 - x0);
    const bh = Math.max(10, y1 - y0);
    const pad = 42;
    const k = Math.min(14, Math.max(1.15, Math.min((VB_W - pad * 2) / bw, (VB_H - pad * 2) / bh)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    tweenTo({ k, tx: VB_W / 2 - cx * k, ty: VB_H / 2 - cy * k });
  }, [selected]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = toViewBox(event.clientX, event.clientY);
      const factor = Math.exp(-event.deltaY * 0.0014);
      zoomAbout(anchor, tf.current.k * factor);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "+" || event.key === "=") zoomAbout({ x: VB_W / 2, y: VB_H / 2 }, tf.current.k * 1.35);
      if (event.key === "-" || event.key === "_") zoomAbout({ x: VB_W / 2, y: VB_H / 2 }, tf.current.k / 1.35);
      if (event.key === "0") tweenTo({ k: 1, tx: 0, ty: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function placeTip(clientX: number, clientY: number) {
    const svg = svgRef.current;
    const tip = tipRef.current;
    if (!svg || !tip) return;
    const bounds = svg.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const dx = x > bounds.width - 196 ? -176 : 14;
    const dy = y > bounds.height - 92 ? -78 : 16;
    tip.style.transform = `translate3d(${x + dx}px, ${y + dy}px, 0)`;
  }

  function hoverFromEvent(target: EventTarget | null) {
    const el = (target as Element | null)?.closest?.("[data-land]");
    if (!el) return null;
    return el.getAttribute("data-iso") ?? "";
  }

  const tipCountry = hover ? labelFor(hover) : null;
  const selectedLand = worldMap.lands.find((land) => land.iso3 === selected);

  return (
    <div className="relative h-full min-h-0 w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label={`${indicator.name}分级设色世界地图，可拖拽、滚轮缩放，点击查看经济体`}
        onPointerDown={(event) => {
          const svg = svgRef.current;
          if (!svg) return;
          svg.setPointerCapture(event.pointerId);
          const point = toViewBox(event.clientX, event.clientY);
          pointers.current.set(event.pointerId, point);
          moved.current = false;
          if (pointers.current.size === 1) {
            drag.current = { x: point.x, y: point.y, tx: tf.current.tx, ty: tf.current.ty };
            pinch.current = null;
          }
        }}
        onPointerMove={(event) => {
          placeTip(event.clientX, event.clientY);
          const nextHover = hoverFromEvent(event.target);
          if (nextHover !== hoverRef.current) {
            hoverRef.current = nextHover;
            setHover(nextHover);
          }
          const point = toViewBox(event.clientX, event.clientY);
          if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, point);
          const pts = [...pointers.current.values()];
          if (pts.length >= 2) {
            const [a, b] = pts;
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (!pinch.current) {
              const contentX = (mid.x - tf.current.tx) / tf.current.k;
              const contentY = (mid.y - tf.current.ty) / tf.current.k;
              pinch.current = { dist: Math.max(dist, 1), k: tf.current.k, contentX, contentY };
            }
            const k = pinch.current.k * (dist / pinch.current.dist);
            tf.current = clamp({
              k,
              tx: mid.x - pinch.current.contentX * Math.min(18, Math.max(1, k)),
              ty: mid.y - pinch.current.contentY * Math.min(18, Math.max(1, k)),
            });
            apply();
            moved.current = true;
            return;
          }
          if (!drag.current) return;
          const dx = point.x - drag.current.x;
          const dy = point.y - drag.current.y;
          if (Math.hypot(dx, dy) > 3) moved.current = true;
          tf.current = clamp({ k: tf.current.k, tx: drag.current.tx + dx, ty: drag.current.ty + dy });
          apply();
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          if (pointers.current.size === 0) drag.current = null;
        }}
        onPointerLeave={() => {
          hoverRef.current = null;
          setHover(null);
        }}
        onDoubleClick={(event) => {
          const anchor = toViewBox(event.clientX, event.clientY);
          zoomAbout(anchor, tf.current.k * 1.8);
        }}
        onClick={(event) => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          const iso = hoverFromEvent(event.target);
          if (iso) onSelect(iso);
        }}
      >
        <defs>
          <pattern id="land-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--color-land)" />
            <path d="M0 6 L6 0" stroke="var(--color-line)" strokeWidth="0.7" />
          </pattern>
        </defs>
        <g ref={gRef}>
          <path d={worldMap.sphere} fill="var(--color-sea)" />
          <path
            d={worldMap.graticule}
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            opacity="0.45"
          />
          {worldMap.lands.map((land, index) => {
            const step = land.iso3 ? classOf(land.iso3) : null;
            const fill = step == null ? "fill-nodata" : `fill-step-${step}`;
            const hot = Boolean(land.iso3 && hover === land.iso3);
            return (
              <path
                key={land.iso3 ?? `anon-${index}`}
                d={land.d}
                data-land=""
                data-iso={land.iso3 ?? ""}
                className={`land-path ${fill} ${hot ? "is-hot" : ""}`}
              />
            );
          })}
          {selectedLand ? <path d={selectedLand.d} className="land-stroke" /> : null}
        </g>
      </svg>

      <div
        ref={tipRef}
        className={`pointer-events-none absolute left-0 top-0 z-20 w-44 rounded-lg border border-line bg-paper px-3 py-2 shadow-float ${hover !== null ? "visible" : "invisible"}`}
      >
        {hover === null ? (
          <p className="text-xs"> </p>
        ) : tipCountry ? (
          <>
            <p className="font-serif text-base leading-tight">{tipCountry.name}</p>
            <p className="mt-1 text-sm tabular-nums">{tipCountry.value}</p>
            <p className="text-xs text-muted">{indicator.name} · {tipCountry.year}</p>
          </>
        ) : (
          <>
            <p className="font-serif text-base leading-tight">未单独统计</p>
            <p className="mt-1 text-xs text-muted">世界银行没有这条边界的单独序列</p>
          </>
        )}
      </div>

      <div className="absolute right-3 bottom-4 flex flex-col gap-2">
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper text-ink shadow-float" aria-label="放大" onClick={() => zoomAbout({ x: VB_W / 2, y: VB_H / 2 }, tf.current.k * 1.4)}>
          <Plus size={18} />
        </button>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper text-ink shadow-float" aria-label="缩小" onClick={() => zoomAbout({ x: VB_W / 2, y: VB_H / 2 }, tf.current.k / 1.4)}>
          <Minus size={18} />
        </button>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper text-ink shadow-float" aria-label="回到全图" onClick={() => tweenTo({ k: 1, tx: 0, ty: 0 })}>
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
