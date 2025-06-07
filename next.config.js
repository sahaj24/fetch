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
    },
    // Production environment optimizations
    serverExternalPackages: ['puppeteer', 'playwright'],
    // Ensure API routes are properly handled in production
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*'
            }
        ];
    },
    // Add headers to ensure API routes return JSON
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/json'
                    },
                    {
                        key: 'X-API-Handler',
                        value: 'nextjs'
                    }
                ]
            }
        ];
    }
};

module.exports = nextConfig;