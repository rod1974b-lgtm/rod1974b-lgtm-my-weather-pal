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
        content:
          "Minimalist, account-free weather app featuring curated AI watercolor backgrounds and live meteorological advisories.",
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

      if (distKm <= 1200 && mag >= 4.5) {
        nearby.push({
          id: `eq-${f.id}`,
          severity: mag >= 6.0 ? "danger" : "warning",
          category: "earthquake",
          source: "USGS",
          headline: `M${mag.toFixed(1)} Earthquake • ${placeName} (${Math.round(distKm)}km away)`,
          urgency: "Immediate",
        });
      }
    }
    return nearby.slice(0, 3);
  } catch {
    return [];
  }
}

// Fetch NWS Active Alerts (US locations)
async function fetchNWSAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        headers: { "User-Agent": "MyWeatherPal/1.0" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = data?.features || [];

    return features.slice(0, 3).map((f: any) => ({
      id: f.id || String(Math.random()),
      severity: f.properties?.severity === "Extreme" ? "danger" : "warning",
      category: "weather",
      source: "NWS",
      headline: f.properties?.headline || f.properties?.event || "Severe Weather Advisory",
      urgency: f.properties?.urgency || "Expected",
    }));
  } catch {
    return [];
  }
}

// Fetch TMD Weather Warnings (Thailand)
async function fetchTMDWarnings(country: string): Promise<TickerAlertItem[]> {
  if (!country || !country.toLowerCase().includes("thailand")) return [];
  try {
    const res = await fetch(
      "https://data.tmd.go.th/api/WeatherWarning/v2/?uid=api&ukey=api&format=json",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const warnings = data?.DailyWeatherWarning?.WarningList || [];
    if (!warnings.length) return [];

    const first = warnings[0];
    const title = first?.TitleEng || first?.TitleThai || "TMD Monsoon & Rain Warning";
    return [
      {
        id: "tmd-warning",
        severity: "warning",
        category: "monsoon",
        source: "TMD Thailand",
        headline: title,
        urgency: "Expected",
      },
    ];
  } catch {
    return [];
  }
}

// Fetch Open-Meteo River Discharge & Flood Alerts
async function fetchRiverDischarge(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=river_discharge,river_discharge_mean&forecast_days=3`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const discharges = data?.daily?.river_discharge || [];
    const means = data?.daily?.river_discharge_mean || [];

    if (discharges.length > 0 && means.length > 0) {
      const currentQ = discharges[0];
      const meanQ = means[0];
      if (meanQ > 5 && currentQ > meanQ * 2.0) {
        return [
          {
            id: `flood-river`,
            severity: "warning",
            category: "flood",
            source: "Open-Meteo River Model",
            headline: `Elevated River Flow (${Math.round(currentQ)} m³/s vs normal ${Math.round(meanQ)} m³/s) — Basin flood watch`,
            urgency: "Future",
          },
        ];
      }
    }
    return [];
  } catch {
    return [];
  }
}

// Synthesize local weather warnings from current forecast
function getLocalWeatherAdvisories(w: Weather | null): TickerAlertItem[] {
  if (!w?.current) return [];
  const items: TickerAlertItem[] = [];
  const code = w.current.code;

  if ([95, 96, 99].includes(code)) {
    items.push({
      id: "local-thunderstorm",
      severity: "danger",
      category: "storm",
      source: "Live Radar",
      headline: `Severe Thunderstorm & Lightning in effect for ${w.place.name}. Seek indoor shelter.`,
      urgency: "Immediate",
    });
  } else if ([65, 82].includes(code)) {
    items.push({
      id: "local-heavy-rain",
      severity: "warning",
      category: "rain",
      source: "Live Radar",
      headline: `Heavy to very heavy rains active in ${w.place.name} — drive with extreme caution.`,
      urgency: "Expected",
    });
  } else if ([75, 86].includes(code)) {
    items.push({
      id: "local-heavy-snow",
      severity: "warning",
      category: "snow",
      source: "Live Radar",
      headline: `Heavy snowfall warning in effect for ${w.place.name}. Expect reduced visibility.`,
      urgency: "Expected",
    });
  }

  if (w.current.wind && w.current.wind >= 45) {
    items.push({
      id: "local-high-wind",
      severity: "warning",
      category: "wind",
      source: "Live Station",
      headline: `High Wind Advisory: gusts up to ${Math.round(w.current.wind)} km/h recorded.`,
      urgency: "Expected",
    });
  }

  if (w.current.aqi && w.current.aqi >= 151) {
    items.push({
      id: "local-unhealthy-aqi",
      severity: "warning",
      category: "air-quality",
      source: "Air Quality Station",
      headline: `Unhealthy Air Quality (AQI ${w.current.aqi}). Sensitive groups should wear masks.`,
      urgency: "Expected",
    });
  }

  return items;
}

function Index() {
  const { t } = useTranslation();
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search autocomplete
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Favorites
  const [favorites, setFavorites] = useState<Place[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);

  // Background and Sky Theme
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [skyPref, setSkyPref] = useState<string>("auto");
  const [showAiGallery, setShowAiGallery] = useState<boolean>(false);

  // 1. Initial Preferences
  useEffect(() => {
    setUnit(loadUnitPref());
    setFavorites(loadFavorites());

    try {
      const storedSky = localStorage.getItem("weather:sky-pref") || "auto";
      setSkyPref(storedSky);
    } catch {}

    const handleSkyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ sky: string }>;
      if (customEvent.detail?.sky) {
        setSkyPref(customEvent.detail.sky);
      }
    };
    window.addEventListener("weather:sky-change", handleSkyChange);
    return () => window.removeEventListener("weather:sky-change", handleSkyChange);
  }, []);

  // 2. Fetch Weather & All Disaster Feeds
  const fetchAllWeatherData = async (targetPlace: Place, targetUnit: WeatherUnit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeather(targetPlace, targetUnit);
      setWeather(data);

      const [eqAlerts, nwsAlerts, tmdAlerts, floodAlerts] = await Promise.all([
        fetchUSGSEarthquakes(targetPlace.lat, targetPlace.lon),
        fetchNWSAlerts(targetPlace.lat, targetPlace.lon),
        fetchTMDWarnings(targetPlace.country || ""),
        fetchRiverDischarge(targetPlace.lat, targetPlace.lon),
      ]);

      const localAlerts = getLocalWeatherAdvisories(data);
      const combined = [...localAlerts, ...floodAlerts, ...tmdAlerts, ...nwsAlerts, ...eqAlerts];
      setAlerts(combined);
    } catch (err: any) {
      setError(err?.message || "Failed to load weather forecast");
    } finally {
      setLoading(false);
    }
  };

  // Check if user came back from City Art Gallery with a selected city
  useEffect(() => {
    try {
      const galleryCity = localStorage.getItem("weather:last-searched-city");
      if (galleryCity) {
        localStorage.removeItem("weather:last-searched-city");
        searchCity(galleryCity).then((results) => {
          if (results.length > 0) {
            handleSelectPlace(results[0]);
          }
        });
      }
    } catch {}
  }, []);

  // Trigger load on place or unit change
  useEffect(() => {
    fetchAllWeatherData(place, unit);
  }, [place, unit]);

  // Sync custom background from localStorage
  useEffect(() => {
    const key = `weather:custom-bg:${place.name.trim().toLowerCase()}`;
    const saved = localStorage.getItem(key);
    setCustomBgUrl(saved);

    const handleCustomBgChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ city?: string; url?: string }>;
      if (
        !customEvent.detail?.city ||
        customEvent.detail.city.toLowerCase() === place.name.trim().toLowerCase()
      ) {
        setCustomBgUrl(customEvent.detail?.url || null);
      }
    };
    window.addEventListener("weather:custom-bg-change", handleCustomBgChange);
    return () => window.removeEventListener("weather:custom-bg-change", handleCustomBgChange);
  }, [place]);

  // Periodic Auto-Refresh (Every 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllWeatherData(place, unit);
    }, 10 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchAllWeatherData(place, unit);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [place, unit]);

  // Debounced City Search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchCity(query);
      setSuggestions(results);
      setSearching(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Geolocation lookup
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let detectedName = "Current Location";
        let detectedCountry = "";

        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
            { signal: AbortSignal.timeout(3500) }
          );
          if (res.ok) {
            const data = await res.json();
            const first = data?.features?.[0]?.properties;
            if (first) {
              detectedName = first.city || first.town || first.name || detectedName;
              detectedCountry = first.country || "";
            }
          }
        } catch {}

        setPlace({
          name: detectedName,
          country: detectedCountry,
          lat,
          lon,
        });
      },
      () => {
        setLoading(false);
        alert("Unable to retrieve your location. Please check device permissions.");
      },
      { timeout: 8000 }
    );
  };

  const handleSelectPlace = (p: Place) => {
    setPlace(p);
    setQuery("");
    setSuggestions([]);
  };

  const handleToggleFavorite = () => {
    const updated = isFavorite(favorites, place)
      ? favorites.filter((f) => !isSamePlace(f, place))
      : [...favorites, place];
    setFavorites(updated);
    saveFavorites(updated);
  };

  const handleSelectCustomBg = (url: string) => {
    const key = `weather:custom-bg:${place.name.trim().toLowerCase()}`;
    if (!url) {
      localStorage.removeItem(key);
      setCustomBgUrl(null);
    } else {
      localStorage.setItem(key, url);
      setCustomBgUrl(url);
    }
    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { city: place.name, url },
      })
    );
  };

  // Determine active sky theme
  const autoSky = weather ? skyKey(weather.current.code, weather.current.is_day) : "day";
  const activeSky = skyPref === "auto" ? autoSky : skyPref;

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
            {/* Direct City Art Gallery Link */}
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-muted transition-colors cursor-pointer"
              title="Browse City Art Gallery"
            >
              <span>🎨</span>
              <span className="hidden sm:inline">City Art</span>
            </Link>

            {/* AI Generator Modal Trigger */}
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

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 space-y-4">
        {/* Search & Location Bar */}
        <section className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search_placeholder", "Search city or landmark...")}
                className="w-full rounded-2xl border border-border/80 bg-card px-4 py-2.5 pl-10 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="absolute left-3.5 top-3 text-muted-foreground text-sm">🔍</span>
              {searching && (
                <span className="absolute right-3.5 top-3 text-xs text-muted-foreground animate-spin">
                  ⏳
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseLocation}
              title={t("use_location", "Use My Location")}
              className="flex items-center justify-center rounded-2xl border border-border/80 bg-card px-4 py-2.5 text-sm shadow-xs transition-colors hover:bg-muted cursor-pointer"
            >
              📍
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl backdrop-blur-md">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.name}-${s.lat}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(s)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b border-border/40 last:border-0"
                >
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.country}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Favorite Cities Bar */}
        {favorites.length > 0 && (
          <section className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("favorites", "Favorites")}:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {favorites.map((fav) => {
                const isSelected = isSamePlace(fav, place);
                return (
                  <button
                    key={`${fav.name}-${fav.lat}`}
                    type="button"
                    onClick={() => handleSelectPlace(fav)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border/80 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    {fav.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            ⚠️ {error}
          </div>
        )}

        {/* Weather View Section */}
        {weather && (
          <WeatherView
            weather={weather}
            activeAlerts={alerts}
            loading={loading}
            onRefresh={() => fetchAllWeatherData(place, unit)}
            isFav={isFavorite(favorites, place)}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            onOpenAiGallery={() => setShowAiGallery(true)}
            customBgUrl={customBgUrl}
          />
        )}
      </main>

      {/* AI Gallery Modal */}
      {weather && (
        <AiGalleryModal
          isOpen={showAiGallery}
          onClose={() => setShowAiGallery(false)}
          cityName={weather.place.name}
          country={weather.place.country}
          weatherDesc={describe(weather.current.code)}
          weatherCode={weather.current.code}
          currentTemp={
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
          <Link to="/gallery" className="hover:underline">
            🎨 {t("city_art_gallery", "City Art Gallery")}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default Index;
