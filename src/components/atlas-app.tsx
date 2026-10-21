import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Line, LineChart, YAxis } from "recharts";
import {
  INDICATORS,
  atlas,
  classIndex,
  countryByIso,
  formatArea,
  formatValue,
  indicatorById,
  median,
  quantileBreaks,
  readingsFor,
  yearSummary,
  type Country,
  type IndicatorId,
  type Reading,
} from "@/lib/atlas";
import { WorldMap } from "@/components/world-map";

export function AtlasApp() {
  const [indicatorId, setIndicatorId] = useState<IndicatorId>("gdpCap");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState(false);
  const indicator = indicatorById(indicatorId);

  const rows = useMemo(() => readingsFor(indicatorId), [indicatorId]);
  const breaks = useMemo(() => quantileBreaks(rows.map((row) => row.value)), [rows]);
  const mid = useMemo(() => median(rows.map((row) => row.value)), [rows]);
  const ranked = useMemo(() => [...rows].sort((a, b) => b.value - a.value), [rows]);
  const years = yearSummary(rows);
  const selected = selectedId ? countryByIso.get(selectedId) ?? null : null;

  const classByIso = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.iso3, classIndex(row.value, breaks));
    return map;
  }, [rows, breaks]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setSheet(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function choose(id: string) {
    setSelectedId(id);
    setQuery("");
    setSheet(true);
  }

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return atlas.countries
      .filter((country) => {
        return (
          country.name.includes(q) ||
          country.nameEn.toLowerCase().includes(lower) ||
          country.iso3.toLowerCase().includes(lower) ||
          country.iso2.toLowerCase() === lower
        );
      })
      .slice(0, 8);
  }, [query]);

  const legend = legendRows(breaks, indicator.kind);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2 md:gap-5 md:px-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-cinnabar font-serif text-lg text-paper">衡</span>
          <div className="leading-tight">
            <h1 className="font-serif text-xl text-balance">衡图</h1>
            <p className="hidden text-xs text-muted sm:block">世界指标 · 分级设色</p>
          </div>
        </div>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索国家或地区"
            aria-label="搜索国家或地区"
            className="h-11 w-full rounded-full border border-line bg-paper-2 pr-10 pl-9 text-base outline-none focus:border-ink md:text-sm"
          />
          {query ? (
            <button type="button" aria-label="清除搜索" className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          ) : null}
          {query ? (
            <ul className="absolute top-12 z-30 w-full max-w-md overflow-hidden rounded-xl border border-line bg-paper shadow-float">
              {results.length ? (
                results.map((country) => {
                  const metric = country.metrics[indicatorId];
                  return (
                    <li key={country.iso3}>
                      <button type="button" className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-paper-2" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(country.iso3)}>
                        <span className="min-w-0">
                          <span className="block truncate">{country.name}</span>
                          <span className="block truncate text-xs text-muted">{country.nameEn}</span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-muted">
                          {metric ? formatValue(indicator.kind, metric.value) : "无数据"}
                        </span>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-3 text-sm text-muted">没有匹配的经济体</li>
              )}
            </ul>
          ) : null}
        </div>
        <p className="hidden shrink-0 text-right text-xs text-muted lg:block">
          世界银行
          <br />
          更新于 2026-10-08
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2 md:px-5">
        {INDICATORS.map((item) => {
          const active = item.id === indicatorId;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setIndicatorId(item.id)}
              className={`h-11 shrink-0 rounded-full px-3.5 text-sm ${active ? "bg-ink text-paper" : "border border-line bg-paper text-ink hover:border-ink"}`}
            >
              {item.short}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        <section className="relative min-h-0 min-w-0 flex-1">
          <WorldMap
            indicator={indicator}
            selected={selectedId}
            classOf={(iso) => classByIso.get(iso) ?? null}
            labelFor={(iso) => {
              const country = countryByIso.get(iso);
              if (!country) return null;
              const metric = country.metrics[indicatorId];
              if (!metric) return { name: country.name, value: "无数据", year: "未收录" };
              return { name: country.name, value: formatValue(indicator.kind, metric.value), year: String(metric.year) };
            }}
            onSelect={choose}
          />
          <aside className="absolute top-3 left-3 w-52 rounded-xl border border-line bg-paper p-3 shadow-float md:top-auto md:bottom-4 md:left-4 md:w-60">
            <p className="font-serif text-lg leading-tight text-balance">{indicator.name}</p>
            <p className="mt-0.5 text-xs text-muted">{indicator.unit} · 五等分位 · {years}</p>
            <ul className="mt-3 space-y-1.5">
              {legend.map((row) => (
                <li key={row.label} className="flex items-center gap-2 text-xs">
                  <span className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-line ${row.swatch}`} />
                  <span className="min-w-0 tabular-nums">{row.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs text-muted">
                <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-line" style={{ backgroundColor: "var(--color-land)", backgroundImage: "repeating-linear-gradient(-45deg, var(--color-line) 0 1px, transparent 1px 4px)" }} />
                <span>无数据</span>
              </li>
            </ul>
          </aside>
        </section>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line md:block lg:w-96">
          <Detail
            indicatorId={indicatorId}
            onIndicator={setIndicatorId}
            country={selected}
            rows={ranked}
            mid={mid}
            years={years}
            onSelect={choose}
            onClear={() => setSelectedId(null)}
          />
        </aside>
      </div>

      <div className="md:hidden">
        <button type="button" className="flex h-14 w-full items-center justify-between gap-3 border-t border-line bg-paper px-4 text-left" onClick={() => setSheet(true)}>
          <span className="min-w-0">
            <span className="block truncate font-serif text-base">{selected ? selected.name : "世界概览"}</span>
            <span className="block truncate text-xs text-muted">{indicator.name}</span>
          </span>
          <span className="shrink-0 font-serif text-lg tabular-nums">
            {selected ? heroValue(selected, indicatorId) : mid == null ? "—" : formatValue(indicator.kind, mid)}
          </span>
        </button>
        {sheet ? (
          <div className="fixed inset-0 z-40">
            <button type="button" aria-label="关闭详情" className="absolute inset-0 bg-ink/30" onClick={() => setSheet(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-paper">
              <div className="sticky top-0 flex justify-center bg-paper py-2">
                <span className="h-1 w-10 rounded-full bg-line" />
              </div>
              <Detail
                indicatorId={indicatorId}
                onIndicator={setIndicatorId}
                country={selected}
                rows={ranked}
                mid={mid}
                years={years}
                onSelect={choose}
                onClear={() => setSelectedId(null)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function heroValue(country: Country, id: IndicatorId) {
  const metric = country.metrics[id];
  if (!metric) return "无数据";
  return formatValue(indicatorById(id).kind, metric.value);
}

function legendRows(breaks: number[], kind: (typeof INDICATORS)[number]["kind"]) {
  const fmt = (value: number) => formatValue(kind, value);
  if (breaks.length < 4) {
    return [{ swatch: "bg-step-2", label: "数据不足" }];
  }
  return [
    { swatch: "bg-step-0", label: `≤ ${fmt(breaks[0])}` },
    { swatch: "bg-step-1", label: `${fmt(breaks[0])} – ${fmt(breaks[1])}` },
    { swatch: "bg-step-2", label: `${fmt(breaks[1])} – ${fmt(breaks[2])}` },
    { swatch: "bg-step-3", label: `${fmt(breaks[2])} – ${fmt(breaks[3])}` },
    { swatch: "bg-step-4", label: `> ${fmt(breaks[3])}` },
  ];
}

function Detail({
  indicatorId,
  onIndicator,
  country,
  rows,
  mid,
  years,
  onSelect,
  onClear,
}: {
  indicatorId: IndicatorId;
  onIndicator: (id: IndicatorId) => void;
  country: Country | null;
  rows: Reading[];
  mid: number | null;
  years: string;
  onSelect: (iso3: string) => void;
  onClear: () => void;
}) {
  const indicator = indicatorById(indicatorId);
  if (!country) {
    const high = rows.slice(0, 5);
    const low = rows.slice(-5).reverse();
    return (
      <div className="space-y-6 px-4 pt-2 pb-8 md:px-5 md:pt-5">
        <div>
          <p className="text-xs tracking-wide text-muted">世界概览</p>
          <h2 className="mt-1 font-serif text-3xl text-balance">{indicator.name}</h2>
          <p className="mt-2 text-sm text-pretty text-muted">{indicator.hint}</p>
        </div>
        <div>
          <p className="text-xs text-muted">中位数 · {years}</p>
          <p className="mt-1 font-serif text-4xl tabular-nums">{mid == null ? "—" : formatValue(indicator.kind, mid)}</p>
          <p className="mt-2 text-sm text-muted">{rows.length} 个经济体有数据</p>
        </div>
        <RankList title="数值较高" rows={high} kind={indicator.kind} onSelect={onSelect} />
        <RankList title="数值较低" rows={low} kind={indicator.kind} onSelect={onSelect} />
        <SourceNote />
      </div>
    );
  }

  const metric = country.metrics[indicatorId];
  const rank = metric ? rows.findIndex((row) => row.iso3 === country.iso3) + 1 : 0;
  const below = metric ? rows.filter((row) => row.value < metric.value).length : 0;
  const others = Math.max(rows.length - 1, 1);
  const aboveShare =
    below === rows.length - 1 ? 100 : Math.min(99, Math.max(1, Math.round((below / others) * 100)));
  const place = [country.region, country.subregion].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5 px-4 pt-2 pb-8 md:px-5 md:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">{place || "经济体"}</p>
          <h2 className="mt-1 font-serif text-3xl text-balance">{country.name}</h2>
          <p className="mt-1 text-sm text-muted">{country.nameEn}</p>
        </div>
        <button type="button" className="h-10 shrink-0 rounded-full border border-line px-3 text-sm" onClick={onClear}>
          概览
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {country.income ? <span className="rounded-full bg-paper-2 px-2.5 py-1">{country.income}</span> : null}
        {country.area != null ? <span className="rounded-full bg-paper-2 px-2.5 py-1 tabular-nums">{formatArea(country.area)}</span> : null}
        <span className="rounded-full bg-paper-2 px-2.5 py-1">{country.iso3}</span>
      </div>

      <div>
        <p className="text-xs text-muted">{indicator.name} · {indicator.unit}</p>
        <p className="mt-1 font-serif text-4xl tabular-nums">{metric ? formatValue(indicator.kind, metric.value) : "无数据"}</p>
        {metric ? (
          <>
            <p className="mt-2 text-sm text-muted">
              {metric.year} 年 · 第 {rank} 位 / {rows.length}
              {mid != null ? ` · 中位数 ${formatValue(indicator.kind, mid)}` : ""}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-cinnabar" style={{ width: `${aboveShare}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {below === rows.length - 1 ? "本组最高" : below === 0 ? "本组最低" : `高于 ${aboveShare}% 的经济体`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-pretty text-muted">世界银行未收录该经济体的这项指标。</p>
        )}
      </div>

      {metric && metric.series.length > 1 ? (
        <div>
          <p className="text-xs text-muted">2016–{metric.year} 走势</p>
          <Sparkline series={metric.series} />
          <div className="flex justify-between text-xs text-muted tabular-nums">
            <span>{metric.series[0][0]}</span>
            <span>{metric.series[metric.series.length - 1][0]}</span>
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs text-muted">全部指标</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {INDICATORS.map((item) => {
            const value = country.metrics[item.id];
            const active = item.id === indicatorId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onIndicator(item.id)}
                className={`rounded-lg border px-2.5 py-2 text-left ${active ? "border-cinnabar bg-cinnabar-soft" : "border-line hover:border-ink"}`}
              >
                <span className="block text-xs text-muted">{item.short}</span>
                <span className="mt-0.5 block font-serif text-base tabular-nums">{value ? formatValue(item.kind, value.value) : "—"}</span>
                <span className="block text-xs text-muted tabular-nums">{value ? value.year : "无数据"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <SourceNote />
    </div>
  );
}

function RankList({
  title,
  rows,
  kind,
  onSelect,
}: {
  title: string;
  rows: Reading[];
  kind: (typeof INDICATORS)[number]["kind"];
  onSelect: (iso3: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{title}</p>
      <ul className="mt-1">
        {rows.map((row) => (
          <li key={row.iso3}>
            <button type="button" className="flex w-full items-baseline justify-between gap-3 rounded-lg px-1 py-2 text-left hover:bg-paper-2" onClick={() => onSelect(row.iso3)}>
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="shrink-0 text-right">
                <span className="block font-serif tabular-nums">{formatValue(kind, row.value)}</span>
                <span className="block text-xs text-muted tabular-nums">{row.year}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ series }: { series: [number, number][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.round(el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const data = series.map(([year, value]) => ({ year, value }));
  return (
    <div ref={ref} className="h-16 w-full">
      {width > 0 ? (
        <LineChart width={width} height={64} data={data}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="value" stroke="var(--color-cinnabar)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      ) : null}
    </div>
  );
}

function SourceNote() {
  return (
    <p className="text-xs text-pretty text-muted">
      来源：世界银行 Open Data，数据库更新于 2026年10月8日。地图取 2016–2025 年间各国最近一次有值的年份。边界采用 Natural Earth，仅用于指标上色，不表示主权立场。
    </p>
  );
}
