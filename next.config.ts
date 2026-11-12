import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Proxy Firebase Auth helper so signInWithRedirect works on Vercel
  // (same-origin authDomain; see Firebase redirect best practices Option 3).
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://gestionale-ags.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
