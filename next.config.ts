import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      	{ protocol: 'https', hostname: 'www.google.com'},
	{ protocol: 'https', hostname: 'storage.googleapis.com'},
	{ protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
