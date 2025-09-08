import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Load this JS file as a URL, which can be passed to the AudioWorklet through the PCMAudioRecorderProvider
    // See Webpack documentation for more details: https://webpack.js.org/guides/asset-modules/#resource-assets
    config.module.rules.push({
      test: /pcm-audio-worklet\.min\.js$/,
      type: "asset/resource",
      generator: {
        // This ensures the generated URL is the same whether in a Client or Server component
        filename: "static/media/[name][ext]",
      },
    });

    return config;
  },
};

export default nextConfig;
