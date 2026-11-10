import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import {
  Search,
  MapPin,
  RefreshCw,
  Heart,
  Droplets,
  Wind,
  Sun,
  Compass,
  AlertTriangle,
  Shirt,
  Loader2,
  X,
  Menu,
  Image as ImageIcon,
  Beer,
  Globe,
  ChevronRight,
  ExternalLink,
  Check,
  Palette,
  Lock,
  Unlock,
  Play,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  type Place,
  type Weather,
  type WeatherUnit,
  type CityResult,
  DEFAULT_PLACE,
  fetchWeather,
  readSavedPlace,
  savePlace,
  readUnit,
  saveUnit,
  readCachedWeather,
  loadFavorites,
  saveFavorites,
  isFavorite,
  isSamePlace,
  searchCities,
  formatForecastTime,
  formatForecastDay,
  uvCategory,
  aqiCategory,
  getWeatherAlert,
  describeWeather,
  skyKey,
} from "@/lib/weather";
import { WeatherIcon } from "@/components/WeatherIcon";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  unlockWithAd24h,
  isAdUnlocked,
  saveThankYouBackgroundForever,
  isThankYouBackgroundUnlocked,
} from "@/lib/monetization";
import { LANDMARK_WATERCOLORS } from "@/lib/aiWatercolorGenerator";

const LANGUAGES = [
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "th", flag: "🇹🇭", name: "ไทย" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "zh", flag: "🇨🇳", name: "中文" },
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
  { code: "vi", flag: "🇻🇳", name: "Tiếng Việt" },
];

interface GalleryArtwork {
  id: string;
  name: string;
  url: string;
  city: string;
  requiredTier?: string; // "free" | "small" | "medium" | "large" | "party"
}

const CURATED_ARTWORKS: GalleryArtwork[] = [
  { id: "bangkok_1", name: "Bangkok Sunny Grand Palace", url: "/backgrounds/vibrant/bangkok_sunny.jpg", city: "Bangkok", requiredTier: "free" },
  { id: "bangkok_2", name: "Bangkok Riverside Temple", url: (LANDMARK_WATERCOLORS["bangkok"] || [])[1] || "/backgrounds/vibrant/bangkok_sunny.jpg", city: "Bangkok", requiredTier: "small" },
  { id: "ratchaburi_1", name: "Ratchaburi Atmospheric Haze", url: "/backgrounds/vibrant/ratchaburi_haze.jpg", city: "Ratchaburi", requiredTier: "large" },
  { id: "ratchaburi_2", name: "Ratchaburi Floating Market", url: (LANDMARK_WATERCOLORS["ratchaburi"] || [])[1] || "/backgrounds/vibrant/ratchaburi_haze.jpg", city: "Ratchaburi", requiredTier: "medium" },
  { id: "kyoto_1", name: "Kyoto Golden Pagoda", url: "/backgrounds/vibrant/kyoto_sunny.jpg", city: "Kyoto", requiredTier: "free" },
  { id: "skopje_1", name: "Skopje Rainy Watercolor", url: "/backgrounds/vibrant/rain_skopje.jpg", city: "Skopje", requiredTier: "small" },
  { id: "swiss_1", name: "Swiss Alps Mountain Snow", url: "/backgrounds/vibrant/snow_swiss.jpg", city: "Swiss Alps", requiredTier: "medium" },
  { id: "storm_1", name: "Dramatic Sky & Thunderstorm", url: "/backgrounds/vibrant/storm.jpg", city: "Atmosphere", requiredTier: "large" },
];

