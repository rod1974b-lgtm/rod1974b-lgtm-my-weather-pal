import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CloudSun, Compass, Droplets, LoaderCircle, MapPin, Search, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherIcon } from "@/components/WeatherIcon";
import {
  DEFAULT_PLACE,
  describeWeather,
  fetchWeather,
  formatForecastDay,
  formatForecastTime,
  readCachedWeather,
  readSavedPlace,
  readUnit,
  savePlace,
  saveUnit,
  searchCities,
  type CityResult,
  type Place,
  type Weather,
  type WeatherUnit,
} from "@/lib/weather";

const LOCAL_ART: Record<string, string> = {
  Bangkok: "/backgrounds/vibrant/ratchaburi_haze.jpg",
  Ratchaburi: "/backgrounds/vibrant/ratchaburi_haze.jpg",
  Zurich: "/backgrounds/vibrant/snow_swiss.jpg",
  Default: "/backgrounds/vibrant/ratchaburi_haze.jpg",
  Rain: "/backgrounds/vibrant/storm.jpg",
};

export function WeatherDashboard() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locationDialog, setLocationDialog] = useState(false);
  const [locationError, setLocationError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const savedPlace = readSavedPlace();
    const savedUnit = readUnit();
    if (savedPlace) setPlace(savedPlace);
    setUnit(savedUnit);
    const cached = readCachedWeather(savedPlace ?? DEFAULT_PLACE, savedUnit);
    if (cached) {
      setWeather(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    const cached = readCachedWeather(place, unit);
    if (cached) setWeather(cached);
    setLoading(!cached);
    setOffline(false);

    void fetchWeather(place, unit)
      .then((result) => {
        if (requestId.current === id) setWeather(result);
      })
      .catch(() => {
        if (requestId.current === id) {
          if (cached) setWeather(cached);
          setOffline(true);
        }
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });

    return () => {
      requestId.current += 1;
    };
  }, [place, unit]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setSuggestions([]);
      setSearchError("");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      void searchCities(value)
        .then((results) => {
          if (!cancelled) {
            setSuggestions(results);
            setSearchError("");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setSearchError("City search is unavailable. Try again when online.");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const choosePlace = (next: Place) => {
    setPlace(next);
    savePlace(next);
    setQuery("");
    setSuggestions([]);
    setLocationError("");
  };

  const askForLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser. Search for a city instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearby: Place = { name: "My location", latitude, longitude };
        choosePlace(nearby);

        void fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`,
        )
          .then((response) => response.json())
          .then((payload: { results?: { name: string; country?: string }[] }) => {
            const result = payload.results?.[0];
            if (result) {
              choosePlace({ ...nearby, name: result.name, country: result.country });
            }
          })
          .catch(() => undefined);

        setLocationDialog(false);
      },
      () => setLocationError("Location wasn’t shared. You can search for a city instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const changeUnit = (next: WeatherUnit) => {
    setUnit(next);
    saveUnit(next);
  };

  const weatherLabel = weather ? describeWeather(weather.current.code) : null;
  const cityName = place.name.split(",")[0]?.trim() ?? "";
  const heroImage =
    LOCAL_ART[cityName] ??
    (weather?.current.code && weather.current.code >= 51 ? LOCAL_ART["Rain"] : LOCAL_ART["Default"]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-7 lg:px-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 text-foreground no-underline" aria-label="My Weather Pal home">
          <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground">
            <CloudSun size={25} />
          </span>
          <span>
            <strong className="block text-lg font-semibold leading-tight">My Weather Pal</strong>
            <span className="text-xs text-muted-foreground">A little closer to the sky</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/gallery"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            City art
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/privacy">Privacy</Link>
          </Button>
        </nav>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <label className="sr-only" htmlFor="city-search">
            Search for a city
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            ref={searchRef}
            id="city-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggestions([]);
            }}
            placeholder="Search city or town"
            autoComplete="off"
            className="h-12 w-full rounded-md border border-input bg-card pl-11 pr-11 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searching && (
            <LoaderCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={17} />
          )}
          {suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-auto border border-border bg-popover p-1 shadow-lg">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => choosePlace(suggestion)}
                    className="flex w-full items-center justify-between rounded-sm px-3 py-3 text-left text-sm hover:bg-muted"
                  >
                    <span>{suggestion.name}</span>
                    <span className="text-xs text-muted-foreground">{suggestion.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchError && (
            <p className="mt-2 text-sm text-destructive" role="status">
              {searchError}
            </p>
          )}
        </div>
        <Button variant="outline" className="h-12" onClick={() => setLocationDialog(true)}>
          <MapPin size={17} /> Use my location
        </Button>
      </section>

      {locationDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLocationDialog(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
            className="w-full max-w-md rounded-md border border-border bg-background p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-3 grid size-10 place-items-center rounded-md bg-accent text-accent-foreground">
                  <Compass size={21} />
                </div>
                <h2 id="location-title" className="text-xl font-semibold">
                  Use your location?
                </h2>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close location dialog" onClick={() => setLocationDialog(false)}>
                <X />
              </Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Your device’s location is used once to look up the weather nearby. It stays on your device and is not sent to My Weather Pal.
            </p>
            {locationError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {locationError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLocationDialog(false)}>
                Not now
              </Button>
              <Button onClick={askForLocation}>Continue</Button>
            </div>
          </section>
        </div>
      )}

      <section className="relative min-h-[310px] overflow-hidden rounded-md bg-muted sm:min-h-[370px]">
        <img src={heroImage} alt="Watercolor city landscape" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/15 to-transparent" />
        <div
          className="absolute right-4 top-4 flex rounded-md border border-background/40 bg-background/90 p-1 shadow-sm"
          aria-label="Temperature units"
        >
          {(["metric", "imperial"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={unit === value}
              onClick={() => changeUnit(value)}
              className={`min-w-12 rounded-sm px-2.5 py-1.5 text-xs font-semibold ${
                unit === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              {value === "metric" ? "°C" : "°F"}
            </button>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 text-background sm:p-8">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-background/85">
              <MapPin size={14} />
              {place.country ? `${place.name} · ${place.country}` : place.name}
            </p>
            <p className="text-7xl font-light leading-none">
              {weather ? Math.round(weather.current.temperature) : "—"}
              <span className="text-4xl">°</span>
            </p>
            <p className="mt-3 text-lg font-medium">
              {weatherLabel?.label ?? (loading ? "Checking the forecast…" : "Weather unavailable")}
            </p>
            <p className="mt-1 text-sm text-background/80">
              Feels like {weather ? Math.round(weather.current.feelsLike) : "—"}°
            </p>
          </div>
          {weather && (
            <div className="mb-2 mr-2">
              <WeatherIcon
                wmoCode={weather.current.code}
                isDay={weather.current.isDay}
                className="size-20 drop-shadow-md"
              />
            </div>
          )}
        </div>
      </section>

      {offline && (
        <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
          {weather
            ? `Showing your last saved forecast · ${new Date(weather.fetchedAt).toLocaleString()}`
            : "You’re offline. Connect once to load a forecast."}
        </p>
      )}

      <section className="mt-4 grid grid-cols-3 border-y border-border py-4">
        <div className="flex items-center justify-center gap-2 border-r border-border px-2">
          <Droplets size={17} className="text-primary" />
          <span className="text-xs text-muted-foreground">Humidity</span>
          <strong className="text-sm">{weather ? `${weather.current.humidity}%` : "—"}</strong>
        </div>
        <div className="flex items-center justify-center gap-2 border-r border-border px-2">
          <Wind size={17} className="text-primary" />
          <span className="text-xs text-muted-foreground">Wind</span>
          <strong className="text-sm">
            {weather ? `${Math.round(weather.current.wind)} ${unit === "metric" ? "km/h" : "mph"}` : "—"}
          </strong>
        </div>
        <div className="flex items-center justify-center gap-2 px-2">
          <CloudSun size={17} className="text-primary" />
          <span className="text-xs text-muted-foreground">Today</span>
          <strong className="text-sm">
            {weather ? `${Math.round(weather.daily[0]?.high ?? 0)}° / ${Math.round(weather.daily[0]?.low ?? 0)}°` : "—"}
          </strong>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="hourly-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="hourly-title" className="text-lg font-semibold">
            Today, hour by hour
          </h2>
          <span className="text-xs text-muted-foreground">Next 24 hours</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {weather?.hourly.map((hour, index) => (
            <div
              key={hour.time}
              className="flex min-w-[76px] flex-col items-center gap-2 border-r border-border px-3 py-2 last:border-none"
            >
              <span className="text-xs text-muted-foreground">
                {index === 0 ? "Now" : formatForecastTime(hour.time, weather.timezone)}
              </span>
              <WeatherIcon wmoCode={hour.code} className="size-8" />
              <strong className="text-sm">{Math.round(hour.temperature)}°</strong>
              <span className="text-xs text-muted-foreground">{Math.round(hour.precipitation)}%</span>
            </div>
          )) ?? (
            <p className="py-6 text-sm text-muted-foreground">
              {loading ? "Loading the hourly forecast…" : "Hourly forecast is unavailable offline."}
            </p>
          )}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="week-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="week-title" className="text-lg font-semibold">
            Next 7 days
          </h2>
          <span className="text-xs text-muted-foreground">High · low</span>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {weather?.daily.map((day, index) => (
            <div key={day.date} className="grid grid-cols-[1fr_50px_1fr_auto] items-center gap-2 py-3">
              <span className="text-sm font-medium">
                {index === 0 ? "Today" : formatForecastDay(day.date, weather.timezone)}
              </span>
              <WeatherIcon wmoCode={day.code} className="size-7" />
              <div className="flex justify-end gap-3 text-sm">
                <strong>{Math.round(day.high)}°</strong>
                <span className="text-muted-foreground">{Math.round(day.low)}°</span>
              </div>
              <span className="min-w-12 text-right text-xs text-muted-foreground">{Math.round(day.precipitation)}%</span>
            </div>
          )) ?? (
            <p className="py-5 text-sm text-muted-foreground">
              {loading ? "Loading the 7-day forecast…" : "Weekly forecast is unavailable offline."}
            </p>
          )}
        </div>
      </section>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Forecast data by Open-Meteo</span>
        <span className="flex gap-4">
          <Link to="/gallery" className="hover:text-foreground">
            Explore city art
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </span>
      </footer>

      {loading && !weather && (
        <div className="sr-only" role="status">
          <LoaderCircle /> Loading forecast
        </div>
      )}
    </main>
  );
}
