/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '1mb' }
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]
  }
}
