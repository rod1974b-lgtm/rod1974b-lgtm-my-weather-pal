import { createFileRoute, Link } from "@tanstack/react-router";

const DESC =
  "Privacy Policy for My Weather Pal: private local weather, AI watercolor generation, on-device IndexedDB storage, and no advertising trackers.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — My Weather Pal" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Privacy Policy — My Weather Pal" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

const EMAIL = "rod1974b@gmail.com";
const ANDROID_PACKAGE = "co.median.android.odeqrey";

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        ← Back to weather
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: November 2, 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p>
          This Privacy Policy explains how <strong>My Weather Pal</strong> (Android package{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{ANDROID_PACKAGE}</code> and web application,
          "the App", "we", "us") handles information. We believe in private-by-default software: no account registration,
          no advertising trackers, no surveillance, and zero personal profiling.
        </p>

        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. No Account Required</h2>
          <p>
            You can use all features of My Weather Pal without signing up, logging in, or providing any personal details
            such as your name, email address, phone number, or payment details.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Weather & Location Data</h2>
          <p>
            When you tap the location button, the App requests your device's GPS coordinates (approximate or precise)
            solely to fetch live local forecasts, air quality indices, and disaster alerts for your area:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>On-Demand Only:</strong> Location is only accessed when you explicitly tap the GPS button. You can
              always choose to search for a city manually instead.
            </li>
            <li>
              <strong>Reverse Geocoding:</strong> Coordinates are resolved to a readable place name using the privacy-focused
              Photon (OpenStreetMap) service.
            </li>
            <li>
              <strong>Zero Movement Tracking:</strong> We do not log your movement, record travel history, or store GPS
              coordinates on our servers. Requests are sent directly from your device to the weather data providers.
            </li>
            <li>
              <strong>Permission Controls:</strong> You can revoke location access at any time in your Android device
              settings (<em>Settings → Apps → My Weather Pal → Permissions</em>) or browser settings.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. AI Gallery & Image Processing</h2>
          <p>
            My Weather Pal features an AI Watercolor Gallery that displays city landmark art, allows generating custom
            watercolor scenes, and supports personal background photos:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>AI Scene Generation:</strong> When you describe a custom watercolor scene, the text prompt and city name
              are transmitted securely over HTTPS to the AI generation gateway to synthesize the artwork. These prompts are
              ephemeral, not linked to any user identity, and not used to build personal profiles.
            </li>
            <li>
              <strong>User-Uploaded Photos:</strong> If you select a photo from your camera or photo library as a custom
              background, the image is compressed and processed <em>entirely on-device</em> using an off-screen HTML canvas.
              Your photos are <strong>never uploaded to our servers or any cloud storage</strong>.
            </li>
            <li>
              <strong>Local IndexedDB Storage:</strong> All created watercolor scenes and uploaded background photos are
              stored exclusively on your device inside an on-device database (<code>WeatherPalArtDB</code>). They never leave
              your device.
            </li>
            <li>
              <strong>Landmark Photography:</strong> For select cities, public landmark photographs are loaded from Wikipedia
              and Wikimedia Commons to illustrate local culture. No personal data is sent during these image fetches.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. On-Device Storage (LocalStorage & IndexedDB)</h2>
          <p>
            The App uses on-device browser storage (<code>localStorage</code> and <code>IndexedDB</code>) to preserve your
            preferences between sessions and enable offline functionality:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Favorite cities and recent searches (<code>weather:favorites</code>).</li>
            <li>Measurement units (°C / °F, km/h / mph) and text size preferences (<code>weather:units</code>, <code>weather:font-size</code>).</li>
            <li>Sky background themes and clothing occasion filters (<code>weather:sky-pref</code>, <code>weather:wear-category</code>).</li>
            <li>Selected language preference (<code>weather:lang</code>).</li>
            <li>Cached weather forecasts for instant loading and offline viewing.</li>
            <li>Your custom artwork collection and city background assignments.</li>
          </ul>
          <p>
            This data never leaves your device. You can erase all stored data at any time by clearing the App data in
            Android Settings or clearing browser site data.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Third-Party Data Providers</h2>
          <p>
            To deliver real-time weather, warnings, and artwork, the App connects over secure HTTPS to these services:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <a className="underline hover:text-foreground" href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">
                Open-Meteo
              </a>{" "}
              — Hourly/7-day weather forecasts, air quality (AQI), UV index, and river discharge flood advisories.
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://photon.komoot.io" target="_blank" rel="noreferrer">
                Photon (Komoot / OpenStreetMap)
              </a>{" "}
              — City name search and GPS reverse-geocoding.
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://data.tmd.go.th" target="_blank" rel="noreferrer">
                Thai Meteorological Department (TMD)
              </a>{" "}
              — Official weather warnings, heavy rain alerts, and monsoon bulletins for Thailand.
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://www.usgs.gov/privacy-policies" target="_blank" rel="noreferrer">
                USGS (United States Geological Survey)
              </a>{" "}
              — Global earthquake and seismic activity feeds (M4.5+).
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://www.weather.gov/privacy" target="_blank" rel="noreferrer">
                U.S. National Weather Service (NWS)
              </a>{" "}
              — Severe weather warnings and watches.
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" target="_blank" rel="noreferrer">
                Wikimedia / Wikipedia API
              </a>{" "}
              — Public domain and Creative Commons landmark imagery for cities.
            </li>
            <li>
              <strong>AI Gateway (OpenAI Image Model):</strong> On-demand watercolor generation for custom user prompts.
            </li>
            <li>
              <strong>Median.co:</strong> The platform used to package the web application into an installable Android APK.
            </li>
          </ul>
          <p>
            These providers may receive your IP address and the parameters (such as coordinates or city name) required to
            answer your request. Their handling of requests is governed by their respective privacy policies.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. What We Never Do</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>We do <strong>not</strong> sell, rent, broker, or monetize your data.</li>
            <li>We do <strong>not</strong> embed third-party advertising SDKs, banner networks, or cross-app trackers.</li>
            <li>We do <strong>not</strong> access your address book, microphone, contacts, or calendar.</li>
            <li>We do <strong>not</strong> transmit personal photos from your device to any cloud storage.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">7. Data Retention & Deletion Rights (GDPR & CCPA)</h2>
          <p>
            Because we do not operate a centralized database or store user accounts, we do not retain identifiable personal
            records. You retain complete authority over your data:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Delete Stored Data:</strong> Clear the App storage or browser cache to wipe all saved cities, settings, and paintings immediately.</li>
            <li><strong>Revoke Permissions:</strong> Disable Location access anytime in your device settings.</li>
            <li><strong>Uninstall:</strong> Removing the App completely removes all local data files created by the App.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">8. Children's Privacy</h2>
          <p>
            My Weather Pal is a general-audience utility designed to be safe for all ages. We do not knowingly collect,
            solicit, or store personal information from children under the age of 13 (or under 16 in the European Union),
            in full compliance with COPPA and GDPR.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
          <p>
            We may occasionally update this Privacy Policy as new features or data providers are integrated. Any changes
            will be published directly on this page with an updated "Last updated" date.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-2 border-t border-border/40 pt-4">
          <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
          <p>
            If you have questions, feedback, or data privacy requests regarding My Weather Pal, please reach out directly:
          </p>
          <p>
            Email:{" "}
            <a className="font-medium underline hover:text-foreground" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
