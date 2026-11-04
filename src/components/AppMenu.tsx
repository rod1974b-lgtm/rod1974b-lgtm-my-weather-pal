// src/components/AppMenu.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "./LanguageSelector";
import type { WeatherUnit } from "@/lib/weather";

interface AppMenuProps {
  unit: WeatherUnit;
  onUnitChange: (unit: WeatherUnit) => void;
  onOpenAiGallery?: () => void;
}

export function AppMenu({ unit, onUnitChange, onOpenAiGallery }: AppMenuProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [skyPref, setSkyPref] = useState("auto");
  const [fontSize, setFontSize] = useState("100%");
  const [currentLang, setCurrentLang] = useState(() => {
    return i18n?.language?.toLowerCase().split("-")[0] || "en";
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic sky presets with translations
  const skyOptions = [
    { value: "auto", label: t("sky_auto", "Auto (weather)") },
    { value: "day", label: t("sky_clear_day", "Clear Day") },
    { value: "night", label: t("sky_clear_night", "Clear Night") },
    { value: "cloudy", label: t("sky_cloudy_day", "Overcast / Cloudy") },
    { value: "rain", label: t("sky_rain", "Rain / Storm") },
    { value: "sunset", label: t("sunset", "Sunset Glow") },
  ];

  // Dynamic font size options with translations
  const fontSizes = [
    { value: "100%", label: t("font_normal", "Normal (100%)") },
    { value: "115%", label: t("font_large", "Large (115%)") },
    { value: "130%", label: t("font_xlarge", "Huge (130%)") },
  ];

  // Restore saved preferences
  useEffect(() => {
    try {
      const storedSky = localStorage.getItem("weather:sky-pref") || "auto";
      setSkyPref(storedSky);

      const storedFont = localStorage.getItem("weather:font-size") || "100%";
      setFontSize(storedFont);
      document.documentElement.style.fontSize = storedFont;

      const savedLang =
        localStorage.getItem("weather:lang") ||
        localStorage.getItem("app_language") ||
        i18n?.language;
      if (savedLang) {
        setCurrentLang(savedLang.toLowerCase().split("-")[0] || "en");
      }
    } catch {}
  }, [i18n?.language]);

  // Reliable mobile outside-tap listener
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const handleSkyChange = (val: string) => {
    setSkyPref(val);
    try {
      localStorage.setItem("weather:sky-pref", val);
      window.dispatchEvent(
        new CustomEvent("weather:sky-change", { detail: { sky: val } })
      );
    } catch {}
  };

  const handleFontChange = (val: string) => {
    setFontSize(val);
    try {
      localStorage.setItem("weather:font-size", val);
      document.documentElement.style.fontSize = val;
    } catch {}
  };

  const handleLanguageSelect = (code: string) => {
    setCurrentLang(code);
    try {
      if (typeof i18n?.changeLanguage === "function") {
        i18n.changeLanguage(code);
      }
      localStorage.setItem("weather:lang", code);
      localStorage.setItem("app_language", code);
      localStorage.setItem("i18nextLng", code);
      if (typeof document !== "undefined") {
        document.documentElement.lang = code;
      }
      window.dispatchEvent(
        new CustomEvent("weather:lang-change", { detail: code })
      );
      // Brief delay so mobile users see the checkmark before menu closes
      setTimeout(() => {
        setOpen(false);
      }, 150);
    } catch (err) {
      console.error("Language switch error:", err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("settings", "Settings")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs hover:bg-muted transition cursor-pointer"
      >
        <span className="text-base select-none">⚙️</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-sm font-bold text-foreground">
              {t("settings", "Settings")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* Units */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("units", "Units")}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUnitChange("metric")}
                className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  unit === "metric"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                °C • Metric
              </button>
              <button
                type="button"
                onClick={() => onUnitChange("imperial")}
                className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  unit === "imperial"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                °F • US
              </button>
            </div>
          </div>

          {/* Sky background */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("sky_background", "Sky Background")}
            </label>
            <select
              value={skyPref}
              onChange={(e) => handleSkyChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {skyOptions.map((s) => (
                <option key={s.value} value={s.value} className="bg-card text-foreground">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text size */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("text_size", "Text Size")}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {fontSizes.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFontChange(f.value)}
                  className={`py-1.5 px-1 text-xs font-medium rounded-lg transition text-center truncate cursor-pointer ${
                    fontSize === f.value
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages (Instant Touch & Click for Mobile & PC) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("language", "Language")}
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {LANGUAGES.map((lang) => {
                const isActive =
                  currentLang === lang.code ||
                  (lang.code === "en" && currentLang.startsWith("en"));
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageSelect(lang.code)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleLanguageSelect(lang.code);
                    }}
                    style={{ touchAction: "manipulation" }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition text-left cursor-pointer border active:scale-95 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    <span className="text-base leading-none select-none">{lang.flag}</span>
                    <span className="truncate flex-1">{lang.native}</span>
                    {isActive && <span className="text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <Link
                to="/gallery"
                onClick={() => setOpen(false)}
                className="hover:text-foreground underline underline-offset-2 font-medium"
              >
                🎨 {t("city_art", "City Art")}
              </Link>
              {onOpenAiGallery && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenAiGallery();
                  }}
                  className="hover:text-foreground underline underline-offset-2 font-medium cursor-pointer"
                >
                  ✨ {t("art_gallery", "AI Gallery")}
                </button>
              )}
              <Link
                to="/privacy"
                onClick={() => setOpen(false)}
                className="hover:text-foreground underline underline-offset-2"
              >
                {t("privacy_policy", "Privacy")}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition cursor-pointer"
            >
              {t("close", "Close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppMenu;
