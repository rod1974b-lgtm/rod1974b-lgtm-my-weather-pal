import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  LANDMARK_WATERCOLORS,
  LANDMARK_TITLES,
  saveCustomArtChoice,
  getSavedCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";

const DESC =
  "Browse and swap hand-painted watercolor weather backgrounds for all cities in My Weather Pal.";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "City Art Gallery — My Weather Pal" },
      { name: "description", content: DESC },
      { property: "og:title", content: "City Art Gallery — My Weather Pal" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CityArtGallery,
});

// Regional categories for easy filtering
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

function formatCityName(slug: string): string {
  return slug
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CityArtGallery() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [activeBackgrounds, setActiveBackgrounds] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    city: string;
  } | null>(null);

  // Load active city backgrounds from on-device storage
  const loadSavedPreferences = () => {
    const map: Record<string, string> = {};
    Object.keys(LANDMARK_WATERCOLORS).forEach((city) => {
      const saved = getSavedCustomArtChoice(city);
      if (saved) {
        map[city] = saved;
      } else {
        const list = LANDMARK_WATERCOLORS[city];
        if (list && list.length > 0) {
          map[city] = list[0];
        }
      }
    });
    setActiveBackgrounds(map);
  };

  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const handleSelectArt = (city: string, url: string, title: string) => {
    saveCustomArtChoice(city, url);
    setActiveBackgrounds((prev) => ({ ...prev, [city]: url }));
    setToastMessage(`Saved background for ${formatCityName(city)}: "${title}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCityWeather = (cityName: string) => {
    try {
      localStorage.setItem("weather:last-searched-city", formatCityName(cityName));
    } catch {}
    navigate({ to: "/" });
  };

  // Filter cities by search term and region
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
            ← Back to weather
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">🎨 City Art Gallery</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Browse and tap any painting to set it as the live watercolor background for that city.
          </p>
        </div>

        <Link
          to="/"
          className="rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors hover:bg-accent"
        >
          View Weather Home
        </Link>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg transition-all animate-in fade-in">
          ✨ {toastMessage}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city (e.g. Bangkok, Tokyo)..."
            className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 pl-9 text-xs shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Region Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["All", ...Object.keys(REGIONS)].map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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

      {/* City Sections Grid */}
      <div className="mt-8 space-y-8">
        {filteredCities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No cities found matching "{search}".
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedRegion("All");
              }}
              className="mt-3 text-xs text-primary underline"
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
                {/* City Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">{formatCityName(cityKey)}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {artworks.length} {artworks.length === 1 ? "Artwork" : "Artworks"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenCityWeather(cityKey)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <span>🌤️</span>
                    <span>View Weather</span>
                  </button>
                </div>

                {/* Paintings Grid */}
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
                        {/* Artwork Image */}
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                          <img
                            src={url}
                            alt={title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Active Badge */}
                          {isActive && (
                            <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                              ✓ Active
                            </span>
                          )}

                          {/* Fullscreen Preview Zoom Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({ url, title, city: formatCityName(cityKey) });
                            }}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100"
                            title="Expand preview"
                          >
                            🔍
                          </button>
                        </div>

                        {/* Title & Swap Button */}
                        <div className="flex flex-1 flex-col justify-between bg-card p-2.5 text-xs">
                          <p className="line-clamp-1 font-medium text-foreground">{title}</p>

                          <button
                            type="button"
                            onClick={() => handleSelectArt(cityKey, url, title)}
                            className={`mt-2 w-full rounded-md py-1 text-center font-medium transition-colors ${
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

      {/* Fullscreen Zoom Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[75vh] w-full object-contain"
            />
            <div className="flex items-center justify-between border-t border-border/50 p-4">
              <div>
                <p className="text-sm font-bold">{previewImage.title}</p>
                <p className="text-xs text-muted-foreground">{previewImage.city}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSelectArt(
                      previewImage.city.toLowerCase(),
                      previewImage.url,
                      previewImage.title
                    );
                    setPreviewImage(null);
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Set as Background
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CityArtGallery;
