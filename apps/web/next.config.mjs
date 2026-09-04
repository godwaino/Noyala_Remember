/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship TypeScript source directly; Next.js transpiles
  // them as part of the app build instead of requiring a separate package
  // build step.
  transpilePackages: ["@noyala/brand", "@noyala/domain"],
};

export default nextConfig;
