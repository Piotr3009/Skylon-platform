// TEMPORARY: Middleware disabled for testing
// This allows the app to work without [locale] folder structure

export default function middleware(request) {
  // Do nothing - pass through
  return;
}

export const config = {
  matcher: []
};