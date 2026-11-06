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
import { PaymentModal } from "@/components/PaymentModal";

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

// Weather sky item definition
interface WeatherSkyItem {
  id: string;
  name: string;
  category: "free" | "ads_24h" | "rootbeer_tier";
  requiredTier?: string;
  previewUrl: string;
  description: string;
}

const WEATHER_SKIES: WeatherSkyItem[] = [
  {
    id: "clear_day",
    name: "Golden Sunrise & Clear Day",
    category: "free",
    previewUrl: "/icons/watercolor/01d_clear_sky.png",
    description: "Forever Free. Radiant amber daylight sky for sunny conditions.",
  },
  {
    id: "clear_night",
    name: "Deep Indigo Starry Night",
    category: "free",
    previewUrl: "/icons/watercolor/02n_few_clouds_night.png",
    description: "Forever Free. Velvet navy twilight with stars and glowing moon.",
  },
  {
    id: "cloudy_day",
    name: "Soft Cloud Drift",
    category: "free",
    previewUrl: "/icons/watercolor/04d_overcast.png",
    description: "Forever Free. Gentle overcast watercolor washes.",
  },
  {
    id: "rainy",
    name: "Misty Rain & Showers",
    category: "ads_24h",
    previewUrl: "/icons/watercolor/09d_shower_rain.png",
    description: "Watch a quick 24-hour ad to unlock or support with Root Beer.",
  },
  {
    id: "snowy",
    name: "Frosty Watercolor Blizzard",
    category: "ads_24h",
    previewUrl: "/backgrounds/vibrant/snow_swiss.jpg",
    description: "Watch a quick 24-hour ad to unlock or support with Root Beer.",
  },
  {
    id: "haze",
    name: "Warm Golden Haze / Sunset",
    category: "rootbeer_tier",
    requiredTier: "large_root_beer_tier",
    previewUrl: "/backgrounds/vibrant/ratchaburi_haze.jpg",
    description: "Exclusive reward: Unlocks with Large Root Beer Tier ($4.99).",
  },
  {
    id: "storm",
    name: "Thunderstorm & Purple Lightning",
    category: "rootbeer_tier",
    requiredTier: "party_pack_root_beer_tier",
    previewUrl: "/backgrounds/vibrant/storm.jpg",
    description: "Exclusive reward: Unlocks with Party Pack Tier ($9.99).",
  },
];

// Persistent IndexedDB Store for Saved Artwork
const DB_NAME = "WeatherPalArtDB";
const STORE_NAME = "artworks";
const DB_VERSION = 1;

export interface SavedArtItem {
  id: string;
  url: string;
  title: string;
  city?: string;
  createdAt: number;
  source: "ai" | "upload" | "landmark";
}

function openArtworkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("city", "city", { unique: false });
      }
    };
  });
}

async function getAllSavedArtworks(): Promise<SavedArtItem[]> {
  try {
    const db = await openArtworkDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []) as SavedArtItem[];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IndexedDB] getAllSavedArtworks fallback", e);
    return [];
  }
}

