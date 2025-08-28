/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['p16-sign-sg.tiktokcdn.com', 'p16-sign-va.tiktokcdn.com', 'p19-sign.tiktokcdn-us.com', 'lf16-tiktok-common.ttwstatic.com', 'sf16-website-login.neutral.ttwstatic.com'],
    unoptimized: true
  },
};

export default nextConfig;
