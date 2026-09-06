/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship TypeScript source directly; Next.js transpiles
  // them as part of the app build instead of requiring a separate package
  // build step.
  transpilePackages: ["@noyala/brand", "@noyala/domain"],

  // Stage 9 hardening pass: baseline security headers with no app-specific
  // wiring required. A real Content-Security-Policy is deliberately not
  // included here — App Router's hydration script and Supabase/OpenAI
  // client usage would need a nonce-based CSP threaded through every page
  // to avoid breaking the app, which needs real browser verification page
  // by page rather than being guessed at blind. See docs/roadmap.md's
  // Stage 9 section.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // No feature in this app uses the camera, microphone, or
          // geolocation today (confirmed: no getUserMedia/geolocation call
          // anywhere in apps/web/src) — deny them by default.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
