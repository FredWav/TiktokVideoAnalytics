/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ATTENTION: ceci laisse passer du code potentiellement problématique en prod
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