async function putSavedArtwork(item: SavedArtItem): Promise<void> {
  const db = await openArtworkDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteSavedArtwork(id: string): Promise<void> {
  const db = await openArtworkDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Compress uploaded/generated images via canvas before storing
async function compressImage(
  dataUrl: string,
  maxWidth = 1400,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

type GalleryTab = "landmarks" | "skies" | "ai_generator" | "saved_art";

function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<GalleryTab>("landmarks");

  // Current city context from storage
  const [currentCity, setCurrentCity] = useState<string>("Bangkok");
  const [activeBg, setActiveBg] = useState<string | null>(null);

  // Tab 1: City Landmark states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [previewCity, setPreviewCity] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tab 2: Weather Skies states
  const [selectedSky, setSelectedSky] = useState<WeatherSkyItem | null>(null);
  const [adWatchLoading, setAdWatchLoading] = useState<string | null>(null);
  const [unlockedSkies, setUnlockedSkies] = useState<Record<string, boolean>>({});
  const [activePaymentTier, setActivePaymentTier] = useState<string | null>(null);

  // Tab 3: AI Generator states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCity, setAiCity] = useState("");
  const [aiSeason, setAiSeason] = useState<"day" | "night" | "sunset" | "storm">("day");
  const [aiStyle, setAiStyle] = useState<"vibrant" | "soft" | "bold">("vibrant");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Tab 4: Saved Artworks (IndexedDB)
  const [savedArtworks, setSavedArtworks] = useState<SavedArtItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read current active wallpaper and city on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const lastCity =
        localStorage.getItem("weather:last-searched-city") ||
        localStorage.getItem("weather:last-place") ||
        "Bangkok";
      const parsedCity = lastCity.startsWith("{")
        ? JSON.parse(lastCity).name || "Bangkok"
        : lastCity;
      setCurrentCity(parsedCity);
      setAiCity(parsedCity);

      const saved = getSavedCustomArtChoice(parsedCity);
      if (saved) {
        setActiveBg(saved);
      }
    } catch {
      setCurrentCity("Bangkok");
    }

    // Load initial Saved Artworks from IndexedDB
    getAllSavedArtworks().then((list) => {
      setSavedArtworks(list);
    });

    // Check unlocks for Weather Skies
    const skyUnlocks: Record<string, boolean> = {};
    WEATHER_SKIES.forEach((sky) => {
      if (sky.category === "free") {
        skyUnlocks[sky.id] = true;
      } else if (sky.category === "ads_24h") {
        skyUnlocks[sky.id] = isAdUnlocked(sky.id);
      } else if (sky.category === "rootbeer_tier" && sky.requiredTier) {
        skyUnlocks[sky.id] = isThankYouBackgroundUnlocked(sky.requiredTier);
      }
    });
    setUnlockedSkies(skyUnlocks);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // --------------------------------------------------------------------------
  // Tab 1: City Landmark Filtering
  // --------------------------------------------------------------------------
  const allCities = useMemo(() => {
    return Object.keys(LANDMARK_WATERCOLORS).sort();
  }, []);

  const filteredCities = useMemo(() => {
    return allCities.filter((city) => {
      const cityTitles = LANDMARK_TITLES[city];
      const titleMatches = Array.isArray(cityTitles)
        ? cityTitles.some((title) =>
            title.toLowerCase().includes(searchQuery.toLowerCase().trim())
          )
        : typeof cityTitles === "string" &&
          cityTitles.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesSearch =
        searchQuery.trim() === "" ||
        city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        titleMatches;

      if (!matchesSearch) return false;

      if (selectedRegion === "all") return true;
      const c = city.toLowerCase();
      if (selectedRegion === "asia") {
        return (
          c.includes("bangkok") ||
          c.includes("ratchaburi") ||
          c.includes("chiang") ||
          c.includes("phuket") ||
          c.includes("tokyo") ||
          c.includes("kyoto") ||
          c.includes("seoul") ||
          c.includes("beijing") ||
          c.includes("shanghai") ||
          c.includes("singapore") ||
          c.includes("hong kong") ||
          c.includes("taipei") ||
          c.includes("hanoi") ||
          c.includes("delhi") ||
          c.includes("mumbai")
        );
      }
      if (selectedRegion === "europe") {
        return (
          c.includes("paris") ||
          c.includes("london") ||
          c.includes("rome") ||
          c.includes("venice") ||
          c.includes("amsterdam") ||
          c.includes("barcelona") ||
          c.includes("athens") ||
          c.includes("berlin") ||
          c.includes("prague") ||
          c.includes("vienna")
        );
      }
      if (selectedRegion === "americas") {
        return (
          c.includes("new york") ||
          c.includes("san francisco") ||
          c.includes("los angeles") ||
          c.includes("chicago") ||
          c.includes("rio") ||
          c.includes("toronto") ||
          c.includes("vancouver")
        );
      }
      if (selectedRegion === "other") {
        return (
          c.includes("sydney") ||
          c.includes("cairo") ||
          c.includes("dubai") ||
          c.includes("istanbul")
        );
      }
      return true;
    });
  }, [allCities, searchQuery, selectedRegion]);

  // Apply art wallpaper to current or specified city
  const handleApplyWallpaper = (url: string, targetCity?: string) => {
    const city = targetCity || currentCity;
    saveCustomArtChoice(city, url);
    setActiveBg(url);

    // Save automatically to persistent library if not present
    putSavedArtwork({
      id: `applied_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      title: `Applied for ${city}`,
      city,
      createdAt: Date.now(),
      source: "landmark",
    }).then(() => {
      getAllSavedArtworks().then(setSavedArtworks);
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("weather:custom-art-updated", {
          detail: { city, imageUrl: url },
        })
      );
    }
    showToast(`Applied wallpaper for ${city}!`);
  };

  const handleOpenCityWeather = (city: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("weather:last-searched-city", city);
    }
    navigate({ to: "/" });
  };

  // --------------------------------------------------------------------------
  // Tab 2: Weather Skies & Unlocks
  // --------------------------------------------------------------------------
  const handleApplySky = (sky: WeatherSkyItem) => {
    if (!unlockedSkies[sky.id]) {
      if (sky.category === "ads_24h") {
        handleWatchAd(sky.id);
      } else if (sky.category === "rootbeer_tier" && sky.requiredTier) {
        setActivePaymentTier(sky.requiredTier);
      }
      return;
    }
    handleApplyWallpaper(sky.previewUrl, currentCity);
  };

  const handleWatchAd = (skyId: string) => {
    setAdWatchLoading(skyId);
    setTimeout(() => {
      unlockWithAd24h(skyId);
      setUnlockedSkies((prev) => ({ ...prev, [skyId]: true }));
      setAdWatchLoading(null);
      showToast("Unlocked for 24 hours! Tap Apply to set as your sky.");
    }, 800);
  };

  // --------------------------------------------------------------------------
  // Tab 3: AI Watercolor Studio Generator
  // --------------------------------------------------------------------------
  const handleGenerateArt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedArt(null);

    try {
      const fullPrompt = `Watercolor painting of ${aiCity || currentCity}: ${aiPrompt.trim()}, ${aiSeason} lighting, ${aiStyle} style, clean soft watercolor washes, beautiful atmospheric sky landscape`;
      const result = await generateWatercolorFn({
        data: {
          city: aiCity || currentCity,
          userPrompt: `${fullPrompt} (${aiSeason} lighting, ${aiStyle} style)`,
        },
      });

      if (result && result.imageUrl) {
        const compressed = await compressImage(result.imageUrl, 1400, 0.82);
        setGeneratedArt(compressed);

        const newArt: SavedArtItem = {
          id: `ai_${Date.now()}`,
          url: compressed,
          title: aiPrompt.trim(),
          city: aiCity || currentCity,
          createdAt: Date.now(),
          source: "ai",
        };
        await putSavedArtwork(newArt);
        const updated = await getAllSavedArtworks();
        setSavedArtworks(updated);
        showToast("Artwork generated and saved to your library!");
      } else {
        setGenerationError("Failed to generate watercolor. Please try again.");
      }
    } catch (err) {
      console.error("[AI Studio] Generation error:", err);
      setGenerationError("Error contacting watercolor studio. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 4: Upload Custom Artwork & Manage Library
  // --------------------------------------------------------------------------
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (PNG, JPG, WebP)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawUrl = reader.result as string;
        const compressed = await compressImage(rawUrl, 1400, 0.82);

        const newItem: SavedArtItem = {
          id: `upload_${Date.now()}`,
          url: compressed,
          title: file.name.replace(/\.[^/.]+$/, "") || "Custom Upload",
          city: currentCity,
          createdAt: Date.now(),
          source: "upload",
        };

        await putSavedArtwork(newItem);
        const updated = await getAllSavedArtworks();
        setSavedArtworks(updated);
        showToast("Uploaded and saved to your library!");
      } catch (err) {
        console.error("[Upload] Error saving:", err);
        showToast("Error processing image file");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      showToast("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSavedArt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this artwork from your saved library?")) return;
    try {
      await deleteSavedArtwork(id);
      const updated = await getAllSavedArtworks();
      setSavedArtworks(updated);
      showToast("Artwork removed");
    } catch (err) {
      console.error("[Delete] Error removing item:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <span>←</span>
              <span>Back to Forecast</span>
            </Link>
          </div>

          <h1 className="text-sm font-semibold tracking-tight text-center truncate max-w-[200px] sm:max-w-none">
            🎨 Watercolor & Wallpaper Studio
          </h1>

          <button
            type="button"
            onClick={() => handleOpenCityWeather(currentCity)}
            className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Done
          </button>
        </div>

        {/* 4 Unified Gallery Tabs */}
        <div className="mx-auto max-w-6xl px-4 border-t border-border/60">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("landmarks")}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "landmarks"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🏛️</span>
              <span>City Landmarks ({allCities.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("skies")}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "skies"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🌤️</span>
              <span>Weather Skies & Unlocks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai_generator")}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ai_generator"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>✨</span>
              <span>AI Watercolor Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("saved_art")}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "saved_art"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🖼️</span>
              <span>My Saved & Uploads ({savedArtworks.length})</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">
        {/* ======================================================== */}
        {/* TAB 1: CITY LANDMARKS CATALOG (33+ Famous Cities)        */}
        {/* ======================================================== */}
        {activeTab === "landmarks" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
              <h2 className="text-lg font-bold tracking-tight">
                🏛️ Famous City Landmark Watercolors
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse hand-painted watercolor landmarks for 33+ world cities. Tapping "Apply" immediately updates your home screen wallpaper.
              </p>

              {/* Search & Region Filter */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Search city (e.g. Bangkok, Ratchaburi, Tokyo, Paris)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {["all", "asia", "europe", "americas", "other"].map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setSelectedRegion(reg)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer capitalize ${
                        selectedRegion === reg
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {reg === "all" ? "All Regions" : reg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* City Landmark Cards */}
            <div className="space-y-8">
              {filteredCities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                  No cities found matching "{searchQuery}".
                </div>
              ) : (
                filteredCities.map((cityName) => {
                  const artworks = LANDMARK_WATERCOLORS[cityName] || [];
                  const titles = LANDMARK_TITLES[cityName] || [];

                  return (
                    <section
                      key={cityName}
                      className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 transition hover:border-border"
                    >
                      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold tracking-tight text-foreground">
                            {cityName}
                          </h3>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {artworks.length} scenes
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCityWeather(cityName)}
                            className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                          >
                            🌤️ View Weather
                          </button>
                        </div>
                      </div>

                      {/* Artworks Grid */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {artworks.map((url, idx) => {
                          const title = titles[idx] || `${cityName} Landmark ${idx + 1}`;
                          const isCurrentActive = activeBg === url;

                          return (
                            <div
                              key={url}
                              className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition ${
                                isCurrentActive
                                  ? "border-primary ring-2 ring-primary/40 shadow-md"
                                  : "border-border/80 hover:border-primary/50"
                              }`}
                            >
                              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                                <img
                                  src={url}
                                  alt={title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {isCurrentActive && (
                                  <div className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-xs">
                                    Active
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewCity(cityName);
                                    setPreviewIndex(idx);
                                  }}
                                  aria-label="Preview full size"
                                  className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition"
                                >
                                  🔍
                                </button>
                              </div>

                              <div className="p-2 flex-1 flex flex-col justify-between">
                                <span className="text-[11px] font-medium text-foreground line-clamp-1">
                                  {title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleApplyWallpaper(url, cityName)}
                                  className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-semibold transition cursor-pointer ${
                                    isCurrentActive
                                      ? "bg-muted text-muted-foreground cursor-default"
                                      : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                  }`}
                                >
                                  {isCurrentActive ? "Selected" : "Set Active"}
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

        {/* ======================================================== */}
        {/* TAB 2: WEATHER SKIES & UNLOCKS (Core Skies + Tiers)      */}
        {/* ======================================================== */}
        {activeTab === "skies" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
              <h2 className="text-lg font-bold tracking-tight">
                🌤️ Weather Skies & Exclusive Unlocks
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set reactive sky backgrounds for your city or unlock premium weather themes via 24-hour rewarded ads or Root Beer support.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {WEATHER_SKIES.map((sky) => {
                const isUnlocked = !!unlockedSkies[sky.id];
                const isCurrentActive = activeBg === sky.previewUrl;
                const isAdLoading = adWatchLoading === sky.id;

                return (
                  <div
                    key={sky.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all hover:shadow-md"
                  >
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
                      <img
                        src={sky.previewUrl}
                        alt={sky.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <span
                        className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                          sky.category === "free"
                            ? "bg-emerald-600 text-white"
                            : isUnlocked
                            ? "bg-blue-600 text-white"
                            : sky.category === "ads_24h"
                            ? "bg-amber-600 text-white"
                            : "bg-amber-800 text-white"
                        }`}
                      >
                        {sky.category === "free"
                          ? "Free Forever"
                          : isUnlocked
                          ? "✓ Unlocked"
                          : sky.category === "ads_24h"
                          ? "📺 Watch Ad (24h)"
                          : "🍺 Root Beer Tier"}
                      </span>

                      {isCurrentActive && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-3.5 space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {sky.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sky.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleApplySky(sky)}
                            className={`w-full py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              isCurrentActive
                                ? "bg-muted text-muted-foreground cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {isCurrentActive ? "Active Wallpaper" : `Set for ${currentCity}`}
                          </button>
                        ) : sky.category === "ads_24h" ? (
                          <button
                            type="button"
                            onClick={() => handleWatchAd(sky.id)}
                            disabled={isAdLoading}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <span>📺</span>
                            <span>
                              {isAdLoading ? "Loading Ad..." : "Watch Ad (Unlock for 24h)"}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplySky(sky)}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>🍺</span>
                            <span>Unlock via Root Beer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: AI WATERCOLOR STUDIO (Gateway Generator)           */}
        {/* ======================================================== */}
        {activeTab === "ai_generator" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
              <h2 className="text-lg font-bold tracking-tight">
                ✨ AI Watercolor Painting Studio
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Describe a customized weather scene or landmark. The AI Watercolor engine will paint high-definition wallpaper saved directly to your device.
              </p>

              <form onSubmit={handleGenerateArt} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={aiCity}
                      onChange={(e) => setAiCity(e.target.value)}
                      placeholder="e.g. Bangkok, Kyoto, London..."
                      className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      Atmosphere / Time of Day
                    </label>
                    <select
                      value={aiSeason}
                      onChange={(e) =>
                        setAiSeason(
                          e.target.value as "day" | "night" | "sunset" | "storm"
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="day">☀️ Golden Daylight</option>
                      <option value="sunset">🌅 Warm Amber Sunset</option>
                      <option value="night">🌙 Deep Starry Night</option>
                      <option value="storm">⚡ Dramatic Thunderstorm</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground">
                    Scene Description & Landmarks
                  </label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Blooming cherry blossoms over an ancient temple with gentle watercolor washes and misty rain..."
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Art Style:
                    </span>
                    {(["vibrant", "soft", "bold"] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setAiStyle(style)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition cursor-pointer ${
                          aiStyle === style
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isGenerating ? "⏳" : "🎨"}</span>
                    <span>{isGenerating ? "Painting Scene..." : "Paint Watercolor"}</span>
                  </button>
                </div>

                {generationError && (
                  <p className="text-xs font-medium text-destructive mt-2">
                    {generationError}
                  </p>
                )}
              </form>
            </div>

            {/* Generated Art Showcase */}
            {generatedArt && (
              <div className="rounded-2xl border border-primary/50 bg-card p-4 sm:p-5 shadow-md">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>✨</span>
                  <span>Newly Created Artwork</span>
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={generatedArt}
                      alt="AI Generated Artwork"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground italic">
                      "{aiPrompt}"
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyWallpaper(generatedArt, aiCity || currentCity)}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
                      >
                        Apply as {aiCity || currentCity} Wallpaper
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: MY SAVED & UPLOADED ARTWORKS (IndexedDB Library)   */}
        {/* ======================================================== */}
        {activeTab === "saved_art" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    🖼️ My Saved & Uploaded Artworks
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your personal collection saved on this device. Upload your own photography or keep your favorite watercolors handy.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>📤</span>
                    <span>{isUploading ? "Uploading..." : "Upload Photo"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Art Gallery Grid */}
            {savedArtworks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                No saved artworks yet. Generate an AI scene, upload a wallpaper, or select landmark art to build your collection!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {savedArtworks.map((item) => {
                  const isCurrentActive = activeBg === item.url;

                  return (
                    <div
                      key={item.id}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition ${
                        isCurrentActive
                          ? "border-primary ring-2 ring-primary/40 shadow-md"
                          : "border-border/80 hover:border-primary/50"
                      }`}
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                        <img
                          src={item.url}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isCurrentActive && (
                          <div className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-xs">
                            Active
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedArt(item.id, e)}
                          aria-label="Delete artwork"
                          className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-destructive"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] font-medium text-foreground line-clamp-1">
                            {item.title}
                          </span>
                          {item.city && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.city}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyWallpaper(item.url, item.city || currentCity)}
                          className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-semibold transition cursor-pointer ${
                            isCurrentActive
                              ? "bg-muted text-muted-foreground cursor-default"
                              : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                          }`}
                        >
                          {isCurrentActive ? "Active" : "Set Active"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Full-Screen Image Preview Modal */}
        {previewCity && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setPreviewCity(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-16/10 w-full overflow-hidden bg-black">
                <img
                  src={LANDMARK_WATERCOLORS[previewCity]?.[previewIndex]}
                  alt={`${previewCity} Landmark`}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between p-4 border-t border-border bg-card">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {LANDMARK_TITLES[previewCity]?.[previewIndex] || `${previewCity} Landmark`}
                  </h4>
                  <p className="text-xs text-muted-foreground">{previewCity}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = LANDMARK_WATERCOLORS[previewCity]?.[previewIndex];
                      if (url) handleApplyWallpaper(url, previewCity);
                      setPreviewCity(null);
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                  >
                    Set as Wallpaper
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCity(null)}
                    className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal for Root Beer Tiers */}
        {activePaymentTier && (
          <PaymentModal
            tierId={activePaymentTier}
            onClose={() => setActivePaymentTier(null)}
            onSuccess={() => {
              setUnlockedSkies((prev) => ({
                ...prev,
                [activePaymentTier]: true,
                haze: true,
                storm: true,
              }));
              setActivePaymentTier(null);
              showToast("🎉 Root Beer Tier Unlocked! Thank you for supporting!");
            }}
          />
        )}
      </main>
    </div>
  );
}

export default ArtGalleryPage;
