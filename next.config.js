/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer']
  },
  webpack: (config) => {
    return config;
  }
};

module.exports = nextConfig;