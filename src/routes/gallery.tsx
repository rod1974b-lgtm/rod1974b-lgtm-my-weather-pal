import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDMARK_WATERCOLORS,
  LANDMARK_TITLES,
  saveCustomArtChoice,
  getSavedCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";
import {
  unlockWithAd24h,
  isAdUnlocked,
  isThankYouBackgroundUnlocked,
} from "@/lib/monetization";

const DESC =
  "Browse hand-painted landmark watercolors, weather sky unlocks, generate AI scenes, and manage your saved wallpapers in My Weather Pal.";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Art Gallery — My Weather Pal" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Art Gallery — My Weather Pal" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArtGalleryPage,
});

// Regional categories for city landmark filtering
const REGIONS: Record<string, string[]> = {
  "Thailand & SE Asia": [
    "ratchaburi",
    "bangkok",
    "chiang mai",
    "phuket",
    "krabi",
    "pattaya",
    "singapore",
    "kuala lumpur",
    "bali",
    "hanoi",
  ],
  "East Asia": ["tokyo", "kyoto", "osaka", "seoul", "taipei", "hong kong"],
  Europe: [
    "london",
    "paris",
    "rome",
    "barcelona",
    "amsterdam",
    "berlin",
    "vienna",
    "prague",
    "athens",
    "skopje",
  ],
  "Americas & Oceania": [
    "new york",
    "san francisco",
    "los angeles",
    "chicago",
    "toronto",
    "sydney",
    "melbourne",
  ],
};

const MOOD_PRESETS = [
  "Golden sunset glow with warm reflections",
  "Moody thunderstorm with dramatic dark clouds",
  "Gentle morning rain over historic streets",
  "Mystical morning fog and soft light",
  "Vibrant sunny day with bright blue skies",
  "Winter snowfall dusting rooftops",
];

// Core Weather Skies & Tier Unlocks
interface WeatherSkyItem {
  id: string;
  title: string;
  url: string;
  category: "free" | "ads_24h" | "premium";
  description: string;
  badge: string;
}

const WEATHER_SKIES: WeatherSkyItem[] = [
  {
    id: "clear_day",
    title: "Bangkok — Sunny Clear Sky",
    url: "/backgrounds/vibrant/bangkok_sunny.jpg",
    category: "free",
    description: "Crisp blue sky with warm sunlight",
    badge: "Free Forever",
  },
  {
    id: "cloudy_day",
    title: "Kyoto — Overcast & Clouds",
    url: "/backgrounds/vibrant/kyoto_sunny.jpg",
    category: "free",
    description: "Soft gentle clouds over traditional scenery",
    badge: "Free Forever",
  },
  {
    id: "rainy",
    title: "Skopje — Rainy Stone Bridge",
    url: "/backgrounds/vibrant/rain_skopje.jpg",
    category: "ads_24h",
    description: "Peaceful raindrops over the river and historic arches",
    badge: "Watch Ad for 24h",
  },
  {
    id: "snowy",
    title: "Swiss Alps — Snow Vista",
    url: "/backgrounds/vibrant/snow_swiss.jpg",
    category: "ads_24h",
    description: "Crisp snow-capped alpine peaks and winter calm",
    badge: "Watch Ad for 24h",
  },
  {
    id: "haze",
    title: "Ratchaburi — Atmospheric Haze",
    url: "/backgrounds/vibrant/ratchaburi_haze.jpg",
    category: "premium",
    description: "Rich atmospheric mist and misty mountain silhouettes",
    badge: "Large & Party Tier",
  },
  {
    id: "storm",
    title: "Dramatic Storm Watercolor",
    url: "/backgrounds/vibrant/storm.jpg",
    category: "premium",
    description: "Deep rolling thunderclouds with intense watercolor wash",
    badge: "Party Pack Exclusive",
  },
];

export interface SavedArtItem {
  id: string;
  url: string;
  label: string;
  date: string;
  city?: string;
  timestamp: number;
}

const DB_NAME = "WeatherPalArtDB";
const DB_VERSION = 1;
const STORE_NAME = "artworks";
const LEGACY_STORAGE_KEY = "weather:custom-art-saved";

function openArtworkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("city", "city", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllSavedArtworksFromDB(): Promise<SavedArtItem[]> {
  try {
    const db = await openArtworkDB();
    const items: SavedArtItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyList = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList) && legacyList.length > 0) {
          for (const item of legacyList) {
            const url = typeof item === "string" ? item : item?.url;
            if (url && !items.some((i) => i.url === url)) {
              const migrated: SavedArtItem = {
                id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
                url,
                label: typeof item === "object" && item?.title ? item.title : "Saved Artwork",
                date: new Date().toLocaleDateString(),
                timestamp: Date.now(),
              };
              await saveArtworkToDB(migrated);
              items.unshift(migrated);
            }
          }
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {}

    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

async function saveArtworkToDB(item: SavedArtItem): Promise<void> {
  const db = await openArtworkDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteArtworkFromDB(id: string): Promise<void> {
  const db = await openArtworkDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearAllArtworksFromDB(): Promise<void> {
  const db = await openArtworkDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function compressDataUrl(dataUrl: string, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function optimizeImageFile(file: File, maxDim = 1280, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatCityName(slug: string): string {
  return slug
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"landmarks" | "skies" | "generator" | "saved">("landmarks");
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [activeBackgrounds, setActiveBackgrounds] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    city: string;
  } | null>(null);

  // Current weather city from storage
  const [currentCity, setCurrentCity] = useState("Bangkok");

  // Generator states
  const [genCity, setGenCity] = useState("Bangkok");
  const [genPrompt, setGenPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);

  // Saved/Uploaded artworks state
  const [savedArts, setSavedArts] = useState<SavedArtItem[]>([]);

  // Ad and Root Beer unlock state tracker
  const [unlockedStateTick, setUnlockedStateTick] = useState(0);

  // Load active city backgrounds and saved library
  const loadSavedPreferences = () => {
    const map: Record<string, string> = {};
    Object.keys(LANDMARK_WATERCOLORS).forEach((city) => {
      const saved = getSavedCustomArtChoice(city);
      if (saved) {
        map[city] = saved;
      } else {
        const list = LANDMARK_WATERCOLORS[city];
        if (list && list.length > 0) {
          const firstArt = list[0];
          if (firstArt) map[city] = firstArt;
        }
      }
    });
    setActiveBackgrounds(map);

    try {
      const lastCity = localStorage.getItem("weather:last-searched-city");
      if (lastCity) {
        setCurrentCity(lastCity);
        setGenCity(lastCity);
      }
    } catch {}

    getAllSavedArtworksFromDB()
      .then((items) => setSavedArts(items))
      .catch(() => setSavedArts([]));
  };

  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectArt = (city: string, url: string, title: string) => {
    const slug = city.toLowerCase().trim();
    saveCustomArtChoice(slug, url);
    try {
      localStorage.setItem(`weather:custom-bg:${slug}`, url);
      window.dispatchEvent(
        new CustomEvent("weather:custom-bg-change", { detail: { city: slug, url } })
      );
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }

    setActiveBackgrounds((prev) => ({ ...prev, [slug]: url }));
    triggerToast(`Set wallpaper for ${formatCityName(city)}: "${title}"`);
  };

  const handleApplyAndView = (city: string, url: string, title: string) => {
    const formatted = formatCityName(city);
    handleSelectArt(city, url, title);
    try {
      localStorage.setItem("weather:last-searched-city", formatted);
    } catch {}
    navigate({ to: "/" });
  };

  const handleOpenCityWeather = (cityName: string) => {
    try {
      localStorage.setItem("weather:last-searched-city", formatCityName(cityName));
    } catch {}
    navigate({ to: "/" });
  };

  // Rewarded Ad 24h Unlock Flow
  const handleWatchAdUnlock = (bgId: string, title: string) => {
    triggerToast(`Watching rewarded ad for ${title}...`);
    setTimeout(() => {
      unlockWithAd24h(bgId);
      setUnlockedStateTick((prev) => prev + 1);
      triggerToast(`🎉 Unlocked "${title}" for 24 hours!`);
    }, 800);
  };

  // Root Beer Trigger Flow
  const handleTriggerRootBeerTier = (tierId: string) => {
    window.dispatchEvent(
      new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId } })
    );
    navigate({ to: "/" });
  };

  // Generator submission with auto-compression to avoid browser localStorage quota crash
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenError(null);

    try {
      const res = await generateWatercolorFn({
        data: {
          city: genCity.trim() || currentCity,
          userPrompt: genPrompt.trim(),
          weatherDesc: "scenic watercolor",
        },
      });

      if (!res?.imageUrl) {
        throw new Error("No artwork was returned by the AI generator.");
      }

      // Auto-compress large 3.5MB PNG down to web-optimized JPEG (~150KB)
      const compressedUrl = await compressDataUrl(res.imageUrl, 1280, 0.85);

      const targetCity = genCity.trim() || currentCity;
      const newArt: SavedArtItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        url: compressedUrl,
        label: `${targetCity} — ${genPrompt.trim()}`,
        date: new Date().toLocaleDateString(),
        city: targetCity,
        timestamp: Date.now(),
      };

      await saveArtworkToDB(newArt);
      setSavedArts((prev) => [newArt, ...prev.filter((item) => item.url !== compressedUrl)]);
      setLastGeneratedUrl(compressedUrl);

      handleSelectArt(targetCity, compressedUrl, newArt.label);
      triggerToast("✨ AI Watercolor generated and applied to your wallpaper!");
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setGenError(err?.message || "Failed to generate artwork. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload photo handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedUrl = await optimizeImageFile(file);
      const newArt: SavedArtItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        url: optimizedUrl,
        label: `${currentCity} — ${file.name.replace(/\.[^/.]+$/, "")}`,
        date: new Date().toLocaleDateString(),
        city: currentCity,
        timestamp: Date.now(),
      };

      await saveArtworkToDB(newArt);
      setSavedArts((prev) => [newArt, ...prev]);

      const targetSlug = currentCity.toLowerCase();
      handleSelectArt(targetSlug, optimizedUrl, newArt.label);
      triggerToast("Photo uploaded and set as active wallpaper!");
    } catch (err) {
      console.error("Photo upload failed:", err);
      triggerToast("Could not process this image file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteArtworkFromDB(id);
      setSavedArts((prev) => prev.filter((item) => item.id !== id));
      triggerToast("Artwork removed from your saved library.");
    } catch (err) {
      console.error("Failed to delete art:", err);
    }
  };

  const handleClearAllSaved = async () => {
    if (window.confirm("Remove all saved artworks from your gallery?")) {
      try {
        await clearAllArtworksFromDB();
        setSavedArts([]);
        triggerToast("Saved gallery cleared.");
      } catch (err) {
        console.error("Failed to clear DB:", err);
      }
    }
  };

  const filteredCities = useMemo(() => {
    return Object.keys(LANDMARK_WATERCOLORS).filter((cityKey) => {
      const formatted = formatCityName(cityKey).toLowerCase();
      const matchesSearch = formatted.includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedRegion === "All") return true;
      const allowedCities = REGIONS[selectedRegion] || [];
      return allowedCities.includes(cityKey);
    });
  }, [search, selectedRegion]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 text-foreground sm:px-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:underline"
          >
            ← {t("back_to_weather", "Back to weather")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            🎨 {t("art_gallery", "Art Gallery")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t(
              "gallery_subtitle",
              "Explore city landmark paintings, unlock weather skies, generate AI scenes, or upload custom art."
            )}
          </p>
        </div>

        <Link
          to="/"
          className="rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors hover:bg-accent"
        >
          🌤️ {t("view_weather_home", "View Weather")}
        </Link>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg transition-all animate-in fade-in">
          ✨ {toastMessage}
        </div>
      )}

      {/* 4-Tab Segmented Switcher */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-border/70 bg-card/80 p-1 shadow-xs backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setActiveTab("landmarks")}
          className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "landmarks"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🏛️ {t("city_landmarks", "City Landmarks")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("skies")}
          className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "skies"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🌤️ Weather Skies
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("generator")}
          className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "generator"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ✨ {t("ai_generator", "AI Generator")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "saved"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📁 {t("my_saved_art", "My Saved Art")} ({savedArts.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CITY LANDMARKS (33+ Cities)                       */}
      {/* ======================================================== */}
      {activeTab === "landmarks" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city (e.g. Ratchaburi, Tokyo)..."
                className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 pl-9 text-xs shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">🔍</span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {["All", ...Object.keys(REGIONS)].map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    selectedRegion === reg
                      ? "bg-foreground text-background"
                      : "border border-border/60 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {filteredCities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No cities found matching "{search}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedRegion("All");
                  }}
                  className="mt-3 text-xs text-primary underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCities.map((cityKey) => {
                const artworks = LANDMARK_WATERCOLORS[cityKey] || [];
                const activeUrl = activeBackgrounds[cityKey] || artworks[0];

                return (
                  <section
                    key={cityKey}
                    className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs backdrop-blur-xs sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold tracking-tight">
                          {formatCityName(cityKey)}
                        </h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {artworks.length} {artworks.length === 1 ? "Artwork" : "Artworks"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenCityWeather(cityKey)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent cursor-pointer"
                      >
                        <span>🌤️</span>
                        <span>View Weather</span>
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {artworks.map((url, index) => {
                        const isActive = activeUrl === url;
                        const title =
                          LANDMARK_TITLES[url] || `${formatCityName(cityKey)} View #${index + 1}`;

                        return (
                          <div
                            key={url + index}
                            className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all ${
                              isActive
                                ? "border-primary ring-2 ring-primary/40 shadow-sm"
                                : "border-border/60 hover:border-border hover:shadow-xs"
                            }`}
                          >
                            <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                              <img
                                src={url}
                                alt={title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />

                              {isActive && (
                                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                                  ✓ Active
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage({ url, title, city: formatCityName(cityKey) });
                                }}
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-xs transition-opacity cursor-pointer"
                                title="Expand preview"
                              >
                                🔍
                              </button>
                            </div>

                            <div className="flex flex-1 flex-col justify-between bg-card p-2.5 text-xs">
                              <p className="line-clamp-1 font-medium text-foreground">{title}</p>

                              <button
                                type="button"
                                onClick={() => handleSelectArt(cityKey, url, title)}
                                className={`mt-2 w-full rounded-md py-1 text-center font-medium transition-colors cursor-pointer ${
                                  isActive
                                    ? "bg-muted text-muted-foreground cursor-default"
                                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                }`}
                              >
                                {isActive ? "Selected" : "Set Active"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      )}
