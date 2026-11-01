// src/routes/index.tsx
import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  type Place,
  type WeatherUnit,
  searchCity,
  getWeather,
  loadUnitPref,
  saveUnitPref,
  loadFavorites,
  saveFavorites,
  isSamePlace,
  isFavorite,
  skyKey,
  describe,
} from "@/lib/weather";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "My Weather Pal — Private, Art-Infused Forecasts",
    meta: [
      {
        name: "description",
        content: "Minimalist, account-free weather app featuring curated AI watercolor backgrounds and live meteorological advisories.",
      },
      { property: "og:title", content: "My Weather Pal — Private Weather" },
      {
        property: "og:description",
        content: "Hyperlocal weather forecasts paired with custom AI watercolor art.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_PLACE: Place = {
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

// Fetch USGS Significant Earthquakes (M4.5+ within 1,200km)
async function fetchUSGSEarthquakes(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = data?.features || [];
    const nearby: TickerAlertItem[] = [];

    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const eqLon = coords[0];
      const eqLat = coords[1];
      const mag = f.properties?.mag ?? 0;
      const placeName = f.properties?.place ?? "Regional epicenter";

      const dLat = ((eqLat - lat) * Math.PI) / 180;
      const dLon = ((eqLon - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((eqLat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distKm <= 1200) {
        nearby.push({
          id: `eq-${f.id}`,
          text: `USGS Seismic Bulletin: M${mag.toFixed(1)} earthquake recorded ~${Math.round(distKm)}km away (${placeName}).`,
          severity: "disaster",
          tag: "Earthquake Alert",
          tagKey: "alert_tag_earthquake",
        });
      }
    }
    return nearby;
  } catch {
    return [];
  }
}

// Fetch US National Weather Service alerts
async function fetchNWSAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        headers: { "User-Agent": "MyWeatherPal/1.0 (rod1974b@gmail.com)" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = data?.features || [];

    return features.map((f: any) => ({
      id: `nws-${f.id || Math.random()}`,
      text: `NWS Alert: ${f.properties?.headline || f.properties?.event || "Active Severe Weather Warning"}`,
      severity: "disaster",
      tag: f.properties?.event || "NWS Watch",
      tagKey: "alert_tag_nws",
    }));
  } catch {
    return [];
  }
}

// Fetch TMD Warnings (Thailand)
async function fetchTMDWarnings(country?: string): Promise<TickerAlertItem[]> {
  if (!country || !country.toLowerCase().includes("thailand")) return [];
  try {
    const res = await fetch("https://data.tmd.go.th/api/WeatherWarning/v2/?uid=api&ukey=api&format=json", {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const warnings = data?.warningnews || [];
    if (warnings.length > 0) {
      const top = warnings[0];
      return [
        {
          id: `tmd-${top.id || 1}`,
          text: `TMD Warning: ${top.title || "Monsoon & Heavy Rain Warning for Thailand"}`,
          severity: "disaster",
          tag: "TMD Alert",
          tagKey: "alert_tag_tmd",
        },
      ];
    }
  } catch {}
  return [];
}

// Fetch Open-Meteo Flood/River discharge anomaly
async function fetchRiverDischargeAlert(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=river_discharge,river_discharge_mean&forecast_days=3`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const daily = data?.daily;
    if (!daily || !daily.river_discharge || !daily.river_discharge_mean) return [];

    const todayDischarge = daily.river_discharge[0] ?? 0;
    const meanDischarge = daily.river_discharge_mean[0] ?? 1;

    if (meanDischarge > 10 && todayDischarge > meanDischarge * 2.5) {
      return [
        {
          id: `flood-river-${lat}-${lon}`,
          text: `Hydrological Alert: Local river discharge is elevated (${todayDischarge.toFixed(0)} m³/s, normal ~${meanDischarge.toFixed(0)} m³/s). River basin flood watch in effect.`,
          severity: "disaster",
          tag: "Flood Watch",
          tagKey: "alert_tag_flood",
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

// Derive meteorological advisories
function deriveLocalWeatherAlerts(w: Weather): TickerAlertItem[] {
  const alerts: TickerAlertItem[] = [];
  const code = w.current.code;
  const wind = w.current.wind;
  const gust = wind;
  const aqi = w.current.aqi ?? 0;
  const isImperial = w.unit === "imperial";

  if (code >= 95) {
    alerts.push({
      id: "alert-storm",
      text: "Severe Thunderstorm Warning: Cloud-to-ground lightning, high turbulence and sudden downdrafts expected in this cell.",
      severity: "disaster",
      tag: "Severe Thunderstorm",
      tagKey: "alert_tag_thunderstorm",
    });
  } else if (code === 65 || code === 67 || code === 82) {
    alerts.push({
      id: "alert-heavy-rain",
      text: "Heavy Rainfall Watch: Localized runoff, reduced highway visibility and ponding water possible.",
      severity: "disaster",
      tag: "Heavy Rain",
      tagKey: "alert_tag_heavy_rain",
    });
  }

  const highWindThreshold = isImperial ? 28 : 45;
  if (gust >= highWindThreshold) {
    alerts.push({
      id: "alert-wind",
      text: `High Wind Advisory: Wind gusts clocked up to ${Math.round(gust)} ${isImperial ? "mph" : "km/h"}. Secure loose outdoor items.`,
      severity: "warning",
      tag: "Wind Advisory",
      tagKey: "alert_tag_wind",
    });
  }

  if (aqi >= 150) {
    alerts.push({
      id: "alert-aqi",
      text: `Air Quality Advisory: Elevated particulate levels (AQI ${aqi}). Sensitive groups should avoid prolonged outdoor exposure.`,
      severity: "warning",
      tag: "Air Quality Alert",
      tagKey: "alert_tag_aqi",
    });
  }

  return alerts;
}

function Index() {
  const { t } = useTranslation();

  // Core state
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Disaster Ticker Items
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);

  // Search input state
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Modals & active custom background
  const [, setShowLocDialog] = useState(false);
  const [showAiGallery, setShowAiGallery] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  // Sky background override preference
  const [skyPref, setSkyPref] = useState<string>(() => {
    try {
      return localStorage.getItem("weather:sky-pref") || "auto";
    } catch {
      return "auto";
    }
  });

  // Listen to sky switcher events
  useEffect(() => {
    const handleSkyChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSkyPref(customEvent.detail);
      }
    };
    window.addEventListener("weather:sky-change", handleSkyChange);
    return () => window.removeEventListener("weather:sky-change", handleSkyChange);
  }, []);

  // Compute active sky background
  const activeSky =
    skyPref !== "auto"
      ? skyPref
      : weather
      ? skyKey(weather.current.code, weather.current.is_day)
      : "clear-day";

  // Synchronize .dark mode class on root element
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDarkSky =
      activeSky === "clear-night" ||
      activeSky === "cloudy-night" ||
      activeSky === "storm";

    if (isDarkSky) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [activeSky]);

  // Load preferences and favorites on mount
  useEffect(() => {
    try {
      const savedUnit = loadUnitPref();
      if (savedUnit) setUnit(savedUnit);

      const favs = loadFavorites();
      if (favs && favs.length > 0 && favs[0]) {
        setFavorites(favs);
        setPlace(favs[0]);
      }
    } catch {}
  }, []);

  // Restore saved artwork for the current city
  useEffect(() => {
    if (weather?.place?.name) {
      try {
        const saved = localStorage.getItem(`weather:custom-bg:${weather.place.name.toLowerCase().trim()}`);
        setCustomBgUrl(saved || null);
      } catch {
        setCustomBgUrl(null);
      }
    }
  }, [weather?.place?.name]);

  // Handler for custom background selection & persistence
  const handleSelectCustomBg = (url: string | null) => {
    setCustomBgUrl(url);
    if (weather?.place?.name) {
      try {
        const key = `weather:custom-bg:${weather.place.name.toLowerCase().trim()}`;
        if (url) {
          localStorage.setItem(key, url);
        } else {
          localStorage.removeItem(key);
        }
      } catch {}
    }
  };

  // Fetch live weather data on place/unit change + auto-refresh every 10 min & on tab visibility
  useEffect(() => {
    let cancelled = false;

    const loadWeatherData = (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      getWeather(place, unit)
        .then((data) => {
          if (!cancelled) {
            setWeather(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            if (!silent) setError(err?.message || "Failed to load weather");
            setLoading(false);
          }
        });
    };

    loadWeatherData(false);

    // Auto-refresh interval (10 minutes) to keep live hourly forecast and weather updated
    const interval = setInterval(() => {
      loadWeatherData(true);
    }, 10 * 60 * 1000);

    // Re-check when user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadWeatherData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [place, unit]);

  // Fetch real-time disasters and advisories
  useEffect(() => {
    let cancelled = false;

    async function loadDisasters() {
      const results = await Promise.allSettled([
        fetchUSGSEarthquakes(place.lat, place.lon),
        fetchNWSAlerts(place.lat, place.lon),
        fetchTMDWarnings(place.country),
        fetchRiverDischargeAlert(place.lat, place.lon),
      ]);

      if (cancelled) return;

      const combined: TickerAlertItem[] = [];
      for (const res of results) {
        if (res.status === "fulfilled") {
          combined.push(...res.value);
        }
      }

      if (weather) {
        combined.push(...deriveLocalWeatherAlerts(weather));
      }

      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      setAlerts(unique);
    }

    loadDisasters();

    return () => {
      cancelled = true;
    };
  }, [place, weather]);

  // Debounced search for cities
  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      searchCity(q)
        .then((items) => {
          setSuggestions(items || []);
          setSearching(false);
        })
        .catch(() => {
          setSuggestions([]);
          setSearching(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [q]);

  // Geolocation handler
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let detectedName = "My Location";

        try {
          const revRes = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const feat = revData?.features?.[0]?.properties;
            if (feat) {
              detectedName = feat.city || feat.name || feat.county || detectedName;
            }
          }
        } catch {}

        setPlace({
          name: detectedName,
          lat,
          lon,
        });
        setShowLocDialog(false);
      },
      () => {
        alert("Unable to retrieve your location");
      },
      { timeout: 8000 }
    );
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    let next: Place[];
    if (isFavorite(place, favorites)) {
      next = favorites.filter((f) => !isSamePlace(f, place));
    } else {
      next = [place, ...favorites.slice(0, 7)];
    }
    setFavorites(next);
    saveFavorites(next);
  };

  // Refresh current forecast
  const handleRefresh = () => {
    setLoading(true);
    getWeather(place, unit)
      .then((data) => {
        setWeather(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load weather");
        setLoading(false);
      });
  };

  // Search submit
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0 && suggestions[0]) {
      setPlace(suggestions[0]);
      setQ("");
      setSearchOpen(false);
    }
  };

  return (
    <div className={`min-h-screen text-foreground sky sky-${activeSky} transition-colors duration-500`}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none select-none">🌦️</span>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-foreground">
                {t("app_title", "My Weather Pal")}
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground leading-none">
                {t("app_tagline", "Private • Accurate • Curated Art")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiGallery(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-muted transition-colors cursor-pointer"
            >
              <span>✨</span>
              <span className="hidden sm:inline">{t("art_gallery", "AI Gallery")}</span>
            </button>
            <LanguageSelector />
            <AppMenu
              unit={unit}
              onUnitChange={(u) => {
                setUnit(u);
                saveUnitPref(u);
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 space-y-4">
        {/* Search & Location Bar */}
        <section className="relative">
          <form onSubmit={onSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder={t("search_placeholder", "Search city or landmark...")}
              className="w-full rounded-2xl border border-border/80 bg-card/90 px-4 py-2.5 pr-20 text-sm shadow-xs backdrop-blur-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all text-card-foreground"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="submit"
                aria-label="Search"
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                🔍
              </button>
              <button
                type="button"
                onClick={handleUseLocation}
                title={t("use_my_location", "Use GPS Location")}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                📍
              </button>
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          {searchOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-lg">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lon}-${idx}`}
                  type="button"
                  onClick={() => {
                    setPlace(item);
                    setQ("");
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0 border-border/50 cursor-pointer text-popover-foreground"
                >
                  <span className="font-medium">{item.name}</span>
                  {item.country && (
                    <span className="text-xs text-muted-foreground">{item.country}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Saved Favorites Chips */}
        {favorites.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {favorites.map((fav, idx) => {
              const active = isSamePlace(fav, place);
              return (
                <button
                  key={`${fav.name}-${idx}`}
                  type="button"
                  onClick={() => setPlace(fav)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border/70 bg-card/80 text-card-foreground hover:bg-muted"
                  }`}
                >
                  <span>{fav.name.split(",")[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Weather Forecast View */}
        {weather ? (
          <WeatherView
            weather={weather}
            activeAlerts={alerts}
            unit={unit}
            loading={loading}
            onRefresh={handleRefresh}
            onSelectBg={handleSelectCustomBg}
            onSelectBackground={handleSelectCustomBg}
          />
        ) : null}
      </main>

      {/* AI & Landmark Art Gallery Modal */}
      {weather && (
        <AiGalleryModal
          isOpen={showAiGallery}
          onClose={() => setShowAiGallery(false)}
          cityName={weather.place.name}
          weatherDesc={describe(weather.current.code).label}
          weatherCode={weather.current.code}
          tempC={
            weather.unit === "imperial"
              ? ((weather.current.temp - 32) * 5) / 9
              : weather.current.temp
          }
          activeBg={customBgUrl}
          activeBackground={customBgUrl || ""}
          onSelectBackground={(url: string) => handleSelectCustomBg(url)}
          onSelectBg={(url: string) => handleSelectCustomBg(url)}
        />
      )}

      {/* Footer */}
      <footer className="mt-8 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>
          {t("weather_by", "Weather data by Open-Meteo • AI Watercolor Art")}
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/privacy" className="hover:underline">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
