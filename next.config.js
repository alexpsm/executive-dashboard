/** @type {import('next').NextConfig} */
// Force rebuild
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [''],
  },
}

module.exports = nextConfig
