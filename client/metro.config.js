const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace root so Metro can resolve @sales-app/shared
config.watchFolders = [workspaceRoot];

module.exports = withNativewind(config);
