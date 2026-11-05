// src/routes/index.tsx
import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { RootBeerThankYou } from "@/components/RootBeerThankYou_DEEPER_AMBER";
import {
  isAdUnlocked,
  unlockWithAd24h,
  getAllUnlockedThankYouBackgrounds,
} from "@/lib/monetization";
import { getTmdAlertsFn } from "@/lib/tmdAlerts.functions";

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

const LAST_PLACE_KEY = "weather:last-place";

function loadLastPlace(): Place | null {
  try {
    const raw = localStorage.getItem(LAST_PLACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number" && parsed.name) {
      return parsed as Place;
    }
  } catch {}
  return null;
}

function saveLastPlace(p: Place): void {
  try {
    localStorage.setItem(LAST_PLACE_KEY, JSON.stringify(p));
  } catch {}
}

// Fetch USGS Significant Earthquakes (M4.5+ within 1,200km)
async function fetchUSGSEarthquakes(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const now = Date.now();

    const quakes: TickerAlertItem[] = [];
    for (const f of data.features || []) {
      const [qLon, qLat] = f.geometry.coordinates;
      const mag = f.properties.mag;
      const placeName = f.properties.place;
      const time = f.properties.time;

      if (now - time > 48 * 3600 * 1000) continue;

      const dLat = (qLat - lat) * 111;
      const dLon = (qLon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
      const distKm = Math.sqrt(dLat * dLat + dLon * dLon);

      if (distKm <= 1200) {
        quakes.push({
          id: `usgs-${f.id}`,
          severity: mag >= 6.0 ? "warning" : "advisory",
          category: "earthquake",
          headline: `M${mag.toFixed(1)} Earthquake — ${placeName} (${Math.round(distKm)} km away)`,
          source: "USGS",
          timeAgo: formatTimeAgo(time),
        });
      }
    }
    return quakes;
  } catch {
    return [];
  }
}

// Fetch TMD (Thailand Meteorological Department) Warnings via server proxy
async function fetchTMDWarnings(place: Place): Promise<TickerAlertItem[]> {
  const isThailand =
    place.country?.toLowerCase().includes("thailand") ||
    (place.lat >= 5.6 && place.lat <= 20.5 && place.lon >= 97.3 && place.lon <= 105.7);

  if (!isThailand) return [];

  try {
    const alerts = await getTmdAlertsFn();
    return alerts || [];
  } catch {
    return [];
  }
}

// Fetch Open-Meteo Severe Weather Alerts
async function fetchOpenMeteoAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const alerts: TickerAlertItem[] = [];

    const rainSum = data.daily?.precipitation_sum?.[0] ?? 0;
    const rainProb = data.daily?.precipitation_probability_max?.[0] ?? 0;
    const maxWind = data.daily?.wind_speed_10m_max?.[0] ?? 0;

    if (rainSum >= 45) {
      alerts.push({
        id: "om-heavy-rain",
        severity: "warning",
        category: "flood",
        headline: `Heavy Rain Alert: Up to ${Math.round(rainSum)}mm expected (${rainProb}% chance)`,
        source: "Open-Meteo",
        timeAgo: "Today",
      });
    } else if (rainSum >= 25) {
      alerts.push({
        id: "om-moderate-rain",
        severity: "advisory",
        category: "rain",
        headline: `Rain Advisory: ${Math.round(rainSum)}mm rain expected (${rainProb}% chance)`,
        source: "Open-Meteo",
        timeAgo: "Today",
      });
    }

    if (maxWind >= 60) {
      alerts.push({
        id: "om-high-wind",
        severity: "warning",
        category: "storm",
        headline: `High Wind Warning: Gusts up to ${Math.round(maxWind)} km/h`,
        source: "Open-Meteo",
        timeAgo: "Today",
      });
    }

    return alerts;
  } catch {
    return [];
  }
}

