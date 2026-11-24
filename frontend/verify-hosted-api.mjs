const configuredOrigin = process.env.VITE_API_BASE_URL?.trim()
const origin = URL.canParse(configuredOrigin ?? '') ? new URL(configuredOrigin) : null

if (
  !origin ||
  origin.protocol !== 'https:' ||
  origin.username || origin.password || origin.search || origin.hash ||
  origin.pathname !== '/' ||
  origin.hostname === 'localhost' || origin.hostname.endsWith('.localhost') ||
  origin.hostname.startsWith('127.') || origin.hostname === '[::1]'
) {
  console.error('Set VITE_API_BASE_URL to the public HTTPS backend origin before building on Vercel.')
  process.exitCode = 1
}
