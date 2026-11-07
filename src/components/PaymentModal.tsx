// src/components/PaymentModal.tsx
import React, { useState } from "react";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  getDonationUrl,
  isMedianAndroidApp,
  purchaseTierViaGooglePlay,
  saveThankYouBackgroundForever,
  setPendingDonationTier,
  type RootBeerTier,
  type DonationProvider,
} from "@/lib/monetization";

interface PaymentModalProps {
  tierId: string;
  onClose: () => void;
  onSuccess?: (tierId: string) => void;
}

export function PaymentModal({ tierId, onClose, onSuccess }: PaymentModalProps) {
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [playBillingLoading, setPlayBillingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tier: RootBeerTier | undefined = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find(
    (t) => t.id === tierId
  );

  if (!tier) return null;

  const isAndroidMedian = typeof window !== "undefined" && isMedianAndroidApp();

  const handleOpenWebPayment = (provider: DonationProvider, label: string) => {
    try {
      setPendingDonationTier(tier.id);
      const url = getDonationUrl(tier.id, provider);
      window.open(url, "_blank", "noopener,noreferrer");
      setSelectedProvider(label);
      setHasOpenedCheckout(true);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not open payment link. Please try again.");
    }
  };

  const handleGooglePlayPurchase = () => {
    setPlayBillingLoading(true);
    setErrorMessage(null);

    purchaseTierViaGooglePlay(
      tier.id,
      () => {
        setPlayBillingLoading(false);
        saveThankYouBackgroundForever(tier.id);
        window.dispatchEvent(
          new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId: tier.id } })
        );
        if (onSuccess) onSuccess(tier.id);
        onClose();
      },
      (err: any) => {
        setPlayBillingLoading(false);
        setErrorMessage(
          err?.message || "Google Play billing was cancelled or unavailable."
        );
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card/95 border border-amber-500/30 rounded-2xl shadow-2xl p-5 overflow-hidden text-foreground max-h-[92vh] flex flex-col">
        {/* Amber Glow Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm transition cursor-pointer"
        >
          ✕
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto pr-1">
          {/* Tier Header */}
          <div className="flex items-center gap-3.5 mb-3 pr-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/30 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {tier.files?.staticTransparent ? (
                <img
                  src={tier.files.staticTransparent}
                  alt={tier.name}
                  className="w-10 h-10 object-contain drop-shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                "🍺"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground truncate">
                  {tier.name}
                </h3>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                  {tier.displayPrice}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {tier.bonus.label}
              </p>
            </div>
          </div>

          {/* Tier Perks Breakdown Card */}
          {tier.perks && (
            <div className="mb-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2">
              {tier.tagline && (
                <p className="text-[11px] italic text-amber-700 dark:text-amber-300 font-medium pb-1.5 border-b border-amber-500/20">
                  "{tier.tagline}"
                </p>
              )}
              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🎨</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">Skies:</strong> {tier.perks.backgrounds}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">✨</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">AI Art:</strong> {tier.perks.aiGenerations}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🐻</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">Mascots:</strong> {tier.perks.mascots}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🚫</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">Ad-Free:</strong> {tier.perks.adFree}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🎉</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">Celebration:</strong> {tier.perks.celebration}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error notification if any */}
          {errorMessage && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          {!hasOpenedCheckout ? (
            /* Step 1: Pick payment method */
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Select how you'd like to support:
              </p>

              {/* 1. Debit or Credit Card / Apple Pay (Buy Me a Coffee Extra Link) */}
              <button
                type="button"
                onClick={() => handleOpenWebPayment("buymeacoffee", "Debit or Credit Card")}
                className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-700/15 hover:from-amber-500/25 hover:to-amber-700/25 border border-amber-500/50 hover:border-amber-500/70 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Debit or Credit Card
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-700 dark:text-amber-300">
                        No account needed
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Visa, Mastercard, Amex, Apple Pay & Google Pay
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </button>

              {/* 2. PayPal Option */}
              <button
                type="button"
                onClick={() => handleOpenWebPayment("paypal", "PayPal")}
                className="w-full text-left p-3 rounded-xl bg-card/80 hover:bg-muted/60 border border-border/80 hover:border-amber-500/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🅿️</span>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      PayPal
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Pay with PayPal account
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </button>

              {/* 3. Google Play (If on Android APK) */}
              {isAndroidMedian && (
                <button
                  type="button"
                  onClick={handleGooglePlayPurchase}
                  disabled={playBillingLoading}
                  className="w-full text-left p-3 rounded-xl bg-card/80 hover:bg-muted/60 border border-border/80 hover:border-amber-500/40 transition shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">▶️</span>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Google Play Store
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          In-App Purchase
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {playBillingLoading
                          ? "Connecting to Google Play..."
                          : "Charge to your saved Google Play card"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform">
                    {playBillingLoading ? "⏳" : "→"}
                  </span>
                </button>
              )}

              <div className="pt-2 text-center">
                <p className="text-[10px] text-muted-foreground">
                  🔒 Secure, SSL-encrypted checkout powered by Buy Me a Coffee.
                </p>
              </div>
            </div>
          ) : (
            /* Step 2: Auto-Redirect Notice */
            <div className="py-2 space-y-3.5 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl animate-pulse">
                ☕
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Checkout Opened on {selectedProvider}
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Complete your donation in the Buy Me a Coffee tab that just opened.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs text-left space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Automatic Verification</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  As soon as your card payment is confirmed, Buy Me a Coffee will automatically return you here and your bonus perks will unlock instantly!
                </p>
              </div>

              <div className="pt-2 space-y-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => handleOpenWebPayment("buymeacoffee", "Buy Me a Coffee")}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition cursor-pointer"
                >
                  Re-open Buy Me a Coffee Page
                </button>
                <button
                  type="button"
                  onClick={() => setHasOpenedCheckout(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline transition cursor-pointer block mx-auto"
                >
                  Choose another payment option
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
