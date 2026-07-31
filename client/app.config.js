module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
  },
  ios: {
    ...config.ios,
    // iOS uses Apple Maps (MKMapView) by default, requiring zero API keys
    config: {
      ...config.ios?.config,
      googleMapsApiKey: undefined,
    },
  },
});
