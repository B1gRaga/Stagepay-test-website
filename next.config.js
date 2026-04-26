/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/app', destination: '/app.html' },
    ]
  },
}

module.exports = nextConfig
