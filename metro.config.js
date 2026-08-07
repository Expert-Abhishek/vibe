const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /admin-panel\/\.next\/.*/,
  /admin-panel\/node_modules\/.*/,
  /backend\/.*/,
];

module.exports = config;
