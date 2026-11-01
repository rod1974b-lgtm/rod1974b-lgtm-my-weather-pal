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

const WMO_KEY_MAP: Record<number, string> = {
  0: "cond_clear",
  1: "cond_mostly_clear",
  2: "cond_partly_cloudy",
  3: "cond_overcast",
  45: "cond_fog",
  48: "cond_depositing_rime_fog",
  51: "cond_light_drizzle",
  53: "cond_moderate_drizzle",
  55: "cond_dense_drizzle",
  56: "cond_light_freezing_drizzle",
  57: "cond_dense_freezing_drizzle",
  61: "cond_slight_rain",
  63: "cond_moderate_rain",
  65: "cond_heavy_rain",
  66: "cond_light_freezing_rain",
  67: "cond_heavy_freezing_rain",
  71: "cond_slight_snow",
  73: "cond_moderate_snow",
  75: "cond_heavy_snow",
  77: "cond_snow_grains",
  80: "cond_slight_rain_showers",
  81: "cond_moderate_rain_showers",
  82: "cond_violent_rain_showers",
  85: "cond_slight_snow_showers",
  86: "cond_heavy_snow_showers",
  95: "cond_thunderstorm",
  96: "cond_thunderstorm_slight_hail",
  99: "cond_thunderstorm_heavy_hail",
};

