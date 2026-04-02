// Force rebuild pour variables Brevo
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  },
};

export default nextConfig;
