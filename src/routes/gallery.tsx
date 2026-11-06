// src/routes/gallery.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDMARK_WATERCOLORS,
  LANDMARK_TITLES,
  saveCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";
import type { Place } from "@/lib/weather";

const DESC =
  "Explore curated city landmark watercolors, create custom AI scenes, and personalize your forecast wallpaper.";

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

// Built-in coordinate map so "View Weather" directly loads without geocoding delays
const LANDMARK_COORDINATES: Record<string, Place> = {
  ratchaburi: { name: "Ratchaburi", country: "Thailand", lat: 13.5283, lon: 99.8134 },
  bangkok: { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  "chiang mai": { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853 },
  phuket: { name: "Phuket", country: "Thailand", lat: 7.8804, lon: 98.3923 },
  krabi: { name: "Krabi", country: "Thailand", lat: 8.0863, lon: 98.9063 },
  pattaya: { name: "Pattaya", country: "Thailand", lat: 12.9276, lon: 100.8771 },
  singapore: { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  tokyo: { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  kyoto: { name: "Kyoto", country: "Japan", lat: 35.0116, lon: 135.7681 },
  osaka: { name: "Osaka", country: "Japan", lat: 34.6937, lon: 135.5023 },
  seoul: { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  taipei: { name: "Taipei", country: "Taiwan", lat: 25.033, lon: 121.5654 },
  "hong kong": { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  hanoi: { name: "Hanoi", country: "Vietnam", lat: 21.0285, lon: 105.8542 },
  "ho chi minh city": { name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lon: 106.6297 },
  bali: { name: "Bali", country: "Indonesia", lat: -8.3405, lon: 115.092 },
  "kuala lumpur": { name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lon: 101.6869 },
  sydney: { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  melbourne: { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631 },
  paris: { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  london: { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  rome: { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  venice: { name: "Venice", country: "Italy", lat: 45.4408, lon: 12.3155 },
  barcelona: { name: "Barcelona", country: "Spain", lat: 41.3879, lon: 2.1699 },
  amsterdam: { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  berlin: { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  zurich: { name: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417 },
  prague: { name: "Prague", country: "Czech Republic", lat: 50.0755, lon: 14.4378 },
  "new york": { name: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
  "san francisco": { name: "San Francisco", country: "United States", lat: 37.7749, lon: -122.4194 },
  "los angeles": { name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437 },
  vancouver: { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207 },
  toronto: { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  cairo: { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
  dubai: { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
};

const REGIONS = [
  { id: "all", label: "All Cities" },
  { id: "thailand", label: "Thailand" },
  { id: "asia", label: "Asia & Pacific" },
  { id: "europe", label: "Europe" },
  { id: "americas", label: "Americas" },
];

function getCityRegion(cityName: string): string {
  const c = cityName.toLowerCase();
  if (["ratchaburi", "bangkok", "chiang mai", "phuket", "krabi", "pattaya"].includes(c)) return "thailand";
  if (["singapore", "tokyo", "kyoto", "osaka", "seoul", "taipei", "hong kong", "hanoi", "ho chi minh city", "bali", "kuala lumpur", "sydney", "melbourne"].includes(c)) return "asia";
  if (["paris", "london", "rome", "venice", "barcelona", "amsterdam", "berlin", "zurich", "prague"].includes(c)) return "europe";
  return "americas";
}

interface SavedItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // Expandable AI Creator state
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCity, setAiCity] = useState("Ratchaburi");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saved Art state
  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved art from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("weather:custom-art-saved");
      if (raw) {
        setSavedArtworks(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const saveArtworkList = (items: SavedItem[]) => {
    setSavedArtworks(items);
    try {
      localStorage.setItem("weather:custom-art-saved", JSON.stringify(items));
    } catch {}
  };

  // Curated Landmark items
  const landmarkItems = useMemo(() => {
    const list: Array<{ city: string; title: string; image: string; region: string }> = [];
    for (const [cityKey, images] of Object.entries(LANDMARK_WATERCOLORS)) {
      if (!images || images.length === 0) continue;
      const formattedCity = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
      const title = LANDMARK_TITLES[cityKey]?.[0] || `${formattedCity} Landmark`;
      list.push({
        city: formattedCity,
        title,
        image: images[0],
        region: getCityRegion(cityKey),
      });
    }
    return list;
  }, []);

  // Filtered landmarks
  const filteredLandmarks = useMemo(() => {
    return landmarkItems.filter((item) => {
      const matchesSearch =
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === "all" || item.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [landmarkItems, searchQuery, selectedRegion]);

  // Apply wallpaper for a city
  const handleApplyWallpaper = (cityName: string, imageUrl: string) => {
    saveCustomArtChoice(cityName, imageUrl);
    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { city: cityName.toLowerCase(), url: imageUrl },
      })
    );
    alert(`Applied wallpaper for ${cityName}!`);
  };

  // View Weather: save exact Place coordinates so it never reverts to Bangkok
  const handleViewWeather = (cityName: string) => {
    const key = cityName.toLowerCase();
    const directCoords = LANDMARK_COORDINATES[key];

    const placeToSave: Place = directCoords || {
      name: cityName,
      country: "",
      lat: 13.7563,
      lon: 100.5018,
    };

    try {
      localStorage.setItem("weather:gallery-selected-place", JSON.stringify(placeToSave));
      localStorage.setItem("weather:last-place", JSON.stringify(placeToSave));
    } catch {}

    navigate({ to: "/" });
  };

  // AI Generation
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      const result = await generateWatercolorFn({
        data: {
          city: aiCity,
          userPrompt: aiPrompt,
          referenceImageBase64: uploadedPhoto || undefined,
        },
      });

      if (result && result.imageUrl) {
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: result.imageUrl,
          title: `${aiCity} — ${aiPrompt.slice(0, 30)}...`,
          timestamp: Date.now(),
        };
        const updated = [newItem, ...savedArtworks];
        saveArtworkList(updated);
        handleApplyWallpaper(aiCity, result.imageUrl);
        setAiPrompt("");
        setUploadedPhoto(null);
        setIsAiExpanded(false);
      } else {
        setAiError("Could not generate image. Please try another description.");
      }
    } catch (err: any) {
      setAiError(err?.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSavedArt = (id: string) => {
    const updated = savedArtworks.filter((item) => item.id !== id);
    saveArtworkList(updated);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            ← {t("back_to_forecast", "Back to Forecast")}
          </Link>
          <h1 className="text-sm font-bold tracking-tight">🎨 Art & Wallpaper Studio</h1>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-8">
        {/* Expandable AI Studio Bar */}
        <section className="rounded-2xl border border-primary/20 bg-card/60 p-4 shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✨</span>
              <div>
                <h2 className="text-sm font-bold">AI Watercolor Creator</h2>
                <p className="text-xs text-muted-foreground">
                  Paint custom landmark scenes or transform your photos into watercolors.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="px-3 py-1.5 rounded-xl border border-border/60 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition cursor-pointer"
            >
              {isAiExpanded ? "Close Studio ▲" : "Create with AI ▼"}
            </button>
          </div>

          {isAiExpanded && (
            <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    City Name
                  </label>
                  <input
                    type="text"
                    value={aiCity}
                    onChange={(e) => setAiCity(e.target.value)}
                    placeholder="e.g. Ratchaburi, Tokyo..."
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Scene Description
                  </label>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Misty mountain temples at sunrise with golden light..."
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium hover:bg-muted/80 transition cursor-pointer"
                  >
                    📷 {uploadedPhoto ? "Change Photo" : "Upload Reference Photo"}
                  </button>
                  {uploadedPhoto && (
                    <button
                      onClick={() => setUploadedPhoto(null)}
                      className="text-xs text-destructive hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                >
                  {isGenerating ? "Painting Scene... ⏳" : "Paint Watercolor 🎨"}
                </button>
              </div>

              {aiError && (
                <p className="text-xs text-destructive font-medium pt-1">⚠️ {aiError}</p>
              )}
            </div>
          )}
        </section>

        {/* City Wallpapers Section (Wallpapers First) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight">City & Landmark Wallpapers</h2>
              <p className="text-xs text-muted-foreground">
                Set as forecast wallpaper or jump directly into that city's live forecast.
              </p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search landmarks or cities..."
              className="w-full sm:w-64 rounded-xl border border-border/60 bg-card/80 px-3 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Region Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  selectedRegion === r.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Landmark Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredLandmarks.map((item, idx) => (
              <div
                key={`${item.city}-${idx}`}
                className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
              >
                <div
                  className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setPreviewImage(item.image)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <p className="text-xs font-bold leading-tight drop-shadow-md">{item.city}</p>
                    <p className="text-[10px] text-white/80 truncate drop-shadow-sm">{item.title}</p>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between gap-2 border-t border-border/40 mt-auto">
                  <button
                    onClick={() => handleApplyWallpaper(item.city, item.image)}
                    className="flex-1 py-1.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-foreground text-[11px] font-semibold transition cursor-pointer text-center"
                  >
                    Set Wallpaper
                  </button>
                  <button
                    onClick={() => handleViewWeather(item.city)}
                    className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer text-center"
                  >
                    View Weather 🌤️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* My Saved & Uploaded Art Section */}
        {savedArtworks.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-border/40">
            <div>
              <h2 className="text-base font-bold tracking-tight">My Saved & Uploaded Art</h2>
              <p className="text-xs text-muted-foreground">
                Your custom creations and personal uploads saved locally.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {savedArtworks.map((art) => (
                <div
                  key={art.id}
                  className="group relative rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs flex flex-col"
                >
                  <div
                    className="aspect-video w-full bg-muted cursor-pointer overflow-hidden"
                    onClick={() => setPreviewImage(art.url)}
                  >
                    <img
                      src={art.url}
                      alt={art.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-2 space-y-1.5">
                    <p className="text-[11px] font-medium text-foreground truncate">{art.title}</p>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleApplyWallpaper("Custom", art.url)}
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleDeleteSavedArt(art.id)}
                        className="text-[10px] font-semibold text-destructive hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Light Image Zoom Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={previewImage}
              alt="Artwork preview"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtGalleryPage;
