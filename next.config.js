/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static page generation - all pages will be server-rendered
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
