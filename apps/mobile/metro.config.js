// Metro config cho monorepo pnpm — cho phép resolve workspace package @loop/shared.
// Theo hướng dẫn chính thức Expo: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch toàn bộ monorepo để Metro thấy packages/shared
config.watchFolders = [monorepoRoot];

// 2. Resolve node_modules ở cả app lẫn root (pnpm hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. pnpm dùng symlink — Metro cần bật để theo symlink vào .pnpm store
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
