// src/components/RootBeerThankYou_DEEPER_AMBER.tsx
import { useState } from "react";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  saveThankYouBackgroundForever,
  isThankYouBackgroundUnlocked,
} from "@/lib/monetization";

interface ThankYouProps {
  tierId:
    | "small_root_beer_tier"
    | "medium_root_beer_tier"
    | "large_root_beer_tier"
    | "party_pack_root_beer_tier";
  onClose?: () => void;
}

export function RootBeerThankYou({ tierId, onClose }: ThankYouProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() =>
    isThankYouBackgroundUnlocked(tierId)
  );

  const tier = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);
  if (!tier) return null;

  const handleUnlock = () => {
    saveThankYouBackgroundForever(tierId);
    setUnlocked(true);
    if (onClose) {
      setTimeout(onClose, 800);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-800/30">
      {/* Background Video overlay (for Large and Party Pack tiers) */}
      {tier.files.video && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-25 pointer-events-none"
        >
          <source src={tier.files.video} type="video/mp4" />
        </video>
      )}

      {/* Mascot & Mug Graphic */}
      <div className="p-6 flex items-center justify-center min-h-[220px]">
        <img
          src={tier.files.staticTransparent}
          alt={tier.thankYouText}
          className="max-h-56 w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* Floating Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-3 left-4 text-amber-500 animate-pulse text-lg">✨</div>
        <div className="absolute top-8 right-6 text-yellow-500 animate-pulse text-base delay-150">⭐</div>
        <div className="absolute bottom-16 left-6 text-amber-600 animate-bounce text-sm">🍺</div>
      </div>

      {/* Keep background forever action */}
      <div className="px-6 pb-6 text-center">
        <button
          onClick={handleUnlock}
          className="w-full bg-white/95 hover:bg-white text-amber-950 px-4 py-2.5 rounded-full text-xs font-semibold shadow-md transition active:scale-95 border border-amber-200"
        >
          {unlocked ? "✓ Background Kept Forever ✨" : "Keep this background forever ✨"}
        </button>
      </div>

      {/* Deeper Amber Ribbon Tag */}
      <div className="bg-gradient-to-r from-[#7a3b0e] via-[#8B4513] to-[#7a3b0e] text-amber-100 px-6 py-2.5 text-center shadow-inner">
        <p className="text-xs sm:text-sm font-bold tracking-wide">{tier.thankYouText}</p>
      </div>
    </div>
  );
}

export default RootBeerThankYou;
