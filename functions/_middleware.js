// Cloudflare Pages Function — Basic Auth middleware
// Runs before every static file request. Blocks unauthorized access.
// Credentials are read from environment variables (Pages > Settings > Variables and Secrets).

export async function onRequest(context) {
  const { request, env, next } = context;

  // Skip auth for service worker so PWA still works (optional)
  const url = new URL(request.url);
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json' ||
      url.pathname.startsWith('/icon-') || url.pathname === '/favicon.png') {
    return next();
  }

  // Check Authorization header
  const auth = request.headers.get('Authorization');

  if (!auth || !auth.startsWith('Basic ')) {
    return unauthorized();
  }

  // Decode "Basic base64(user:pass)"
  let user, pass;
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    user = decoded.slice(0, idx);
    pass = decoded.slice(idx + 1);
  } catch (e) {
    return unauthorized();
  }

  // Compare against env vars (constant-time-ish)
  const expectedUser = env.AUTH_USER || '';
  const expectedPass = env.AUTH_PASS || '';

  if (user !== expectedUser || pass !== expectedPass) {
    return unauthorized();
  }

  // OK — continue to static file
  return next();
}

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="One Vela Dashboard", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
