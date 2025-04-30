/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for bcrypt and other native modules
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Exclude problematic files from webpack processing
    config.module.rules.push({
      test: /\.html$/,
      issuer: /node_modules\/@mapbox\/node-pre-gyp/,
      use: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