// Fetch NWS Active Alerts (US locations only)
async function fetchNWSAlerts(lat: number, lon: number): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: { "User-Agent": "(myweatherpal.app, contact@myweatherpal.app)" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features || [];

    return features.slice(0, 2).map((f: any) => ({
      id: `nws-${f.id}`,
      severity: f.properties.severity === "Severe" ? "warning" : "advisory",
      category: f.properties.event?.toLowerCase().includes("flood") ? "flood" : "storm",
      headline: `${f.properties.event}: ${f.properties.headline || f.properties.description?.slice(0, 100)}`,
      source: "NWS",
      timeAgo: "Active",
    }));
  } catch {
    return [];
  }
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  // Monetization & Ad Unlock state
  const [purchasedTierId, setPurchasedTierId] = useState<string | null>(null);
  const [adUnlockedBgs, setAdUnlockedBgs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const adBgs: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("ad_unlocked_")) {
          const bg = key.replace("ad_unlocked_", "");
          if (isAdUnlocked(bg)) adBgs.push(bg);
        }
      }
    } catch {}
    return adBgs;
  });

  const handleAdUnlock = (bgId: string) => {
    unlockWithAd24h(bgId);
    setAdUnlockedBgs((prev) => [...prev, bgId]);
  };

  // 1. Initial Preferences & Listeners
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

    const handleThankYouEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tierId: string }>;
      if (customEvent.detail?.tierId) {
        setPurchasedTierId(customEvent.detail.tierId);
      }
    };
    window.addEventListener("weather:trigger-tier-thankyou", handleThankYouEvent);

    return () => {
      window.removeEventListener("weather:sky-change", handleSkyChange);
      window.removeEventListener("weather:trigger-tier-thankyou", handleThankYouEvent);
    };
  }, []);

  // 2. Fetch Weather and Disaster Alerts
  const fetchAllWeatherData = async (targetPlace: Place, currentUnit: WeatherUnit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeather(targetPlace, currentUnit);
      setWeather(data);

      const [quakeAlerts, tmdAlerts, omAlerts, nwsAlerts] = await Promise.allSettled([
        fetchUSGSEarthquakes(targetPlace.lat, targetPlace.lon),
        fetchTMDWarnings(targetPlace),
        fetchOpenMeteoAlerts(targetPlace.lat, targetPlace.lon),
        targetPlace.country === "United States" || targetPlace.country === "USA"
          ? fetchNWSAlerts(targetPlace.lat, targetPlace.lon)
          : Promise.resolve([]),
      ]);

      const combined: TickerAlertItem[] = [
        ...(quakeAlerts.status === "fulfilled" ? quakeAlerts.value : []),
        ...(tmdAlerts.status === "fulfilled" ? tmdAlerts.value : []),
        ...(omAlerts.status === "fulfilled" ? omAlerts.value : []),
        ...(nwsAlerts.status === "fulfilled" ? nwsAlerts.value : []),
      ];

      setAlerts(combined);
    } catch (err: any) {
      setError(err?.message || "Failed to load weather forecast");
    } finally {
      setLoading(false);
    }
  };

  // Check if user came back from Art Gallery with a selected city, or restore last visited city
  useEffect(() => {
    try {
      const galleryCity = localStorage.getItem("weather:last-searched-city");
      if (galleryCity) {
        localStorage.removeItem("weather:last-searched-city");
        searchCity(galleryCity).then((results) => {
          const firstResult = results[0];
          if (firstResult) {
            handleSelectPlace(firstResult);
          }
        });
        return;
      }

      // Restore last visited city if saved
      const savedPlace = loadLastPlace();
      if (savedPlace && !isSamePlace(savedPlace, DEFAULT_PLACE)) {
        setPlace(savedPlace);
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
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCity(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = (newPlace: Place) => {
    setPlace(newPlace);
    saveLastPlace(newPlace);
    setQuery("");
    setSuggestions([]);
  };

  const handleToggleFavorite = () => {
    const isFav = isFavorite(place, favorites);
    const updated = isFav
      ? favorites.filter((f) => !isSamePlace(f, place))
      : [...favorites, place];

    setFavorites(updated);
    saveFavorites(updated);
  };

  // Reverse geocoding HTML5 GPS with automatic IP fallback
  const handleUseCurrentLocation = () => {
    setLoading(true);
    setError(null);

    // Fallback: IP-based city detection if GPS is blocked or unavailable
    const fallbackToIp = async () => {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          const lat = parseFloat(data.latitude);
          const lon = parseFloat(data.longitude);
          const cityName = data.city || data.region || "Current Location";
          const countryName = data.country || "";

          if (!isNaN(lat) && !isNaN(lon)) {
            handleSelectPlace({
              name: cityName,
              country: countryName,
              lat,
              lon,
            });
            return;
          }
        }
      } catch {}
      setLoading(false);
      setError("Unable to determine location. Please search for your city above.");
    };

    if (!navigator.geolocation) {
      fallbackToIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const feat = data.features?.[0]?.properties;
            const cityName =
              feat?.city || feat?.name || feat?.district || feat?.state || "Current Location";
            const countryName = feat?.country || "";

            handleSelectPlace({
              name: cityName,
              country: countryName,
              lat: latitude,
              lon: longitude,
            });
            return;
          }
        } catch {}

        handleSelectPlace({
          name: "My Location",
          country: "",
          lat: latitude,
          lon: longitude,
        });
      },
      () => {
        // If GPS is disabled, denied, or timed out, seamlessly fall back to IP
        fallbackToIp();
      },
      {
        enableHighAccuracy: false, // Fast Wi-Fi / cellular fix
        timeout: 10000,
        maximumAge: 300000, // Use cached position if available within 5 mins
      }
    );
  };

  const handleSelectCustomBg = (url: string) => {
    const key = `weather:custom-bg:${place.name.trim().toLowerCase()}`;
    if (url) {
      localStorage.setItem(key, url);
      setCustomBgUrl(url);
    } else {
      localStorage.removeItem(key);
      setCustomBgUrl(null);
    }
    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { city: place.name.trim().toLowerCase(), url },
      })
    );
  };

  // Derived Sky Theme
  const activeSky =
    skyPref === "auto"
      ? weather
        ? skyKey(weather.current.code, weather.current.is_day)
        : "day"
      : skyPref;

  return (
    <div
      className={`min-h-screen text-foreground transition-colors duration-500 sky-${activeSky}`}
    >
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none leading-none">🌤️</span>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight">
                {t("app_title", "My Weather Pal")}
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground leading-none">
                {t("app_tagline", "Private • Accurate • Curated Art")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                className="w-full rounded-2xl border border-border/60 bg-card/80 px-4 py-2.5 pl-10 text-sm shadow-xs backdrop-blur-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="absolute left-3.5 top-3 text-sm text-muted-foreground select-none">
                🔍
              </span>
              {searching && (
                <span className="absolute right-3.5 top-3 text-xs text-muted-foreground animate-spin">
                  ⏳
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              title={t("use_location", "Use GPS Location")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-foreground shadow-xs hover:bg-muted/80 backdrop-blur-xs transition cursor-pointer"
            >
              <span className="text-base select-none">📍</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-30 max-h-60 overflow-y-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.name}-${s.lat}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(s)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/80 transition cursor-pointer"
                >
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.country}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Favorite Cities Chips */}
        {favorites.length > 0 && (
          <section className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              ★ {t("favorites", "Favorites")}:
            </span>
            {favorites.map((fav) => {
              const active = isSamePlace(fav, place);
              return (
                <button
                  key={`${fav.name}-${fav.lat}`}
                  type="button"
                  onClick={() => handleSelectPlace(fav)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border border-border/60 bg-card/80 text-foreground hover:bg-muted/80"
                  }`}
                >
                  {fav.name}
                </button>
              );
            })}
          </section>
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
            ⚠️ {error}
          </div>
        )}

        {/* Weather View Section */}
        {weather && (
          <WeatherView
            weather={weather}
            activeAlerts={alerts}
            unit={unit}
            loading={loading}
            onRefresh={() => fetchAllWeatherData(place, unit)}
            isFav={isFavorite(place, favorites)}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            onOpenAiGallery={() => navigate({ to: "/gallery" })}
            customBgUrl={customBgUrl}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>
          {t("weather_by", "Weather data by Open-Meteo • AI Watercolor Art")}
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/gallery" className="hover:underline font-medium">
            🎨 {t("art_gallery", "Art Gallery")}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </div>
      </footer>

      {/* Root Beer Tier Thank-You Overlay */}
      {purchasedTierId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <RootBeerThankYou
              tierId={purchasedTierId as any}
              onClose={() => setPurchasedTierId(null)}
            />
            <button
              onClick={() => setPurchasedTierId(null)}
              aria-label="Close"
              className="absolute -top-3 -right-3 bg-white text-zinc-700 hover:text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold text-sm transition hover:scale-105 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Index;
