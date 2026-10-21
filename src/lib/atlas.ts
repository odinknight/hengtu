import atlasRaw from "@/data/atlas.json";
import mapRaw from "@/data/map.json";

export type IndicatorId =
  | "gdpCap"
  | "gdpPpp"
  | "pop"
  | "life"
  | "ghg"
  | "net"
  | "urban"
  | "growth"
  | "fertility"
  | "unemp";

export type MetricKind = "usd" | "pop" | "years" | "tons" | "pct" | "growth" | "fertility";

export type Indicator = {
  id: IndicatorId;
  name: string;
  short: string;
  unit: string;
  hint: string;
  kind: MetricKind;
};

export const INDICATORS: Indicator[] = [
  {
    id: "gdpCap",
    name: "人均 GDP",
    short: "人均 GDP",
    unit: "现价美元",
    hint: "按现价美元计算的人均国内生产总值。",
    kind: "usd",
  },
  {
    id: "gdpPpp",
    name: "人均 GDP（平价）",
    short: "平价人均",
    unit: "现价国际元",
    hint: "按购买力平价折算的人均国内生产总值。",
    kind: "usd",
  },
  {
    id: "pop",
    name: "人口",
    short: "人口",
    unit: "人",
    hint: "年中人口估计。",
    kind: "pop",
  },
  {
    id: "life",
    name: "预期寿命",
    short: "寿命",
    unit: "岁",
    hint: "出生时预期寿命。",
    kind: "years",
  },
  {
    id: "ghg",
    name: "人均温室气体",
    short: "人均排放",
    unit: "吨二氧化碳当量",
    hint: "人均温室气体排放，不含土地利用变化。",
    kind: "tons",
  },
  {
    id: "net",
    name: "互联网普及率",
    short: "互联网",
    unit: "人口比重",
    hint: "使用互联网的人口比重。各国公布年份差异较大。",
    kind: "pct",
  },
  {
    id: "urban",
    name: "城镇化率",
    short: "城镇化",
    unit: "人口比重",
    hint: "城镇人口占总人口的比重。",
    kind: "pct",
  },
  {
    id: "growth",
    name: "经济增速",
    short: "经济增速",
    unit: "实际 GDP",
    hint: "国内生产总值年增长率，按不变价计算。",
    kind: "growth",
  },
  {
    id: "fertility",
    name: "总和生育率",
    short: "生育率",
    unit: "每名妇女",
    hint: "每名妇女一生平均活产子女数。",
    kind: "fertility",
  },
  {
    id: "unemp",
    name: "失业率",
    short: "失业率",
    unit: "劳动力比重",
    hint: "失业人口占劳动力的比重，国际劳工组织模型估计。",
    kind: "pct",
  },
];

export type Point = [number, number];

export type Metric = {
  year: number;
  value: number;
  series: Point[];
};

export type Country = {
  iso3: string;
  iso2: string;
  name: string;
  nameEn: string;
  region: string;
  subregion: string;
  income: string;
  area: number | null;
  metrics: Partial<Record<IndicatorId, Metric>>;
};

export type Land = {
  iso3: string | null;
  d: string;
  box: [number, number, number, number] | null;
};

type AtlasFile = {
  source: string;
  updated: string;
  range: [number, number];
  world: Partial<Record<IndicatorId, Metric>>;
  countries: Country[];
};

type MapFile = {
  viewBox: [number, number, number, number];
  sphere: string;
  graticule: string;
  lands: Land[];
};

export const atlas = atlasRaw as AtlasFile;
export const worldMap = mapRaw as MapFile;

export const countryByIso = new Map(atlas.countries.map((c) => [c.iso3, c]));

export function indicatorById(id: IndicatorId) {
  return INDICATORS.find((item) => item.id === id) ?? INDICATORS[0];
}

function digits(n: number, d: number) {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function formatValue(kind: MetricKind, value: number) {
  switch (kind) {
    case "usd": {
      const sign = value < 0 ? "-" : "";
      const v = Math.abs(value);
      if (v >= 10000) {
        const w = v / 10000;
        const d = w >= 100 ? 0 : w >= 10 ? 1 : 2;
        return `${sign}${digits(w, d)} 万美元`;
      }
      return `${sign}${digits(v, 0)} 美元`;
    }
    case "pop": {
      if (value >= 1e8) return `${digits(value / 1e8, 2)} 亿`;
      if (value >= 1e4) {
        const w = value / 1e4;
        return `${digits(w, w >= 100 ? 0 : 1)} 万`;
      }
      return digits(value, 0);
    }
    case "years":
      return `${digits(value, 1)} 岁`;
    case "tons":
      return `${digits(value, value >= 10 ? 1 : 2)} 吨`;
    case "pct":
      return `${digits(value, 1)}%`;
    case "growth": {
      const sign = value > 0 ? "+" : "";
      return `${sign}${digits(value, 1)}%`;
    }
    case "fertility":
      return digits(value, 2);
    default:
      return digits(value, 2);
  }
}

export function formatArea(km: number | null) {
  if (km == null) return "—";
  if (km >= 10000) {
    const w = km / 10000;
    return `${w.toLocaleString("zh-CN", { maximumFractionDigits: w >= 100 ? 0 : 1 })} 万 km²`;
  }
  return `${Math.round(km).toLocaleString("zh-CN")} km²`;
}

export type Reading = {
  iso3: string;
  name: string;
  value: number;
  year: number;
};

export function readingsFor(id: IndicatorId): Reading[] {
  const rows: Reading[] = [];
  for (const country of atlas.countries) {
    const metric = country.metrics[id];
    if (!metric) continue;
    rows.push({
      iso3: country.iso3,
      name: country.name,
      value: metric.value,
      year: metric.year,
    });
  }
  return rows;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function quantileBreaks(values: number[], classes = 5) {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  if (sorted.length < 2) return breaks;
  for (let i = 1; i < classes; i++) {
    const pos = ((sorted.length - 1) * i) / classes;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    breaks.push(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
  }
  return breaks;
}

export function classIndex(value: number, breaks: number[]) {
  let index = 0;
  while (index < breaks.length && value > breaks[index]) index += 1;
  return index;
}

export function yearSummary(rows: Reading[]) {
  if (!rows.length) return "无数据";
  const counts = new Map<number, number>();
  let min = rows[0].year;
  let max = rows[0].year;
  for (const row of rows) {
    counts.set(row.year, (counts.get(row.year) ?? 0) + 1);
    if (row.year < min) min = row.year;
    if (row.year > max) max = row.year;
  }
  let mode = rows[0].year;
  let modeCount = 0;
  for (const [year, count] of counts) {
    if (count > modeCount) {
      mode = year;
      modeCount = count;
    }
  }
  if (min === max) return `${mode} 年`;
  const share = modeCount / rows.length;
  if (share >= 0.75) return `以 ${mode} 年为主`;
  return `${min}–${max} 年`;
}

