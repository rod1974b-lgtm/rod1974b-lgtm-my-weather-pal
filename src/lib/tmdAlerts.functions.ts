// src/lib/tmdAlerts.functions.ts
import { createServerFn } from "@tanstack/react-start";

export interface TmdAlertItem {
  id: string;
  severity: "warning" | "advisory";
  category: "storm" | "rain" | "wind" | "flood" | "cold" | "heat" | "general" | "earthquake";
  headline: string;
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

        let title = "";
        if (Array.isArray(w.TitleEnglish)) {
          const en = w.TitleEnglish.find(
            (s: any) => typeof s === "string" && /[a-zA-Z]/.test(s)
          );
          title = en || w.TitleEnglish[0] || "";
        } else if (typeof w.TitleEnglish === "string" && w.TitleEnglish.trim()) {
          title = w.TitleEnglish.trim();
        }

        if (!title && typeof w.TitleThai === "string" && w.TitleThai.trim()) {
          title = w.TitleThai.trim();
        }

        if (!title) {
          title = "Severe Weather & High Waves Advisory";
        }

        alerts.push({
          id: `tmd-${w.IssueNo || idx}-${now}`,
          severity: "warning",
          category: "storm",
          headline: `TMD Advisory: ${title}`,
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
