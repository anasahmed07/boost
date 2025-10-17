import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: [
            'oorpcfrbvzueaerppnbn.supabase.co', // your Supabase bucket host
        ],
    },
};

export default nextConfig;
