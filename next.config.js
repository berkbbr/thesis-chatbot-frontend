/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/chat',
        destination: 'http://localhost:8000/chat',
      },
      {
        source: '/api/history/:path*',
        destination: 'http://localhost:8000/history/:path*',
      },
      {
        source: '/api/conversations/:path*',
        destination: 'http://localhost:8000/conversations/:path*',
      },
    ];
  },
};

module.exports = nextConfig;