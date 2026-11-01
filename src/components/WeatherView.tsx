import React, { useState, useEffect } from "react";
import { type Weather, type WeatherUnit, type Place } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import { getCityWeatherBackground } from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  text: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear";
  source?: string;
  tag?: string;
  tagKey?: string;
}

interface WeatherViewProps {
  weather?: Weather;
  w?: Weather;
  unit: WeatherUnit;
  onRefresh?: () => void;
  loading?: boolean;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
  activeAlerts?: TickerAlertItem[];
}

function formatTimeAgo(timestamp?: number, t?: (k: string, d?: string) => string): string {
  if (!timestamp || isNaN(timestamp)) return "";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t ? t("updated_just_now", "Updated just now") : "Updated just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return t ? t("updated_1_min_ago", "Updated 1 min ago") : "Updated 1 min ago";
  if (diffMin < 60) return t ? t("updated_mins_ago", `Updated ${diffMin} mins ago`) : `Updated ${diffMin} mins ago`;
  const diffHours = Math.floor(diffMin / 60);
  return t ? t("updated_hours_ago", `Updated ${diffHours} hr ago`) : `Updated ${diffHours} hr ago`;
}

function getConditionLabel(code: number, t: (k: string, fallback: string) => string): string {
  if (code === 0) return t("cond_clear", "Clear Sky");
  if (code === 1) return t("cond_mainly_clear", "Mainly Clear");
  if (code === 2) return t("cond_partly_cloudy", "Partly Cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code === 45) return t("cond_fog", "Foggy");
  if (code === 48) return t("cond_rime_fog", "Icy Fog");
  if (code === 51) return t("cond_light_drizzle", "Light Drizzle");
  if (code === 53) return t("cond_drizzle", "Drizzle");
  if (code === 55) return t("cond_dense_drizzle", "Heavy Drizzle");
  if (code >= 61 && code <= 65) return t("cond_rain", "Rain");
  if (code >= 71 && code <= 77) return t("cond_snow", "Snow");
  if (code >= 80 && code <= 82) return t("cond_showers", "Showers");
  if (code >= 85 && code <= 86) return t("cond_snow_showers", "Snow Showers");
  if (code >= 95) return t("cond_thunderstorm", "Thunderstorm");
  return t("cond_unknown", "Variable");
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
  if (aqi <= 150) return t("aqi_unhealthy_sensitive", "Sensitive");
  if (aqi <= 200) return t("aqi_unhealthy", "Unhealthy");
  return t("aqi_very_unhealthy", "Hazardous");
}

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "TMD Alert": "alert_tag_tmd",
  "Flood Watch": "alert_tag_flood",
  "Earthquake": "alert_tag_earthquake",
  "Weather Warning": "alert_tag_warning",
  "Severe Thunderstorm": "alert_tag_thunderstorm",
  "Heavy Rain": "alert_tag_rain",
  "High Wind": "alert_tag_wind",
  "Poor Air Quality": "alert_tag_aqi",
  "Special Advisory": "alert_tag_advisory",
};

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: weatherProp,
  unit,
  onRefresh,
  loading = false,
  onSelectBg,
  onSelectBackground,
  activeAlerts = [],
}) => {
  const w = weather || weatherProp;
  const { t, i18n } = useTranslation();

  const [wearTab, setWearTab] = useState<"casual" | "business" | "sport">("casual");
  const [artIndex, setArtIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const cityName = w?.place?.name || "Bangkok";
  const cityStorageKey = `weather:custom-bg:${cityName.toLowerCase().trim()}`;

  const handleSelectBackground = (url: string) => {
    setHeroBgUrl(url);
    setIsAiGenerated(true);
    try {
      localStorage.setItem(cityStorageKey, url);
    } catch {}
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  useEffect(() => {
    if (!w?.place) return;
    try {
      const savedCityBg = localStorage.getItem(cityStorageKey);
      if (savedCityBg) {
        setHeroBgUrl(savedCityBg);
        setIsAiGenerated(true);
        return;
      }
    } catch {}

    setIsAiLoading(true);
    getCityWeatherBackground(w.place.name, w.current.code, w.current.temp, w.current.is_day)
      .then((art) => {
        setHeroBgUrl(art.url);
        setIsAiGenerated(art.isGenerated);
      })
      .catch(() => {
        setHeroBgUrl("");
        setIsAiGenerated(false);
      })
      .finally(() => {
        setIsAiLoading(false);
      });
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

  const aqiVal = w.current.aqi ?? 28;
  const aqiCategoryStr = getAqiLabel(aqiVal, t as any);

  const getClothingByTab = () => {
    const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
    const isRaining = w.current.code >= 51 && w.current.code <= 82;

    if (wearTab === "business") {
      if (tempC < 14) return t("wear_business_cold", "Tailored wool suit, overcoat, and leather shoes. A warm inner layer is advised.");
      if (tempC < 24) return t("wear_business_mild", "Crisp button-down shirt, blazer, and comfortable dress trousers.");
      return t("wear_business_warm", "Lightweight breathable linen/cotton shirt and light slacks.");
    }
    if (wearTab === "sport") {
      if (tempC < 14) return t("wear_sport_cold", "Thermal running tights, windbreaker jacket, and breathable moisture-wicking layers.");
      if (tempC < 24) return t("wear_sport_mild", "Lightweight joggers or running shorts with an athletic tee.");
      return t("wear_sport_warm", "Breathable performance shorts and tank top. Stay hydrated!");
    }
    if (tempC < 12) return t("wear_casual_cold", "Warm jacket or knit sweater with long pants. Keep cozy.");
    if (tempC < 22) return t("wear_casual_mild", "Comfortable hoodie or long-sleeve tee with casual jeans.");
    return t("wear_casual_warm", "Comfortable t-shirt, shorts, and light footwear. Perfect for easy walking.");
  };

  const handleNextArtwork = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = artIndex + 1;
    setArtIndex(nextIdx);
    setIsAiLoading(true);
    getCityWeatherBackground(w.place.name, w.current.code, w.current.temp, w.current.is_day, nextIdx)
      .then((art) => {
        handleSelectBackground(art.url);
      })
      .catch(() => {})
      .finally(() => setIsAiLoading(false));
  };

  return (
    <div className="space-y-4">
      {/* 1. DISASTER & ADVISORY ALERT TICKER */}
      <section className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {activeAlerts.length > 0 ? (
          <div className="flex items-center px-3 py-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>{t("active_advisories", "Active Advisories")} ({activeAlerts.length})</span>
            </span>

            <div className="overflow-hidden relative w-full flex items-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] py-0.5">
                {activeAlerts.map((alt) => {
                  const tagKey = alt.tagKey || (alt.tag ? TAG_TRANSLATION_MAP[alt.tag] : undefined);
                  const displayTag = tagKey ? t(tagKey, alt.tag || "Advisory") : alt.tag || "Advisory";

                  return (
                    <div key={alt.id} className="inline-flex items-center gap-1.5 text-xs">
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

      {/* 2. HERO WEATHER CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 p-5 shadow-lg bg-card text-card-foreground min-h-[220px]">
        {heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url(${heroBgUrl})`,
              filter: "brightness(0.92) saturate(1.05)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/25 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground drop-shadow-xs">
                  {w.place.name}
                </h2>
                {w.place.country && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/80 backdrop-blur-xs text-muted-foreground border border-border/50">
                    {w.place.country}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTimeAgo(w.fetchedAt, t as any)}
              </p>
            </div>

            {/* ART & REFRESH CONTROLS */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center rounded-full bg-background/85 backdrop-blur-md border border-border/70 p-0.5 shadow-xs text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="px-2.5 py-1 rounded-full hover:bg-muted/70 transition-colors flex items-center gap-1 text-foreground"
                  title={t("open_art_gallery", "Open AI Art Gallery")}
                >
                  <span>🎨</span>
                  <span>{t("art", "Art")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextArtwork}
                  disabled={isAiLoading}
                  className="px-1.5 py-1 rounded-full hover:bg-muted/70 transition-colors border-l border-border/50 text-foreground"
                  title={t("next_artwork", "Next Artwork")}
                >
                  <span className={isAiLoading ? "animate-spin inline-block" : ""}>↻</span>
                </button>
              </div>

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-8 w-8 rounded-full bg-background/85 backdrop-blur-md border border-border/70 flex items-center justify-center text-foreground hover:bg-muted/70 transition-colors shadow-xs"
                  title={t("refresh_forecast", "Refresh Forecast")}
                >
                  <span className={loading ? "animate-spin" : ""}>🔄</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between pt-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight text-foreground drop-shadow-xs">
                  {tempVal}
                </span>
                <span className="text-2xl font-bold text-muted-foreground">{tempUnitStr}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5 drop-shadow-xs">
                {conditionLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("feels_like", "Feels like")} {feelsVal}{tempUnitStr}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <WeatherIcon
                wmoCode={w.current.code}
                isDay={w.current.is_day ?? 1}
                className="h-16 w-16 drop-shadow-md"
              />
              <span className="text-[11px] font-medium text-muted-foreground mt-1 bg-background/70 px-2 py-0.5 rounded-full border border-border/40 backdrop-blur-xs">
                {w.current.is_day === 0 ? t("night", "Night") : t("day", "Day")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT TO WEAR ADVICE */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear")}</span>
          </h3>
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setWearTab("casual")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                wearTab === "casual" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("wear_casual", "Casual")}
            </button>
            <button
              type="button"
              onClick={() => setWearTab("business")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                wearTab === "business" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("wear_business", "Business")}
            </button>
            <button
              type="button"
              onClick={() => setWearTab("sport")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                wearTab === "sport" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("wear_sport", "Sport")}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {getClothingByTab()}
        </p>
      </section>

      {/* 4. LIVE 24-HOUR HOURLY FORECAST */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <span>🕒</span>
          <span>{t("hourly_forecast", "Hourly Forecast")}</span>
        </h3>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {w.hourly?.map((item, idx) => {
            const date = new Date(item.time);
            const hourStr =
              idx === 0
                ? t("now", "Now")
                : date.toLocaleTimeString(i18n.language || "en", { hour: "numeric" });
            const itemDesc = getConditionLabel(item.code, t as any);

            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-between min-w-[72px] p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center shrink-0"
              >
                <span className="text-[11px] font-medium text-muted-foreground">{hourStr}</span>
                <WeatherIcon
                  wmoCode={item.code}
                  isDay={item.is_day ?? 1}
                  className="h-8 w-8 my-1 drop-shadow-xs"
                />
                <span className="text-xs font-bold text-foreground">{Math.round(item.temp)}°</span>
                {item.precipProb >= 15 ? (
                  <span className="text-[10px] font-semibold text-sky-500 mt-0.5">
                    💧{item.precipProb}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[65px]">
                    {itemDesc}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7-DAY FORECAST */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs text-card-foreground">
        <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <span>📅</span>
          <span>{t("daily_forecast", "7-Day Forecast")}</span>
        </h3>

        <div className="space-y-2">
          {w.daily?.map((d, idx) => {
            const date = new Date(d.date);
            const dayName =
              idx === 0
                ? t("today", "Today")
                : date.toLocaleDateString(i18n.language || "en", { weekday: "short" });
            const dayDesc = getConditionLabel(d.code, t as any);

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/30 text-xs"
              >
                <div className="w-20 font-medium text-foreground">{dayName}</div>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <WeatherIcon wmoCode={d.code} isDay={1} className="h-6 w-6" />
                  <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">
                    {dayDesc}
                  </span>
                </div>
                <div className="w-24 text-right flex items-center justify-end gap-2 font-mono">
                  <span className="font-bold text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground">{Math.round(d.min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. KEY WEATHER METRICS */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs uppercase font-medium">{t("humidity", "Humidity")}</span>
            <span className="text-sm">💧</span>
          </div>
          <div className="text-xl font-bold text-foreground">{Math.round(w.current.humidity)}%</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {w.current.humidity > 70 ? t("humid", "Humid") : t("comfortable", "Comfortable")}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs uppercase font-medium">{t("wind", "Wind")}</span>
            <span className="text-sm">💨</span>
          </div>
          <div className="text-xl font-bold text-foreground">
            {Math.round(w.current.wind)} <span className="text-xs font-normal text-muted-foreground">{speedUnitStr}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {w.current.wind > 20 ? t("breezy", "Breezy") : t("calm", "Calm")}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs uppercase font-medium">{t("uv_index", "UV Index")}</span>
            <span className="text-sm">☀️</span>
          </div>
          <div className="text-xl font-bold text-foreground">{uvVal}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{uvCategoryStr}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs uppercase font-medium">{t("aqi", "Air Quality")}</span>
            <span className="text-sm">🍃</span>
          </div>
          <div className="text-xl font-bold text-foreground">{aqiVal}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{aqiCategoryStr}</p>
        </div>
      </section>

      {/* 7. SUNRISE & SUNSET */}
      <section className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs text-card-foreground flex items-center justify-around text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌅</span>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-medium">{t("sunrise", "Sunrise")}</span>
            <span className="font-bold text-foreground">{w.sun?.sunrise || "--:--"}</span>
          </div>
        </div>
        <div className="h-6 w-px bg-border/60" />
        <div className="flex items-center gap-2">
          <span className="text-xl">🌇</span>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-medium">{t("sunset", "Sunset")}</span>
            <span className="font-bold text-foreground">{w.sun?.sunset || "--:--"}</span>
          </div>
        </div>
      </section>

      {/* AI GALLERY MODAL */}
      <AiGalleryModal
        open={galleryOpen}
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
