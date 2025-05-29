/** @type {import('next').NextConfig} */

const nextConfig = {
    // Skip type checking during production build
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    // Skip ESLint during production build
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    // Image domains
    images: {
        domains: ['images.unsplash.com'],
    }
};

module.exports = nextConfig;