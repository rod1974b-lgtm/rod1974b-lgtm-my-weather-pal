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
    previewUrl: "/icons/sky_day.png",
    description: "Forever Free. Radiant amber daylight sky for sunny conditions.",
  },
  {
    id: "clear_night",
    name: "Deep Indigo Starry Night",
    category: "free",
    previewUrl: "/icons/sky_night.png",
    description: "Forever Free. Velvet navy twilight with stars and glowing moon.",
  },
  {
    id: "cloudy_day",
    name: "Soft Cloud Drift",
    category: "free",
    previewUrl: "/icons/sky_cloudy.png",
    description: "Forever Free. Gentle overcast watercolor washes.",
  },
  {
    id: "rainy",
    name: "Misty Rain & Showers",
    category: "ads_24h",
    previewUrl: "/icons/sky_rain.png",
    description: "Watch a quick 24-hour ad to unlock or support with Root Beer.",
  },
  {
    id: "snowy",
    name: "Frosty Watercolor Blizzard",
    category: "ads_24h",
    previewUrl: "/icons/sky_snow.png",
    description: "Watch a quick 24-hour ad to unlock or support with Root Beer.",
  },
  {
    id: "haze",
    name: "Warm Golden Haze / Sunset",
    category: "rootbeer_tier",
    requiredTier: "large_root_beer_tier",
    previewUrl: "/icons/sky_sunset.png",
    description: "Exclusive reward: Unlocks with Large Root Beer Tier ($4.99).",
  },
  {
    id: "storm",
    name: "Thunderstorm & Purple Lightning",
    category: "rootbeer_tier",
    requiredTier: "party_pack_root_beer_tier",
    previewUrl: "/icons/sky_storm.png",
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
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function getAllSavedArtworksFromDB(): Promise<SavedArtItem[]> {
  try {
    const db = await openArtworkDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SavedArtItem[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Falling back from IndexedDB:", err);
    try {
      const raw = localStorage.getItem("weather:custom-art-saved");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

async function saveArtworkToDB(item: SavedArtItem): Promise<void> {
  try {
    const db = await openArtworkDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Falling back to localStorage for save:", err);
    try {
      const existing = JSON.parse(localStorage.getItem("weather:custom-art-saved") || "[]");
      const updated = [item, ...existing.filter((x: any) => x.id !== item.id)].slice(0, 15);
      localStorage.setItem("weather:custom-art-saved", JSON.stringify(updated));
    } catch {}
  }
}

async function deleteArtworkFromDB(id: string): Promise<void> {
  try {
    const db = await openArtworkDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem("weather:custom-art-saved") || "[]");
      const updated = existing.filter((x: any) => x.id !== id);
      localStorage.setItem("weather:custom-art-saved", JSON.stringify(updated));
    } catch {}
  }
}

async function clearAllArtworksFromDB(): Promise<void> {
  try {
    const db = await openArtworkDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.removeItem("weather:custom-art-saved");
    } catch {}
  }
}

// Client-side canvas image compressor
async function compressDataUrl(
  dataUrl: string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<string> {
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

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
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

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function optimizeImageFile(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      if (!raw) {
        reject(new Error("Failed reading file"));
        return;
      }
      try {
        const compressed = await compressDataUrl(raw, maxDim, maxDim, quality);
        resolve(compressed);
      } catch {
        resolve(raw);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatCityName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const REGION_MAP: Record<string, string> = {
  Bangkok: "Southeast Asia",
  Ratchaburi: "Southeast Asia",
  Chiangmai: "Southeast Asia",
  Phuket: "Southeast Asia",
  Pattaya: "Southeast Asia",
  Ayutthaya: "Southeast Asia",
  Singapore: "Southeast Asia",
  Tokyo: "East Asia",
  Kyoto: "East Asia",
  Seoul: "East Asia",
  Taipei: "East Asia",
  Hongkong: "East Asia",
  Beijing: "East Asia",
  Shanghai: "East Asia",
  Paris: "Europe",
  London: "Europe",
  Rome: "Europe",
  Venice: "Europe",
  Amsterdam: "Europe",
  Barcelona: "Europe",
  Berlin: "Europe",
  Prague: "Europe",
  Vienna: "Europe",
  Santorini: "Europe",
  Newyork: "Americas",
  Sanfrancisco: "Americas",
  Losangeles: "Americas",
  Riodejaneiro: "Americas",
  Sydney: "Oceania",
  Melbourne: "Oceania",
  Dubai: "Middle East",
  Cairo: "Middle East",
};

export function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Active Tab: landmarks | skies | ai_generator | saved_art
  const [activeTab, setActiveTab] = useState<
    "landmarks" | "skies" | "ai_generator" | "saved_art"
  >("landmarks");

  // City Search & Filters
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // Selection & Feedback
  const [activeCityBg, setActiveCityBg] = useState<Record<string, string>>({});
  const [currentCity, setCurrentCity] = useState("Bangkok");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewArt, setPreviewArt] = useState<{
    url: string;
    title: string;
    city?: string;
  } | null>(null);

  // AI Generator state
  const [genCity, setGenCity] = useState("");
  const [genPrompt, setGenPrompt] = useState("");
  const [genMood, setGenMood] = useState("vibrant");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [paymentTierId, setPaymentTierId] = useState<string | null>(null);
  const [latestAiArt, setLatestAiArt] = useState<{
    url: string;
    prompt: string;
    city: string;
  } | null>(null);

  // Saved Art items
  const [savedArtworks, setSavedArtworks] = useState<SavedArtItem[]>([]);
  const [unlockedStateTick, setUnlockedStateTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSavedPreferences();
    loadSavedArtworksList();
  }, [unlockedStateTick]);

  const loadSavedPreferences = () => {
    try {
      const city =
        localStorage.getItem("weather:last-searched-city") ||
        localStorage.getItem("weather:last-city") ||
        "Bangkok";
      setCurrentCity(formatCityName(city));

      const mapping: Record<string, string> = {};
      Object.keys(LANDMARK_WATERCOLORS).forEach((c) => {
        const choice = getSavedCustomArtChoice(c);
        if (choice) mapping[c] = choice;
      });
      setActiveCityBg(mapping);
    } catch {}
  };

  const loadSavedArtworksList = async () => {
    const list = await getAllSavedArtworksFromDB();
    setSavedArtworks(list);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // User selects an art background
  const handleSelectArt = (city: string, url: string, title: string) => {
    const formatted = formatCityName(city);
    saveCustomArtChoice(city, url);
    setActiveCityBg((prev) => ({ ...prev, [city]: url }));

    try {
      localStorage.setItem("weather:custom-bg-url", url);
      localStorage.setItem("weather:custom-bg-city", formatted);
      localStorage.setItem("weather:last-searched-city", formatted);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { url, city: formatted, title },
      })
    );
    triggerToast(`Applied "${title}" as wallpaper!`);
  };

  // Immediate wallpaper set and navigate back to weather view
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

  // Root Beer Trigger Flow - opens Card/Stripe, Buy Me a Coffee, PayPal, Google Play modal
  const handleTriggerRootBeerTier = (tierId: string) => {
    setPaymentTierId(tierId);
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
          userPrompt: `${genMood ? genMood + " mood: " : ""}${genPrompt.trim()}`,
        },
      });

      if (!res.imageUrl) {
        throw new Error("Failed to generate artwork.");
      }

      // Automatically compress PNG base64 down to ~150KB JPEG to protect device storage
      const compressedUrl = await compressDataUrl(res.imageUrl, 1280, 1280, 0.85);

      const newArt: SavedArtItem = {
        id: `ai_${Date.now()}`,
        url: compressedUrl,
        title: `${genCity.trim() || currentCity} (${genMood})`,
        city: genCity.trim() || currentCity,
        createdAt: Date.now(),
        source: "ai",
      };

      await saveArtworkToDB(newArt);
      await loadSavedArtworksList();

      setLatestAiArt({
        url: compressedUrl,
        prompt: genPrompt.trim(),
        city: genCity.trim() || currentCity,
      });

      triggerToast("🎨 Generated new watercolor painting!");
    } catch (err: any) {
      setGenError(err?.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload user photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      triggerToast("Optimizing photo for wallpaper...");
      const compressedUrl = await optimizeImageFile(file, 1280, 0.85);

      const uploadItem: SavedArtItem = {
        id: `upload_${Date.now()}`,
        url: compressedUrl,
        title: file.name.replace(/\.[^/.]+$/, "") || "Custom Upload",
        city: currentCity,
        createdAt: Date.now(),
        source: "upload",
      };

      await saveArtworkToDB(uploadItem);
      await loadSavedArtworksList();
      triggerToast("✅ Saved to your personal gallery!");
    } catch (err: any) {
      triggerToast("❌ Failed to process upload.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteSaved = async (id: string) => {
    await deleteArtworkFromDB(id);
    await loadSavedArtworksList();
    triggerToast("Removed artwork from gallery");
  };

  const handleClearAllSaved = async () => {
    if (confirm("Clear all your saved & uploaded art from this device?")) {
      await clearAllArtworksFromDB();
      await loadSavedArtworksList();
      triggerToast("Cleared saved art");
    }
  };

  // Filtered Cities list for Tab 1
  const allCities = useMemo(() => Object.keys(LANDMARK_WATERCOLORS), []);
  const regions = useMemo(() => {
    const set = new Set<string>();
    Object.values(REGION_MAP).forEach((r) => set.add(r));
    return ["all", ...Array.from(set)];
  }, []);

  const filteredCities = useMemo(() => {
    return allCities.filter((city) => {
      const name = formatCityName(city);
      const matchesSearch =
        search.trim() === "" ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        city.toLowerCase().includes(search.toLowerCase());

      const region = REGION_MAP[city] || "Other";
      const matchesRegion = selectedRegion === "all" || region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [allCities, search, selectedRegion]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground/90 text-background px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              ← <span>{t("weather", "Weather")}</span>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span className="hidden sm:block text-xs font-semibold text-muted-foreground">
              Current: <strong className="text-foreground">{currentCity}</strong>
            </span>
          </div>

          <h1 className="text-sm font-bold tracking-tight sm:text-base flex items-center gap-1.5">
            <span>🎨</span>
            <span>Art & Wallpaper Gallery</span>
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
              <h2 className="text-lg font-bold tracking-tight">🏛️ Famous City Landmark Watercolors</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse hand-painted watercolor landmarks for 33+ world cities. Tapping "Set Active" immediately updates your home screen wallpaper.
              </p>

              {/* Search & Region Filter */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Search city (e.g. Ratchaburi, Tokyo, Paris)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {regions.map((reg) => (
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
                  No cities found matching "{search}".
                </div>
              ) : (
                filteredCities.map((cityKey) => {
                  const cityName = formatCityName(cityKey);
                  const artworks = LANDMARK_WATERCOLORS[cityKey] || [];
                  const titles = LANDMARK_TITLES[cityKey] || [];
                  const activeUrl = activeCityBg[cityKey] || artworks[0];
                  const region = REGION_MAP[cityKey] || "Global";

                  return (
                    <section
                      key={cityKey}
                      className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 transition hover:border-border"
                    >
                      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold tracking-tight text-foreground">
                            {cityName}
                          </h3>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {region}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCityWeather(cityKey)}
                            className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                          >
                            🌤️ View Weather
                          </button>
                        </div>
                      </div>

                      {/* Artworks Grid */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {artworks.map((url, idx) => {
                          const title = titles[idx] || `${cityName} Scene ${idx + 1}`;
                          const isActive = activeUrl === url;

                          return (
                            <div
                              key={url}
                              className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition ${
                                isActive
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

                                {isActive && (
                                  <div className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-xs">
                                    Active
                                  </div>
                                )}

                                {/* Touch & Click Zoom Preview Button */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewArt({ url, title, city: cityName })}
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
                                  onClick={() => handleSelectArt(cityKey, url, title)}
                                  className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-semibold transition cursor-pointer ${
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
      {/* ======================================================== */}
      {/* TAB 2: WEATHER SKIES & UNLOCKS (Free, Ads 24h, Root Beer) */}
      {/* ======================================================== */}
      {activeTab === "skies" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
            <h2 className="text-lg font-bold tracking-tight">🌤️ Atmospheric Weather Skies</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Core weather sky backgrounds that react to live weather conditions or can be pinned as your active city wallpaper.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {WEATHER_SKIES.map((sky) => {
              const isAdUnlockedBg = isAdUnlocked(sky.id);
              const isThankYouUnlocked =
                sky.id === "haze"
                  ? isThankYouBackgroundUnlocked("large_root_beer_tier") ||
                    isThankYouBackgroundUnlocked("party_pack_root_beer_tier")
                  : sky.id === "storm"
                  ? isThankYouBackgroundUnlocked("party_pack_root_beer_tier")
                  : true;

              const isAccessible =
                sky.category === "free" ||
                (sky.category === "ads_24h" && isAdUnlockedBg) ||
                (sky.category === "rootbeer_tier" && isThankYouUnlocked);

              const isActiveWallpaper = activeCityBg[currentCity.toLowerCase()] === sky.previewUrl;

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

                    {/* Category Ribbon */}
                    <span
                      className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                        sky.category === "free"
                          ? "bg-emerald-600 text-white"
                          : sky.category === "ads_24h"
                          ? isAdUnlockedBg
                            ? "bg-blue-600 text-white"
                            : "bg-amber-600 text-white"
                          : isThankYouUnlocked
                          ? "bg-purple-600 text-white"
                          : "bg-amber-800 text-white"
                      }`}
                    >
                      {sky.category === "free"
                        ? "Free Forever"
                        : sky.category === "ads_24h"
                        ? isAdUnlockedBg
                          ? "✓ 24h Active"
                          : "📺 Watch Ad (24h)"
                        : isThankYouUnlocked
                        ? "✓ Unlocked Forever"
                        : "🍺 Root Beer Tier"}
                    </span>

                    {isActiveWallpaper && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                        Active on {currentCity}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3.5 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{sky.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{sky.description}</p>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      {isAccessible ? (
                        <button
                          type="button"
                          onClick={() => handleSelectArt(currentCity.toLowerCase(), sky.previewUrl, sky.name)}
                          className={`w-full py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isActiveWallpaper
                              ? "bg-muted text-muted-foreground cursor-default"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {isActiveWallpaper ? "Active Wallpaper" : `Set for ${currentCity}`}
                        </button>
                      ) : sky.category === "ads_24h" ? (
                        <button
                          type="button"
                          onClick={() => handleWatchAdUnlock(sky.id, sky.name)}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>📺</span>
                          <span>Watch Ad (Unlock for 24h)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleTriggerRootBeerTier(
                              sky.id === "storm"
                                ? "party_pack_root_beer_tier"
                                : "large_root_beer_tier"
                            )
                          }
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
      {/* TAB 3: AI WATERCOLOR GENERATOR                           */}
      {/* ======================================================== */}
      {activeTab === "ai_generator" && (
        <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xs sm:p-7">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight">✨ Paint a Custom Weather Scene</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Describe your scene and AI Gateway will paint a unique hand-crafted watercolor for your forecast.
            </p>

            <form onSubmit={handleGenerate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground">City or Landmark</label>
                <input
                  type="text"
                  value={genCity}
                  onChange={(e) => setGenCity(e.target.value)}
                  placeholder="e.g. Ratchaburi, Tokyo, Paris..."
                  className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Atmospheric Scene or Weather Description
                </label>
                <textarea
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Golden sunset over the river with warm reflections and distant mountains..."
                  className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Quick inspiration presets:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[
                    "Sunset reflection over quiet waters",
                    "Thunderstorm clouds rolling over ancient pagodas",
                    "Crisp morning mountain mist with autumn colors",
                    "Cozy rain-dappled cobblestone street with lanterns",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGenPrompt(preset)}
                      className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {genError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  ⚠️ {genError}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !genPrompt.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 sm:w-auto sm:px-6 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Painting scene with AI...</span>
                  </>
                ) : (
                  <>
                    <span>🎨</span>
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </form>

            {latestAiArt && (
              <div className="mt-8 rounded-2xl border border-primary/40 bg-accent/30 p-4">
                <span className="text-xs font-bold text-primary">✨ Latest Painting:</span>
                <div className="mt-2 aspect-16/9 overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={latestAiArt.url}
                    alt="Generated watercolor"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Saved to on-device library</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectArt(
                          latestAiArt.city.toLowerCase(),
                          latestAiArt.url,
                          `${latestAiArt.city} — ${latestAiArt.prompt}`
                        )
                      }
                      className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                    >
                      Set Wallpaper
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyAndView(
                          latestAiArt.city,
                          latestAiArt.url,
                          `${latestAiArt.city} — ${latestAiArt.prompt}`
                        )
                      }
                      className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
                    >
                      🌤️ Apply & View Weather
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MY SAVED & UPLOADED ART (IndexedDB)               */}
      {/* ======================================================== */}
      {activeTab === "saved_art" && (
        <div className="mt-6 space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">📁 On-Device Art Collection</h2>
              <p className="text-xs text-muted-foreground">
                All generated watercolors and uploaded photos are stored privately on this device.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <span>📷</span>
                <span>Upload Photo</span>
              </button>

              {savedArtworks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSaved}
                  className="rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {savedArtworks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center">
              <span className="text-3xl">🖼️</span>
              <p className="mt-2 text-sm font-semibold">No saved art yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate an AI watercolor or upload a photo to start your collection.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("ai_generator")}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  Generate AI Art
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer"
                >
                  Upload Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {savedArtworks.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:shadow-xs"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />

                    {/* Mobile-friendly preview button */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewArt({
                          url: item.url,
                          title: item.title,
                          city: item.city || currentCity,
                        })
                      }
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-xs transition-opacity cursor-pointer"
                      title="Expand preview"
                    >
                      🔍
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-2.5 text-xs">
                    <div>
                      <p className="line-clamp-1 font-semibold">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectArt(
                            (item.city || currentCity).toLowerCase(),
                            item.url,
                            item.title
                          )
                        }
                        className="flex-1 rounded-md bg-primary/10 py-1 text-center font-medium text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        Set Wallpaper
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(item.id)}
                        className="rounded-md border border-destructive/40 p-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Zoom Preview Modal */}
      {previewArt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewArt(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewArt.url}
              alt={previewArt.title}
              className="max-h-[75vh] w-full object-contain"
            />
            <div className="flex items-center justify-between border-t border-border/50 p-4">
              <div>
                <p className="text-sm font-bold">{previewArt.title}</p>
                <p className="text-xs text-muted-foreground">{previewArt.city}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectArt(
                      (previewArt.city || currentCity).toLowerCase(),
                      previewArt.url,
                      previewArt.title
                    );
                    setPreviewArt(null);
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  Set as Background
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewArt(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal (Card/Stripe, Buy Me a Coffee, PayPal, Google Play) */}
      {paymentTierId && (
        <PaymentModal
          tierId={paymentTierId}
          onClose={() => setPaymentTierId(null)}
          onSuccess={() => {
            setUnlockedStateTick((prev) => prev + 1);
            triggerToast("🎉 Root Beer Tier Unlocked! Thank you for supporting!");
          }}
        />
      )}
    </main>
    </div>
  );
}

export default ArtGalleryPage;
