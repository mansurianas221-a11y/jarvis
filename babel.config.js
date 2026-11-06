module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // `@/*` path aliases are resolved by Expo's built-in tsconfig-paths support
    // (see tsconfig.json -> compilerOptions.paths). No extra plugin needed.
    plugins: ['react-native-reanimated/plugin'],
  };
};