function getConditionLabel(code: number, t: (k: string, fallback: string) => string): string {
  const key = WMO_KEY_MAP[code];
  if (key) return t(key, "Weather");
  if (code === 0) return t("cond_clear_sky", "Clear Sky");
  if (code === 1) return t("cond_mainly_clear", "Mainly Clear");
  if (code === 2) return t("cond_partly_cloudy", "Partly Cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code >= 51 && code <= 67) return t("cond_rain", "Rain");
  if (code >= 71 && code <= 77) return t("cond_snow", "Snow");
  if (code >= 80 && code <= 82) return t("cond_showers", "Showers");
  if (code >= 95) return t("cond_thunderstorm", "Thunderstorm");
  return t("cond_fair", "Fair");
}

function getUvLabel(uv: number, t: (k: string, fallback: string) => string): string {
  if (uv <= 2) return t("uv_low", "Low");
  if (uv <= 5) return t("uv_moderate", "Moderate");
  if (uv <= 7) return t("uv_high", "High");
  if (uv <= 10) return t("uv_very_high", "Very High");
  return t("uv_extreme", "Extreme");
}

function getAqiLabel(aqi: number, t: (k: string, fallback: string) => string): string {
  if (aqi <= 50) return t("aqi_good", "Good");
  if (aqi <= 100) return t("aqi_moderate", "Moderate");
  if (aqi <= 150) return t("aqi_sensitive", "Unhealthy for Sensitive Groups");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  if (aqi <= 300) return t("aqi_very_unhealthy", "Very Unhealthy");
  return t("aqi_hazardous", "Hazardous");
}

function formatTimeAgo(timestamp: number, t: (k: string, fallback: string) => string): string {
  if (!timestamp) return t("updated_just_now", "Updated just now");
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t("updated_just_now", "Updated just now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "TMD Alert": "alert_tag_tmd",
  "TMD Warning": "alert_tag_tmd",
  "Earthquake": "alert_tag_earthquake",
  "Earthquake Alert": "alert_tag_earthquake",
  "Flood Watch": "alert_tag_flood",
  "NWS Alert": "alert_tag_nws",
  "Air Quality": "alert_tag_aqi",
  "Marine Warning": "alert_tag_marine",
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
  const { t } = useTranslation();
  const w = weather || weatherProp;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [artIndex, setArtIndex] = useState(0);

  const cityStorageKey = w?.place?.name
    ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}`
    : "";

  const handleSelectBackground = (url: string) => {
    setHeroBgUrl(url);
    setIsAiGenerated(Boolean(url));
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

    // 1. Check if user selected custom art for this city
    try {
      const savedCityBg = localStorage.getItem(cityStorageKey);
      if (savedCityBg) {
        setHeroBgUrl(savedCityBg);
        setIsAiGenerated(true);
        return;
      }
    } catch {}

    // 2. Load authentic curated landmark or weather artwork
    const conditionStr = getConditionLabel(w.current.code, t as any);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );

    if (arts.length > 0) {
      setHeroBgUrl(arts[0]);
      setIsAiGenerated(true);
    } else {
      getCityWeatherBackground(
        w.place.name,
        conditionStr,
        w.current.code,
        w.current.temp,
        (loadedUrl) => {
          setHeroBgUrl(loadedUrl);
          setIsAiGenerated(true);
        },
        w.place.country,
        w.place.lat,
        w.place.lon
      ).then((res) => {
        if (res?.initialBg && !res.initialBg.startsWith("linear-gradient")) {
          setHeroBgUrl(res.initialBg);
          setIsAiGenerated(res.isAi);
        }
      }).catch(() => {});
    }
  }, [w?.place?.name, w?.current?.code, cityStorageKey]);

  if (!w) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-pulse">
        <p className="text-sm">{t("loading_forecast", "Loading local weather...")}</p>
      </div>
    );
  }

  const tempVal = Math.round(w.current.temp);
  const feelsVal = Math.round(w.current.feels);
  const conditionLabel = getConditionLabel(w.current.code, t as any);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? t("unit_mph", "mph") : t("unit_kmh", "km/h");

  const uvVal = w.current.uvIndex;
  const uvCategoryStr = getUvLabel(uvVal, t as any);

  const aqiVal = w.current.aqi;
  const aqiCategoryStr = getAqiLabel(aqiVal, t as any);

  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;

  const getClothingAdviceText = () => {
    const code = w.current.code;
    const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;

    if (code >= 95) {
      return t("wear_thunderstorm", "Severe thunderstorm nearby. Stay indoors away from windows.");
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return t("wear_rain", "Rain gear recommended. Carry a sturdy umbrella or waterproof jacket.");
    }
    if (code >= 71 && code <= 77) {
      return t("wear_snow", "Freezing temperatures and snow. Wear an insulated coat, thermal layers, and winter boots.");
    }
    if (tempC <= 5) {
      return t("wear_freezing", "Heavy winter coat, thermal innerwear, gloves, and a warm hat.");
    }
    if (tempC <= 14) {
      return t("wear_cold", "Warm jacket or fleece sweater, long trousers, and closed shoes.");
    }
    if (tempC <= 21) {
      return t("wear_mild", "Light jacket, cardigan, or hoodie. Comfortable jeans or chinos.");
    }
    if (tempC >= 32) {
      return t("wear_hot", "Ultra-light breathable fabrics, sunglasses, sun hat, and stay hydrated.");
    }
    return t("wear_casual_warm", "Comfortable t-shirt, shorts, and light footwear. Perfect for easy walking.");
  };

  const handleNextArtwork = (e: React.MouseEvent) => {
    e.stopPropagation();
    const conditionStr = getConditionLabel(w.current.code, t as any);
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

  return (
    <div className="space-y-4">
      {/* 1. DISASTER & ADVISORY ALERT TICKER */}
      <section className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {alertsToDisplay.length > 0 ? (
          <div className="flex items-center px-3 py-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>{t("active_advisories", "Active Advisories")} ({alertsToDisplay.length})</span>
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
            <span>{t("all_clear_desc", "All Clear — No active storm or disaster advisories in this area.")}</span>
          </div>
        )}
      </section>

      {/* 2. HERO WEATHER CARD (Clear, Vivid Artwork Canvas) */}
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
        {/* Subtle, translucent protective overlay so artwork remains crisp and visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                  {w.place.name}
                </h2>
                {w.place.country && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-md text-foreground/80 border border-border/50 shadow-xs">
                    {w.place.country}
                  </span>
                )}
              </div>
              <p className="inline-block text-[11px] font-medium text-foreground/80 mt-1 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md border border-border/40 shadow-xs">
                {formatTimeAgo(w.fetchedAt, t as any)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-xl bg-background/85 backdrop-blur-md border border-border/60 shadow-xs p-0.5">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/60 rounded-lg transition cursor-pointer"
                  title={t("open_art_gallery", "Open AI Art Gallery")}
                >
                  <span className="text-sm">🎨</span>
                  <span>{t("art", "Art")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextArtwork}
                  className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition border-l border-border/50 cursor-pointer"
                  title={t("next_artwork", "Next Artwork")}
                >
                  <span>↻</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 rounded-xl bg-background/85 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-foreground shadow-xs transition disabled:opacity-50 cursor-pointer"
                title={t("refresh_weather", "Refresh Weather")}
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
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground drop-shadow-sm">
                  {tempVal}
                </span>
                <span className="text-2xl font-bold text-foreground/80 drop-shadow-xs">
                  {tempUnitStr}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-block text-base font-bold text-foreground px-2.5 py-0.5 rounded-xl bg-background/75 backdrop-blur-md border border-border/40 shadow-xs">
                  {conditionLabel}
                </span>
                <span className="inline-block text-xs font-semibold text-foreground/85 px-2 py-0.5 rounded-full bg-background/75 backdrop-blur-md border border-border/40 shadow-xs">
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
              <span className="text-[11px] font-semibold text-foreground mt-1 px-2.5 py-0.5 rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-xs">
                {w.current.is_day ? t("daytime", "Day") : t("nighttime", "Night")}
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
              {t("clothing_advice_title", "What to Wear")}
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
                ? t("time_now", "Now")
                : new Date(h.time).toLocaleTimeString([], {
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
                ? t("time_today", "Today")
                : dateObj.toLocaleDateString(undefined, { weekday: "short" });

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
                    {getConditionLabel(d.code, t as any)}
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
            {t("metric_wind", "Wind")}
          </span>
          <p className="text-lg font-bold mt-1">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{speedUnitStr}</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("metric_humidity", "Humidity")}
          </span>
          <p className="text-lg font-bold mt-1">
            {w.current.humidity}%
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("metric_uv", "UV Index")}
          </span>
          <p className="text-lg font-bold mt-1">
            {uvVal} <span className="text-xs font-normal text-muted-foreground">({uvCategoryStr})</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("metric_aqi", "Air Quality")}
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
              {t("metric_sunrise", "Sunrise")}
            </span>
            <p className="text-sm font-bold mt-0.5">{w.sun.sunrise}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center gap-3">
          <span className="text-2xl">🌇</span>
          <div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("metric_sunset", "Sunset")}
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
