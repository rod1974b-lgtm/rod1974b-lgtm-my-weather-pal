// src/components/AiGalleryModal.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  LANDMARK_TITLES,
  LANDMARK_WATERCOLORS,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";

interface AiGalleryModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  city?: string;
  cityName?: string;
  country?: string;
  weatherCode?: number;
  weatherDesc?: string;
  activeBackground?: string;
  activeBg?: string | null;
  tempC?: number;
  currentTemp?: number;
  isDay?: number | undefined;
  onSelectBackground?: (url: string) => void;
  onSelectBg?: (url: string) => void;
}

interface SavedArtItem {
  id: string;
  url: string;
  label: string;
  date?: string;
}

const STORAGE_SAVED_KEY = "weather:custom-art-saved";

export function AiGalleryModal(props: AiGalleryModalProps) {
  const { t } = useTranslation();
  const isOpen = props.isOpen ?? props.open ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    props.onClose?.();
    props.onOpenChange?.(false);
  };

  const activeCity = props.city || props.cityName || "Bangkok";
  const activeBackground = props.activeBackground || props.activeBg || "";

  const [activeTab, setActiveTab] = useState<"curated" | "saved" | "generate">("curated");
  const [curatedList, setCuratedList] = useState<{ url: string; title: string }[]>([]);
  const [savedArts, setSavedArts] = useState<SavedArtItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load curated artworks and persistent saved artwork collection
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      const cityKey = activeCity.toLowerCase().trim();
      let cityCatalogUrls: string[] = [];
      for (const [name, urls] of Object.entries(LANDMARK_WATERCOLORS)) {
        if (cityKey.includes(name)) {
          cityCatalogUrls = urls;
          break;
        }
      }

      const rawList =
        cityCatalogUrls.length > 0
          ? cityCatalogUrls
          : getAllAvailableArtworks(
              activeCity,
              props.weatherCode ?? 0,
              props.weatherDesc ?? "clear",
              props.country
            );

      const normalized = (rawList || [])
        .map((item: any, idx: number) => {
          const url = typeof item === "string" ? item : item?.url || "";
          if (!url) return null;

          const title =
            LANDMARK_TITLES[url] ||
            item?.title ||
            (idx === 0 ? `${activeCity} Landmark` : `${activeCity} View #${idx + 1}`);

          return { url, title };
        })
        .filter((item): item is { url: string; title: string } => Boolean(item?.url));

      setCuratedList(normalized);

      try {
        const raw = localStorage.getItem(STORAGE_SAVED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSavedArts(parsed);
          }
        }
      } catch {
        setSavedArts([]);
      }
    }
  }, [isOpen, activeCity, props.weatherCode, props.weatherDesc, props.country]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    props.onSelectBackground?.(url);
    props.onSelectBg?.(url);

    try {
      const storageKey = `weather:custom-bg:${activeCity.toLowerCase().trim()}`;
      if (url) {
        localStorage.setItem(storageKey, url);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}

    handleClose();
  };

  const handleClearSaved = () => {
    if (window.confirm("Remove all saved artworks from your gallery?")) {
      localStorage.removeItem(STORAGE_SAVED_KEY);
      setSavedArts([]);
    }
  };

  const handleDeleteSingleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedArts.filter((item) => item.id !== id);
    setSavedArts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveToCollection = (url: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!url) return;

    if (savedArts.some((art) => art.url === url)) {
      return;
    }

    const newArt: SavedArtItem = {
      id: Date.now().toString(),
      url,
      label,
      date: new Date().toLocaleDateString(),
    };

    const updated = [newArt, ...savedArts.slice(0, 19)];
    setSavedArts(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        const newArt: SavedArtItem = {
          id: Date.now().toString(),
          url: result,
          label: `${activeCity} — ${file.name.replace(/\.[^/.]+$/, "")}`,
          date: new Date().toLocaleDateString(),
        };

        const updated = [newArt, ...savedArts.slice(0, 14)];
        setSavedArts(updated);
        try {
          localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
          localStorage.setItem(`weather:custom-bg:${activeCity.toLowerCase().trim()}`, result);
        } catch {}

        props.onSelectBackground?.(result);
        props.onSelectBg?.(result);
        setActiveTab("saved");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await generateWatercolorFn({
        data: {
          city: activeCity,
          userPrompt: prompt.trim(),
          weatherDesc: props.weatherDesc,
        },
      });

      if (!res?.imageUrl) {
        throw new Error("No image was returned from the generator.");
      }

      const newArt: SavedArtItem = {
        id: Date.now().toString(),
        url: res.imageUrl,
        label: `${activeCity} — ${prompt.trim()}`,
        date: new Date().toLocaleDateString(),
      };

      const updated = [newArt, ...savedArts.filter((item) => item.url !== res.imageUrl).slice(0, 19)];
      setSavedArts(updated);
      try {
        localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
        localStorage.setItem(`weather:custom-bg:${activeCity.toLowerCase().trim()}`, res.imageUrl);
      } catch {}

      props.onSelectBackground?.(res.imageUrl);
      props.onSelectBg?.(res.imageUrl);
      setPrompt("");
      handleClose();
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setErrorMessage(err?.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {t("gallery_title", "AI & Landmark Art Gallery")}
              </h3>
              <p className="text-[11px] text-muted-foreground">{activeCity}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/40 px-4 gap-2 pt-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab("curated")}
            className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
              activeTab === "curated"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_curated", "Curated Landmarks")} ({curatedList.length})
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
              activeTab === "saved"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_saved", "Saved & Created")} ({savedArts.length})
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
              activeTab === "generate"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ✨ {t("tab_generate", "Generate with AI")}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-2 font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: CURATED LANDMARKS */}
          {activeTab === "curated" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Select any landmark to set it as the live watercolor background for <strong>{activeCity}</strong>.
              </p>

              {curatedList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  No curated scenes found for this city. Use the Generate tab to create one!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {curatedList.map((art, idx) => {
                    const isCurActive = activeBackground === art.url;
                    const isAlreadySaved = savedArts.some((s) => s.url === art.url);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(art.url)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-video transition-all shadow-xs ${
                          isCurActive
                            ? "border-primary ring-2 ring-primary/50 shadow-md"
                            : "border-border hover:border-primary/60 hover:shadow"
                        }`}
                      >
                        <img
                          src={art.url}
                          alt={art.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        <span className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white truncate drop-shadow-xs">
                          {art.title}
                        </span>

                        {isCurActive && (
                          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                            {t("gallery_active_badge", "Active")}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleSaveToCollection(art.url, art.title, e)}
                          title={isAlreadySaved ? "Saved" : "Save to my collection"}
                          className={`absolute top-2 right-2 p-1 rounded-full text-xs transition backdrop-blur-md cursor-pointer ${
                            isAlreadySaved
                              ? "bg-amber-500/80 text-white"
                              : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60"
                          }`}
                        >
                          {isAlreadySaved ? "★" : "☆"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED & USER CREATIONS */}
          {activeTab === "saved" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {savedArts.length} saved creations
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="px-2.5 py-1 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition cursor-pointer"
                  >
                    📁 {t("gallery_upload", "Upload Photo")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {savedArts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSaved}
                      className="text-xs text-destructive hover:underline cursor-pointer"
                    >
                      {t("clear_all", "Clear All")}
                    </button>
                  )}
                </div>
              </div>

              {savedArts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                  <p>No saved artworks yet.</p>
                  <p className="text-[11px]">
                    Bookmark scenes from the Curated tab, create new ones with AI, or upload your own photo!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedArts.map((art) => {
                    const isCurActive = activeBackground === art.url;

                    return (
                      <div
                        key={art.id}
                        onClick={() => handleSelect(art.url)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-video transition-all shadow-xs ${
                          isCurActive
                            ? "border-primary ring-2 ring-primary/50 shadow-md"
                            : "border-border hover:border-primary/60 hover:shadow"
                        }`}
                      >
                        <img
                          src={art.url}
                          alt={art.label}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        <span className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white truncate drop-shadow-xs">
                          {art.label}
                        </span>

                        {isCurActive && (
                          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                            {t("gallery_active_badge", "Active")}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleSaved(art.id, e)}
                          title="Remove from saved"
                          className="absolute top-2 right-2 p-1 rounded-full text-xs bg-black/40 text-white/80 hover:text-destructive hover:bg-black/60 transition backdrop-blur-md cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERATE WITH AI */}
          {activeTab === "generate" && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                Enter any scene description to generate a unique custom watercolor for <strong>{activeCity}</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Scene Description
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe a scenic watercolor view for ${activeCity}...`}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1.5">
                  Or pick a suggestion:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `Khao Ngu limestone peaks across the emerald lake`,
                    `Damnoen Saduak wooden canal boats in morning mist`,
                    `Golden temple stupa reflection in river at sunset`,
                    `Tropical bay with longtail boats and limestone cliffs`,
                    `Ancient Khmer temple tower at golden hour`,
                  ].map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrompt(sug)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition text-left cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="px-4 py-1.5 rounded-xl text-xs bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin inline-block">↻</span>
                      <span>Generating Art...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate Scene</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
