const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Deduplicate React in the monorepo — prevents "invalid hook call" from multiple React copies
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

module.exports = config;
