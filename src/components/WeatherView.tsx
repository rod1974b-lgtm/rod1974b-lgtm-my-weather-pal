// src/components/WeatherView.tsx
import React, { useState, useEffect } from "react";
import { type Weather, type WeatherUnit, type Place } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  text: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear";
  tag?: string;
  tagKey?: string;
}

interface WeatherViewProps {
  weather?: Weather | null;
  w?: Weather | null;
  activeAlerts?: TickerAlertItem[];
  disasters?: TickerAlertItem[];
  unit: WeatherUnit;
  loading: boolean;
  onRefresh: () => void;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
}

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_fog", fallback: "Fog" },
  51: { key: "cond_drizzle", fallback: "Drizzle" },
  53: { key: "cond_drizzle", fallback: "Drizzle" },
  55: { key: "cond_drizzle", fallback: "Drizzle" },
  56: { key: "cond_drizzle", fallback: "Drizzle" },
  57: { key: "cond_drizzle", fallback: "Drizzle" },
  61: { key: "cond_rain", fallback: "Rain" },
  63: { key: "cond_rain", fallback: "Rain" },
  65: { key: "cond_heavy_rain", fallback: "Heavy rain" },
  66: { key: "cond_heavy_rain", fallback: "Freezing rain" },
  67: { key: "cond_heavy_rain", fallback: "Heavy freezing rain" },
  71: { key: "cond_snow", fallback: "Snow" },
  73: { key: "cond_snow", fallback: "Snow" },
  75: { key: "cond_snow", fallback: "Heavy snow" },
  77: { key: "cond_snow", fallback: "Snow grains" },
  80: { key: "cond_showers", fallback: "Showers" },
  81: { key: "cond_showers", fallback: "Showers" },
  82: { key: "cond_showers", fallback: "Heavy showers" },
  85: { key: "cond_snow_showers", fallback: "Snow showers" },
  86: { key: "cond_snow_showers", fallback: "Heavy snow showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm", fallback: "Thunderstorm with hail" },
  99: { key: "cond_thunderstorm", fallback: "Severe thunderstorm" },
};

