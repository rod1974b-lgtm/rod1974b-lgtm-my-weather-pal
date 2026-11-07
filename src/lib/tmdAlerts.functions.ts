// src/lib/tmdAlerts.functions.ts
import { createServerFn } from "@tanstack/react-start";

export interface TmdAlertItem {
  id: string;
  severity: "warning" | "advisory";
  category: "storm" | "rain" | "wind" | "flood" | "cold" | "heat" | "general" | "earthquake";
  headline: string;
  headlineTh?: string;
  headlineEn?: string;
  tag?: string;
  tagKey?: string;
  source: string;
  timeAgo?: string;
}

export const getTmdAlertsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<TmdAlertItem[]> => {
    try {
      const res = await fetch(
        "https://data.tmd.go.th/api/WeatherWarningNews/v2/?uid=demo&ukey=demokey&format=json",
        {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (!res.ok) return [];

      const data: any = await res.json();
      const rawList = Array.isArray(data.Warning)
        ? data.Warning
        : data.Warning && typeof data.Warning === "object" && Object.keys(data.Warning).length > 0
        ? [data.Warning]
        : Array.isArray(data.Warnings)
        ? data.Warnings
        : Array.isArray(data.WarningNews)
        ? data.WarningNews
        : [];

      const now = Date.now();
      const alerts: TmdAlertItem[] = [];

      for (let idx = 0; idx < Math.min(rawList.length, 3); idx++) {
        const w = rawList[idx];
        if (!w) continue;

        let titleEn = "";
        if (Array.isArray(w.TitleEnglish)) {
          const en = w.TitleEnglish.find(
            (s: any) => typeof s === "string" && /[a-zA-Z]/.test(s)
          );
          titleEn = en || w.TitleEnglish[0] || "";
        } else if (typeof w.TitleEnglish === "string" && w.TitleEnglish.trim()) {
          titleEn = w.TitleEnglish.trim();
        }

        let titleTh = "";
        if (typeof w.TitleThai === "string" && w.TitleThai.trim()) {
          titleTh = w.TitleThai.trim();
        } else if (Array.isArray(w.TitleThai)) {
          titleTh = w.TitleThai[0] || "";
        }

        const fallback = titleEn || titleTh || "Severe Weather & High Waves Advisory";

        alerts.push({
          id: `tmd-${w.IssueNo || idx}-${now}`,
          severity: "warning",
          category: "storm",
          tag: "TMD Advisory",
          tagKey: "alert_advisory",
          headline: titleEn || titleTh || fallback,
          headlineEn: titleEn ? `TMD Advisory: ${titleEn}` : fallback,
          headlineTh: titleTh ? `ประกาศเตือนภัย: ${titleTh}` : fallback,
          source: "TMD",
          timeAgo: "Active",
        });
      }

      return alerts;
    } catch (err) {
      console.warn("TMD server fetch failed:", err);
      return [];
    }
  }
);
