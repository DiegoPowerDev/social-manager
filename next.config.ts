import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "@firebase/database-compat",
    "jose",
    "jwks-rsa",
  ],
};

export default nextConfig;