function getConditionLabel(code: number, t: (k: string, fallback?: string) => string): string {
  const item = WMO_KEY_MAP[code];
  if (item) return t(item.key, item.fallback);
  if (code <= 2) return t("cond_partly_cloudy", "Partly cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code <= 48) return t("cond_fog", "Fog");
  if (code <= 57) return t("cond_drizzle", "Drizzle");
  if (code <= 67) return t("cond_rain", "Rain");
  if (code <= 77) return t("cond_snow", "Snow");
  if (code <= 82) return t("cond_showers", "Showers");
  if (code <= 86) return t("cond_snow_showers", "Snow showers");
  return t("cond_thunderstorm", "Thunderstorm");
}

function getUvLabel(uv: number, t: (k: string, fallback?: string) => string): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

function getAqiLabel(aqi: number | undefined, t: (k: string, fallback?: string) => string): string {
  if (aqi === undefined) return "—";
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_sensitive", "Sensitive");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  if (aqi <= 300) return t("aqi_very_unhealthy", "Very Unhealthy");
  return t("aqi_unhealthy", "Hazardous");
}

function formatTimeAgo(timestamp: number, t: (k: string, fallback?: string) => string): string {
  if (!timestamp) return t("updated_now", "Updated just now");
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t("updated_now", "Updated just now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${t("ago", "ago")}`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ${t("ago", "ago")}`;
}

const DAY_LABELS: Record<string, string> = {
  en: "Day", th: "กลางวัน", es: "Día", ja: "昼", zh: "白天", hi: "दिन",
  fr: "Jour", de: "Tag", pt: "Dia", ru: "День", ar: "نهار", ko: "낮", id: "Siang", vi: "Ngày",
};

const NIGHT_LABELS: Record<string, string> = {
  en: "Night", th: "กลางคืน", es: "Noche", ja: "夜", zh: "夜晚", hi: "रात",
  fr: "Nuit", de: "Nacht", pt: "Noite", ru: "Ночь", ar: "ليل", ko: "밤", id: "Malam", vi: "Đêm",
};

const SPEED_UNITS: Record<string, { imperial: string; metric: string }> = {
  en: { imperial: "mph", metric: "km/h" },
  th: { imperial: "ไมล์/ชม.", metric: "กม./ชม." },
  es: { imperial: "mph", metric: "km/h" },
  ja: { imperial: "mph", metric: "km/h" },
  zh: { imperial: "英里/小时", metric: "公里/小时" },
  hi: { imperial: "मील/घंटे", metric: "किमी/घंटे" },
  fr: { imperial: "mph", metric: "km/h" },
  de: { imperial: "mph", metric: "km/h" },
  pt: { imperial: "mph", metric: "km/h" },
  ru: { imperial: "миль/ч", metric: "км/ч" },
  ar: { imperial: "ميل/س", metric: "كم/س" },
  ko: { imperial: "mph", metric: "km/h" },
  id: { imperial: "mph", metric: "km/jam" },
  vi: { imperial: "dặm/h", metric: "km/h" },
};

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "TMD Alert": "alert_thunderstorm_tag",
  "TMD Warning": "alert_thunderstorm_tag",
  "Earthquake": "alert_earthquake_tag",
  "Earthquake Alert": "alert_earthquake_tag",
  "Flood Watch": "alert_flood_tag",
  "NWS Alert": "alert_hazard",
  "Air Quality": "air_quality",
  "Marine Warning": "alert_advisory",
};

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: weatherProp,
  activeAlerts = [],
  disasters = [],
  unit,
  loading,
  onRefresh,
  onSelectBg,
  onSelectBackground,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.toLowerCase().split("-")[0] || "en";
  const w = weather || weatherProp;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [artIndex, setArtIndex] = useState(0);
  const [isDarkArtwork, setIsDarkArtwork] = useState<boolean>(false);

  const cityStorageKey = w?.place?.name
    ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}`
    : "";

  // Auto-detect whether the hero background picture is dark or light
  useEffect(() => {
    if (!heroBgUrl) {
      setIsDarkArtwork(!w?.current?.is_day);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = heroBgUrl;

    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalLum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }
        const avgLum = totalLum / count;
        // Below 135 luminance means dark background -> switch City & Temp text to white
        setIsDarkArtwork(avgLum < 135);
      } catch {
        // If CORS restricts canvas pixel reading, fall back to day/night condition
        setIsDarkArtwork(!w?.current?.is_day);
      }
    };

    img.onerror = () => {
      if (!active) return;
      setIsDarkArtwork(!w?.current?.is_day);
    };

    return () => {
      active = false;
    };
  }, [heroBgUrl, w?.current?.is_day]);

  const handleSelectBackground = (url: string) => {
    setHeroBgUrl(url);
    if (cityStorageKey) {
      try {
        if (url) {
          localStorage.setItem(cityStorageKey, url);
        } else {
          localStorage.removeItem(cityStorageKey);
        }
      } catch {}
    }
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  useEffect(() => {
    if (!w?.place) return;

    try {
      const savedCityBg = localStorage.getItem(cityStorageKey);
      if (savedCityBg) {
        setHeroBgUrl(savedCityBg);
        return;
      }
    } catch {}

    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );

    const firstArt = arts[0];
    if (firstArt) {
      setHeroBgUrl(firstArt);
    } else {
      getCityWeatherBackground(
        w.place.name,
        conditionStr,
        w.current.code,
        w.current.temp,
        (loadedUrl) => {
          setHeroBgUrl(loadedUrl);
        },
        w.place.country,
        w.place.lat,
        w.place.lon
      ).then((res) => {
        if (res?.initialBg && !res.initialBg.startsWith("linear-gradient")) {
          setHeroBgUrl(res.initialBg);
        }
      }).catch(() => {});
    }
  }, [w?.place?.name, w?.current?.code, cityStorageKey]);

  if (!w) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-pulse">
        <p className="text-sm">{t("search_placeholder", "Loading local weather...")}</p>
      </div>
    );
  }

  const tempVal = Math.round(w.current.temp);
  const feelsVal = Math.round(w.current.feels);
  const conditionLabel = getConditionLabel(w.current.code, t);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";

  const speedUnits = SPEED_UNITS[lang] || SPEED_UNITS.en;
  const speedUnitStr = unit === "imperial" ? speedUnits.imperial : speedUnits.metric;

  const uvVal = w.current.uvIndex;
  const uvCategoryStr = getUvLabel(uvVal, t);

  const aqiVal = w.current.aqi;
  const aqiCategoryStr = getAqiLabel(aqiVal, t);

  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;

  const dayLabel = (w.current.is_day ? DAY_LABELS[lang] : NIGHT_LABELS[lang]) || (w.current.is_day ? "Day" : "Night");

  const getClothingAdviceText = () => {
    const code = w.current.code;
    const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;

    if (code >= 95 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return t("wear_umbrella", "Carry a sturdy umbrella or waterproof shell.");
    }
    if (tempC <= 5 || (code >= 71 && code <= 77)) {
      return t("wear_heavy_coat", "Heavy thermal coat, insulated scarf, and gloves recommended.");
    }
    if (tempC <= 14) {
      return t("wear_jacket", "A warm jacket, cozy knitwear, or windbreaker is ideal.");
    }
    if (tempC <= 21) {
      return t("wear_mild", "Comfortable layers, long sleeves, or a casual light cardigan.");
    }
    return t("wear_light", "Lightweight breathable fabrics, sunglasses, and sun protection.");
  };

  const handleNextArtwork = (e: React.MouseEvent) => {
    e.stopPropagation();
    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );
    if (arts.length === 0) return;

    const nextIdx = (artIndex + 1) % arts.length;
    setArtIndex(nextIdx);
    const nextUrl = arts[nextIdx];
    if (nextUrl) {
      handleSelectBackground(nextUrl);
    }
  };

  // Dynamic contrast classes based on artwork brightness
  const cityTextColor = isDarkArtwork
    ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
    : "text-slate-900 drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]";

  const tempTextColor = isDarkArtwork
    ? "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
    : "text-slate-900 drop-shadow-[0_1px_4px_rgba(255,255,255,0.95)]";

  const tempUnitColor = isDarkArtwork
    ? "text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
    : "text-slate-800 drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]";

  const pillGlassBg = isDarkArtwork
    ? "bg-black/50 text-white border-white/20"
    : "bg-white/80 text-slate-800 border-slate-300/60";

  const actionBtnGlassBg = isDarkArtwork
    ? "bg-black/50 text-white border-white/25 hover:bg-black/65"
    : "bg-white/85 text-slate-800 border-slate-300/70 hover:bg-white";

  return (
    <div className="space-y-4">
      {/* 1. DISASTER & ADVISORY ALERT TICKER */}
      <section className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {alertsToDisplay.length > 0 ? (
          <div className="flex items-center px-3 py-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>{t("alerts", "Weather Alerts")} ({alertsToDisplay.length})</span>
            </span>

            <div className="overflow-hidden relative w-full flex items-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] py-0.5">
                {alertsToDisplay.map((alt) => {
                  const tagKey = alt.tagKey || (alt.tag ? TAG_TRANSLATION_MAP[alt.tag] : undefined);
                  const displayTag = tagKey ? t(tagKey, alt.tag || "Advisory") : alt.tag || "Advisory";

                  return (
                    <div key={alt.id} className="inline-flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {displayTag}
                      </span>
                      <span>{alt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>{t("all_clear", "ALL CLEAR")} — {t("all_clear_sub", "No severe weather watches active in this region")}</span>
          </div>
        )}
      </section>

      {/* 2. HERO WEATHER CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 p-5 shadow-lg bg-card text-card-foreground min-h-[260px] flex flex-col justify-between">
        {heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url(${heroBgUrl})`,
              filter: "brightness(0.98) saturate(1.1)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight transition-colors duration-300 ${cityTextColor}`}>
                  {w.place.name}
                </h2>
                {w.place.country && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border shadow-xs transition-colors duration-300 ${pillGlassBg}`}>
                    {w.place.country}
                  </span>
                )}
              </div>
              <p className={`inline-block text-[11px] font-medium mt-1 px-2 py-0.5 rounded-full backdrop-blur-md border shadow-xs transition-colors duration-300 ${pillGlassBg}`}>
                {formatTimeAgo(w.fetchedAt, t)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center rounded-xl backdrop-blur-md border shadow-xs p-0.5 transition-colors duration-300 ${actionBtnGlassBg}`}>
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold hover:opacity-80 rounded-lg transition cursor-pointer"
                  title={t("art_gallery", "AI Gallery")}
                >
                  <span className="text-sm">🎨</span>
                  <span>{t("art", "Art")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextArtwork}
                  className="px-2 py-1 text-xs font-medium hover:opacity-80 rounded-lg transition border-l border-current/20 cursor-pointer"
                  title={t("next_art", "Next Artwork")}
                >
                  <span>↻</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className={`p-1.5 rounded-xl backdrop-blur-md border shadow-xs transition disabled:opacity-50 cursor-pointer ${actionBtnGlassBg}`}
                title={t("refresh", "Refresh forecast")}
              >
                <span className={`inline-block text-sm ${loading ? "animate-spin" : ""}`}>
                  🔄
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between pt-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl sm:text-6xl font-extrabold tracking-tighter transition-colors duration-300 ${tempTextColor}`}>
                  {tempVal}
                </span>
                <span className={`text-2xl font-bold transition-colors duration-300 ${tempUnitColor}`}>
                  {tempUnitStr}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-block text-base font-bold px-2.5 py-0.5 rounded-xl backdrop-blur-md border shadow-xs transition-colors duration-300 ${pillGlassBg}`}>
                  {conditionLabel}
                </span>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border shadow-xs transition-colors duration-300 ${pillGlassBg}`}>
                  {t("feels_like", "Feels like")} {feelsVal}{tempUnitStr}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.is_day}
                className="w-18 h-18 sm:w-20 sm:h-20 drop-shadow-lg"
              />
              <span className={`text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full backdrop-blur-md border shadow-xs transition-colors duration-300 ${pillGlassBg}`}>
                {dayLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR RECOMMENDATION */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">👕</span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("what_to_wear", "What to Wear Today")}
            </h3>
            <p className="text-sm font-medium mt-1 leading-snug">
              {getClothingAdviceText()}
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOURLY FORECAST (24 Hours Rolling from Now) */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("hourly_forecast", "Hourly Forecast")}
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {w.hourly.map((h, i) => {
            const timeLabel =
              i === 0
                ? t("now", "Now")
                : new Date(h.time).toLocaleTimeString(lang, {
                    hour: "numeric",
                    minute: "2-digit",
                  });

            return (
              <div
                key={h.time}
                className="flex flex-col items-center justify-between min-w-[72px] p-2.5 rounded-xl bg-muted/40 border border-border/40 shrink-0 snap-start text-center"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {timeLabel}
                </span>
                <WeatherIcon
                  code={h.code}
                  isDay={h.is_day ?? 1}
                  className="w-8 h-8 my-2"
                />
                <span className="text-sm font-bold">
                  {Math.round(h.temp)}°
                </span>
                {h.precipProb !== undefined && h.precipProb >= 15 && (
                  <span className="text-[10px] font-semibold text-blue-500 mt-1">
                    💧{h.precipProb}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7-DAY EXTENDED FORECAST */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("daily_forecast", "7-Day Forecast")}
        </h3>
        <div className="space-y-2">
          {w.daily.map((d, i) => {
            const dateObj = new Date(d.date + "T12:00:00");
            const dayName =
              i === 0
                ? t("today", "Today")
                : dateObj.toLocaleDateString(lang, { weekday: "short" });

            return (
              <div
                key={d.date}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition text-sm"
              >
                <div className="w-20 font-medium">
                  {dayName}
                </div>
                <div className="flex items-center gap-2">
                  <WeatherIcon code={d.code} isDay={1} className="w-6 h-6" />
                  <span className="text-xs text-muted-foreground hidden sm:inline w-28 truncate">
                    {getConditionLabel(d.code, t)}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground/60 text-xs">/</span>
                  <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. KEY METRICS GRID */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("wind", "Wind")}
          </span>
          <p className="text-lg font-bold mt-1">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{speedUnitStr}</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("humidity", "Humidity")}
          </span>
          <p className="text-lg font-bold mt-1">
            {w.current.humidity}%
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("uv_index", "UV Index")}
          </span>
          <p className="text-lg font-bold mt-1">
            {uvVal} <span className="text-xs font-normal text-muted-foreground">({uvCategoryStr})</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("air_quality", "Air Quality")}
          </span>
          <p className="text-lg font-bold mt-1">
            {aqiVal} <span className="text-xs font-normal text-muted-foreground">({aqiCategoryStr})</span>
          </p>
        </div>
      </section>

      {/* 7. SUNRISE & SUNSET */}
      <section className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center gap-3">
          <span className="text-2xl">🌅</span>
          <div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("sunrise", "Sunrise")}
            </span>
            <p className="text-sm font-bold mt-0.5">{w.sun.sunrise}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center gap-3">
          <span className="text-2xl">🌇</span>
          <div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("sunset", "Sunset")}
            </span>
            <p className="text-sm font-bold mt-0.5">{w.sun.sunset}</p>
          </div>
        </div>
      </section>

      {/* AI GALLERY MODAL */}
      <AiGalleryModal
        open={galleryOpen}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        cityName={w.place.name}
        weatherCode={w.current.code}
        currentTemp={w.current.temp}
        isDay={w.current.is_day}
        onSelectBg={handleSelectBackground}
        onSelectBackground={handleSelectBackground}
      />
    </div>
  );
};

export default WeatherView;