type WearCategory = "casual" | "business" | "sports";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Weather Pal — Hand-Painted Watercolor Forecasts" },
      {
        name: "description",
        content:
          "Artistic watercolor weather app with live forecasts, dynamic wallpapers, outfit suggestions, and city weather alerts.",
      },
      { property: "og:title", content: "My Weather Pal" },
      {
        property: "og:description",
        content: "Hand-painted watercolor weather forecasts and live sky wallpapers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const [place, setPlace] = useState<Place>(() => readSavedPlace() || DEFAULT_PLACE);
  const [unit, setUnit] = useState<WeatherUnit>(() => readUnit());
  const [weather, setWeather] = useState<Weather | null>(() => readCachedWeather(place));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CityResult[]>([]);
  const [, startSearchTransition] = useTransition();
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [selectedLang, setSelectedLang] = useState("en");

  // Custom App Wallpaper (applied to full page + wallpaper hero)
  const [activeBg, setActiveBg] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("weather:custom-bg") || "/backgrounds/vibrant/bangkok_sunny.jpg";
    }
    return "/backgrounds/vibrant/bangkok_sunny.jpg";
  });

  // Modals & Unlock States
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [beerModalOpen, setBeerModalOpen] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [wearCategory, setWearCategory] = useState<WearCategory>("casual");

  // Ad simulation modal state
  const [simulatingAd, setSimulatingAd] = useState<string | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(3);

  // Force re-render of unlock statuses
  const [unlockVersion, setUnlockVersion] = useState(0);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchWeather(place.latitude, place.longitude, unit)
      .then((data) => {
        if (!ignore) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load weather data");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [place, unit]);

  // Handle ad countdown timer
  useEffect(() => {
    if (!simulatingAd) return;
    if (adCountdown > 0) {
      const timer = setTimeout(() => setAdCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      unlockWithAd24h(simulatingAd);
      setSimulatingAd(null);
      setUnlockVersion((v) => v + 1);
    }
  }, [simulatingAd, adCountdown]);

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    startSearchTransition(async () => {
      const res = await searchCities(q);
      setSearchResults(res);
    });
  }

  function handleSelectCity(city: CityResult) {
    const next: Place = {
      name: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
    };
    setPlace(next);
    savePlace(next);
    setSearchQuery("");
    setSearchResults([]);

    const matchArt = CURATED_ARTWORKS.find((a) =>
      a.city.toLowerCase().includes(city.name.toLowerCase()) ||
      city.name.toLowerCase().includes(a.city.toLowerCase())
    );
    if (matchArt && isArtworkUnlocked(matchArt)) {
      handleSelectBg(matchArt.url);
    }
  }

  function toggleUnit() {
    const next: WeatherUnit = unit === "celsius" ? "fahrenheit" : "celsius";
    setUnit(next);
    saveUnit(next);
  }

  function toggleFavorite() {
    const exists = isFavorite(favorites, place);
    let next: Place[];
    if (exists) {
      next = favorites.filter((p) => !isSamePlace(p, place));
    } else {
      next = [place, ...favorites];
    }
    setFavorites(next);
    saveFavorites(next);
  }

  function handleRequestLocation() {
    setLocationPromptOpen(false);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next: Place = {
          name: "Current Location",
          country: "",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setPlace(next);
        savePlace(next);
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Failed to retrieve your current location");
      },
      { timeout: 10000 }
    );
  }

  function handleSelectBg(url: string | null) {
    setActiveBg(url);
    if (typeof window !== "undefined") {
      if (url) localStorage.setItem("weather:custom-bg", url);
      else localStorage.removeItem("weather:custom-bg");
    }
  }

  // --- UNLOCK CHECKING HELPERS ---
  function isTierUnlocked(tierId: string): boolean {
    if (typeof window === "undefined") return false;
    return isThankYouBackgroundUnlocked(tierId) || localStorage.getItem(`unlocked_tier_${tierId}`) === "true";
  }

  function isPartyPackUnlocked(): boolean {
    return isTierUnlocked("party_pack_root_beer_tier");
  }

  function isArtworkUnlocked(art: GalleryArtwork): boolean {
    if (art.requiredTier === "free" || !art.requiredTier) return true;
    if (isPartyPackUnlocked()) return true;
    if (isAdUnlocked(art.id)) return true;

    if (art.requiredTier === "small" && (isTierUnlocked("small_root_beer_tier") || isTierUnlocked("medium_root_beer_tier") || isTierUnlocked("large_root_beer_tier"))) {
      return true;
    }
    if (art.requiredTier === "medium" && (isTierUnlocked("medium_root_beer_tier") || isTierUnlocked("large_root_beer_tier"))) {
      return true;
    }
    if (art.requiredTier === "large" && isTierUnlocked("large_root_beer_tier")) {
      return true;
    }

    return false;
  }

  function handleWatchAd(artId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSimulatingAd(artId);
    setAdCountdown(3);
  }

  function handleToggleUnlockTier(tierId: string) {
    const currentlyUnlocked = isTierUnlocked(tierId);
    if (currentlyUnlocked) {
      localStorage.removeItem(`thankyou_unlocked_${tierId}`);
      localStorage.removeItem(`unlocked_tier_${tierId}`);
    } else {
      saveThankYouBackgroundForever(tierId);
      localStorage.setItem(`unlocked_tier_${tierId}`, "true");
    }
    setUnlockVersion((v) => v + 1);
  }

  function getWearAdvice(): { text: string; accessories: string[] } {
    if (!weather) return { text: "Loading weather recommendation...", accessories: [] };
    const tempC = weather.current.temperature;
    const isRain = weather.current.code >= 51 && weather.current.code <= 67;

    let text = "";
    const accessories: string[] = [];

    if (wearCategory === "casual") {
      if (tempC >= 30) text = "Light cotton t-shirt, breathable shorts or linen trousers.";
      else if (tempC >= 22) text = "Casual short-sleeve shirt or comfortable blouse and denim.";
      else if (tempC >= 15) text = "Light sweater, denim jacket, or long-sleeve tee.";
      else if (tempC >= 8) text = "Warm knit sweater, jacket, and comfortable trousers.";
      else text = "Heavy winter coat, thermal inner layers, and wool socks.";
    } else if (wearCategory === "business") {
      if (tempC >= 30) text = "Breathable tropical wool blazer or lightweight collared shirt.";
      else if (tempC >= 22) text = "Classic business suit or tailored dress with light layer.";
      else if (tempC >= 15) text = "Structured suit, layered dress shirt, and lightweight cardigan.";
      else if (tempC >= 8) text = "Wool overcoat over business attire, formal shoes.";
      else text = "Heavy overcoat, cashmere scarf, gloves, and formal boots.";
    } else {
      if (tempC >= 30) text = "Moisture-wicking singlet, running shorts, and sun visor.";
      else if (tempC >= 22) text = "Breathable athletic t-shirt and lightweight performance shorts.";
      else if (tempC >= 15) text = "Long-sleeve performance top and training tights.";
      else if (tempC >= 8) text = "Windbreaker running jacket, thermal tights, and beanie.";
      else text = "Insulated running jacket, thermal base layers, and sports gloves.";
    }

    if (isRain) accessories.push("Umbrella", "Waterproof shoes");
    if (weather.current.uv_index >= 6) accessories.push("Sunglasses", "Sunscreen");
    if (weather.current.wind_speed >= 25) accessories.push("Windbreaker");

    return { text, accessories };
  }

  const alert = weather ? getWeatherAlert(weather.current.code, weather.current.wind_speed, weather.current.temperature) : null;
  const wear = getWearAdvice();
  const currentSkyClass = weather ? `sky-${skyKey(weather.current.code, weather.current.is_day)}` : "sky-default";

  return (
    <div className={`min-h-screen text-foreground pb-14 sky relative ${currentSkyClass}`}>
      {/* 1. FULL-APP WALLPAPER OVERLAY (CLEAR, VIBRANT & LUMINOUS) */}
      {activeBg && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0.38) 50%, rgba(15,23,42,0.60) 100%), url(${activeBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        />
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-3 sm:pt-6 space-y-4">
        {/* TOP BAR / NAVIGATION */}
        <header className="flex items-center justify-between gap-2 bg-card/85 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-border/60 shadow-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-muted/80 text-foreground cursor-pointer transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-base sm:text-lg bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                My Weather Pal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 transition-all cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>AI Gallery</span>
            </button>

            <button
              type="button"
              onClick={() => setBeerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
            >
              <Beer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Root Beer</span>
            </button>

            <button
              type="button"
              onClick={toggleUnit}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              {unit === "celsius" ? "°C" : "°F"}
            </button>
          </div>
        </header>

        {/* 2. SEARCH & LOCATION INPUT */}
        <section className="relative">
          <div className="flex items-center gap-2 bg-card/85 backdrop-blur-md border border-border/60 rounded-2xl p-1.5 shadow-md">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search city (e.g. Bangkok, Tokyo, London)..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-transparent rounded-xl focus:outline-hidden text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  className="p-1 hover:bg-muted rounded-full mr-2 text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLocationPromptOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors cursor-pointer shrink-0"
              title="Use current location"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Locate Me</span>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-border">
              {searchResults.map((city) => (
                <button
                  key={`${city.name}-${city.latitude}-${city.longitude}`}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/80 text-sm flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="font-medium text-foreground">{city.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {city.admin1 ? `${city.admin1}, ` : ""}
                    {city.country}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 3. WEATHER ALERT TICKER (PLACED IMMEDIATELY BELOW CITY SEARCH) */}
        {alert ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium shadow-xs animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="overflow-hidden whitespace-nowrap w-full">
              <span className="inline-block animate-marquee">{alert}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 backdrop-blur-xs border border-border/40 text-muted-foreground text-xs">
            <Sun className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">No severe weather watches active in {place.name}. Calm conditions.</span>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs underline font-semibold ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MAIN WEATHER CONTENT */}
        <main className="space-y-4">
          {loading && !weather ? (
            <div className="h-64 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Painting live forecast for {place.name}...</p>
            </div>
          ) : weather ? (
            <>
              {/* 4. WALLPAPER CANVAS HERO (SEPARATE CANVAS FROM CURRENT WEATHER) */}
              <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-md">
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-muted">
                  <img
                    key={activeBg || "default-bg"}
                    src={activeBg || "/backgrounds/vibrant/bangkok_sunny.jpg"}
                    alt={`${place.name} watercolor landscape`}
                    className="h-full w-full object-cover transition-opacity duration-700 select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10 pointer-events-none" />

                  {/* Artwork Banner Overlay Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                        Live Wallpaper Canvas
                      </span>
                      <h2 className="text-lg sm:text-xl font-extrabold tracking-tight drop-shadow-md">
                        {place.name}
                        {place.country ? `, ${place.country}` : ""}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGalleryOpen(true)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Palette className="w-3 h-3" />
                        <span>Change Art</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. CURRENT WEATHER CARD (SEPARATE DEDICATED CARD) */}
              <section className="bg-card/85 backdrop-blur-md rounded-2xl p-5 border border-border/60 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Current Conditions
                    </span>
                    <button
                      type="button"
                      onClick={toggleFavorite}
                      className="p-1 rounded-full hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
                      title={isFavorite(favorites, place) ? "Remove favorite" : "Save as favorite"}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFavorite(favorites, place)
                            ? "fill-red-500 text-red-500"
                            : "hover:text-red-400"
                        }`}
                      />
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    Updated {weather.current.time.slice(11, 16) || "Just now"}
                  </span>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">
                        {Math.round(weather.current.temperature)}°
                      </span>
                      <span className="text-lg font-semibold text-muted-foreground">
                        {unit === "celsius" ? "C" : "F"}
                      </span>
                    </div>

                    <p className="text-base sm:text-lg font-bold text-foreground capitalize">
                      {describeWeather(weather.current.code)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Feels like {Math.round(weather.current.apparent_temperature)}° • High{" "}
                      {Math.round(weather.daily[0]?.high ?? weather.current.temperature)}° / Low{" "}
                      {Math.round(weather.daily[0]?.low ?? weather.current.temperature)}°
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-center">
                    <WeatherIcon
                      code={weather.current.code}
                      isDay={weather.current.is_day === 1}
                      size={92}
                    />
                  </div>
                </div>

                {/* METRICS ROW */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Humidity</span>
                      <span className="text-xs font-bold text-foreground">
                        {weather.current.relative_humidity}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <Wind className="w-4 h-4 text-teal-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Wind</span>
                      <span className="text-xs font-bold text-foreground">
                        {Math.round(weather.current.wind_speed)} {unit === "celsius" ? "km/h" : "mph"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">UV Index</span>
                      <span className="text-xs font-bold text-foreground">
                        {weather.current.uv_index.toFixed(1)} ({uvCategory(weather.current.uv_index)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Air Quality</span>
                      <span className="text-xs font-bold text-foreground">
                        {weather.current.us_aqi} AQI ({aqiCategory(weather.current.us_aqi)})
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. TODAY'S HOURLY FORECAST */}
              <section className="bg-card/85 backdrop-blur-md rounded-2xl p-4 border border-border/60 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Hourly Forecast (Today)
                  </h3>
                  <span className="text-xs text-muted-foreground">24-Hour Timeline</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {weather.hourly.slice(0, 16).map((h, idx) => (
                    <div
                      key={h.time || idx}
                      className="flex flex-col items-center min-w-[3.75rem] p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/40 shrink-0 text-center space-y-1 transition-colors"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {idx === 0 ? "Now" : formatForecastTime(h.time)}
                      </span>
                      <WeatherIcon code={h.code} isDay={h.is_day === 1} size={32} />
                      <span className="text-xs font-bold text-foreground">
                        {Math.round(h.temperature)}°
                      </span>
                      {h.precipitation_probability > 0 && (
                        <span className="text-[10px] text-blue-500 font-semibold">
                          {h.precipitation_probability}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. 7-DAY EXTENDED FORECAST */}
              <section className="bg-card/85 backdrop-blur-md rounded-2xl p-4 border border-border/60 shadow-md space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  7-Day Artistic Forecast
                </h3>

                <div className="divide-y divide-border/60">
                  {weather.daily.map((d, idx) => (
                    <div
                      key={d.date}
                      className="py-2.5 flex items-center justify-between text-sm hover:bg-muted/30 px-2 rounded-lg transition-colors"
                    >
                      <span className="w-24 font-medium text-foreground">
                        {idx === 0 ? "Today" : formatForecastDay(d.date)}
                      </span>

                      <div className="flex items-center gap-2">
                        <WeatherIcon code={d.code} isDay={true} size={28} />
                        <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
                          {describeWeather(d.code)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs font-semibold text-foreground">
                          {Math.round(d.high)}°
                        </span>
                        <span className="text-xs text-muted-foreground w-6">
                          {Math.round(d.low)}°
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 8. WHAT TO WEAR (CASUAL / BUSINESS / SPORTS) */}
              <section className="bg-card/85 backdrop-blur-md rounded-2xl p-4 border border-border/60 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      What to Wear Today
                    </h3>
                  </div>

                  <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs font-semibold">
                    {(["casual", "business", "sports"] as WearCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setWearCategory(cat)}
                        className={`px-2 py-0.5 rounded-md capitalize cursor-pointer transition-colors ${
                          wearCategory === cat
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed">{wear.text}</p>
                  {wear.accessories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-muted-foreground">Pack:</span>
                      {wear.accessories.map((acc) => (
                        <span
                          key={acc}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20"
                        >
                          {acc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>

      {/* 9. MAIN PULL-DOWN MENU MODAL */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-bold text-sm text-foreground">Menu & Settings</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>Languages (14 Available)</span>
              </label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-border bg-muted/50 text-foreground focus:outline-hidden"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Navigation Links */}
            <div className="space-y-1 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setGalleryOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-xs font-semibold text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span>AI City Artwork Gallery</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setBeerModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-xs font-semibold text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Beer className="w-4 h-4 text-amber-500" />
                  <span>Support via Root Beer Tiers</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <a
                href="/privacy"
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-xs font-semibold text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>Privacy Policy & Offline Support</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 10. AI ARTWORK GALLERY MODAL (WITH TIERS + 24H AD UNLOCK INTEGRATED) */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ImageIcon className="w-5 h-5 text-primary" />
                <span>AI City Artwork Gallery</span>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-6">
              {/* ROOT BEER SUPPORTER TIERS (START LOCKED, OPEN AFTER PAYMENT) */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Beer className="w-4 h-4" />
                    <span>Root Beer Supporter Tiers</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Unlock permanently</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.map((tier) => {
                    const unlocked = isTierUnlocked(tier.id);
                    return (
                      <div
                        key={tier.id}
                        className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                          unlocked
                            ? "bg-amber-500/10 border-amber-500/40 text-foreground"
                            : "bg-muted/40 border-border text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            {unlocked ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                            {tier.name}
                          </span>
                          <span className="font-extrabold text-foreground">{tier.displayPrice}</span>
                        </div>

                        <p className="text-[11px] leading-tight line-clamp-2">
                          {tier.tagline || tier.thankYouText}
                        </p>

                        <div className="flex items-center gap-1.5 pt-1">
                          <a
                            href="https://buymeacoffee.com/rod1974b"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1 text-center font-bold text-[10px] rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                          >
                            Buy on BMC
                          </a>

                          <button
                            type="button"
                            onClick={() => handleToggleUnlockTier(tier.id)}
                            className="px-2 py-1 font-semibold text-[10px] rounded-lg border border-border hover:bg-muted text-foreground cursor-pointer"
                            title="Simulate / Confirm Unlock"
                          >
                            {unlocked ? "Revoke" : "Test Unlock"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* CITY ARTWORK SLOTS */}
              <section className="space-y-2.5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>City Artworks & Wallpapers</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Select to set wallpaper</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CURATED_ARTWORKS.map((art) => {
                    const isSelected = activeBg === art.url;
                    const unlocked = isArtworkUnlocked(art);
                    const adActive = isAdUnlocked(art.id);

                    return (
                      <div
                        key={art.id}
                        className={`group relative rounded-xl overflow-hidden border text-left transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 shadow-md"
                            : "border-border/80 hover:border-primary/60"
                        }`}
                      >
                        <div className="relative aspect-4/3 w-full bg-muted overflow-hidden">
                          <img
                            src={art.url}
                            alt={art.name}
                            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                              !unlocked ? "filter blur-[1.5px] brightness-75" : ""
                            }`}
                            loading="lazy"
                          />

                          {/* Top Status Badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            {unlocked ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-green-600/90 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                                <Unlock className="w-2.5 h-2.5" />
                                {adActive ? "24h Pass" : "Unlocked"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md bg-black/80 text-amber-300 text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                                <Lock className="w-2.5 h-2.5" />
                                Locked
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}

                          {/* Lock Overlay with Actions */}
                          {!unlocked && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center gap-1.5">
                              <span className="text-[10px] text-white font-semibold">
                                {art.requiredTier ? `${art.requiredTier.toUpperCase()} Tier` : "Locked Slot"}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => handleWatchAd(art.id, e)}
                                className="w-full py-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-md cursor-pointer transition-colors"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Watch Ad (24h)</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="p-2 bg-card/95">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {art.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {art.city}
                          </span>

                          {unlocked && (
                            <button
                              type="button"
                              onClick={() => handleSelectBg(art.url)}
                              className={`mt-1.5 w-full py-1 text-center font-semibold text-[10px] rounded-lg transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-primary/20 text-foreground"
                              }`}
                            >
                              {isSelected ? "Active Wallpaper" : "Set Wallpaper"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {activeBg && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleSelectBg(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Reset to default sky theme
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. REWARDED AD COUNTDOWN SIMULATOR MODAL */}
      {simulatingAd && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xs w-full p-5 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center animate-bounce">
              <Play className="w-6 h-6 fill-current" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">Sponsor Message</h4>
              <p className="text-xs text-muted-foreground">
                Watching sponsored message to unlock city wallpaper slot for 24 hours...
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-primary font-black text-2xl">
              <Clock className="w-5 h-5 animate-spin" />
              <span>{adCountdown}s</span>
            </div>

            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-1000"
                style={{ width: `${((3 - adCountdown) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 12. ROOT BEER DONATION MODAL */}
      {beerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Beer className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-sm text-foreground">Support My Weather Pal</span>
              </div>
              <button
                type="button"
                onClick={() => setBeerModalOpen(false)}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enjoying the hand-painted watercolor weather forecasts? Select a root beer tier below to support future art:
              </p>

              <div className="space-y-2">
                {ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.map((tier) => (
                  <a
                    key={tier.id}
                    href="https://buymeacoffee.com/rod1974b"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {tier.name}
                      </span>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {tier.tagline}
                      </p>
                    </div>
                    <span className="font-black text-xs text-amber-600 dark:text-amber-400 ml-2">
                      {tier.displayPrice}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. LOCATION PRE-DIALOG */}
      {locationPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <MapPin className="w-5 h-5" />
              <span>Use Your Current Location</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              My Weather Pal requests device coordinates only to fetch your local Open-Meteo forecast. We never store or track your location.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLocationPromptOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestLocation}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
