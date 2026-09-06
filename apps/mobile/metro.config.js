// Monorepo-aware Metro config (pnpm workspace) — see
// https://docs.expo.dev/guides/monorepos/. This app depends on the
// workspace packages @noyala/domain and @noyala/brand, which live outside
// apps/mobile, so Metro needs to watch the whole workspace and resolve
// pnpm's symlinked node_modules rather than only apps/mobile's own.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Deliberately NOT disabling hierarchical lookup: pnpm keeps most
// transitive deps (e.g. expo-modules-core, a dependency of `expo` itself)
// only inside that package's own nested node_modules
// (node_modules/.pnpm/expo@.../node_modules/...), not hoisted to a shared
// top-level node_modules. Metro needs its normal upward directory search
// to find those via pnpm's per-package symlinks; disabling it (as Expo's
// monorepo guide suggests for yarn/npm workspaces, which DO hoist) breaks
// resolution for anything pnpm didn't hoist.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
