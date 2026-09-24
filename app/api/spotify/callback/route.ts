import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRedirectUri, STATE_COOKIE } from '@/lib/spotify';

export const dynamic = 'force-dynamic';

function page(title: string, bodyHtml: string) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  body { background:#121110; color:#ede8df; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
         max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem; line-height: 1.6; font-size: 14px; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: 1.6rem; margin: 0 0 1rem; }
  code { background:#1a1817; border:1px solid rgba(237,232,223,.12); border-radius:4px;
         padding:.1rem .35rem; color:#ede8df; }
  .token { display:block; background:#1a1817; border:1px solid rgba(237,232,223,.12); border-radius:8px;
           padding:.75rem; margin:.75rem 0; word-break:break-all; color:#ede8df; }
  .ok { color:#8ab48a; } .bad { color:#c98a8a; }
  a { color:#ede8df; text-decoration:underline dotted; text-underline-offset:3px; }
  ol { padding-left:1.2rem; } li { margin:.35rem 0; }
  .muted { opacity:.65; }
</style></head><body>
<h1>${title}</h1>
${bodyHtml}
</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  );
}

/** Replace or append SPOTIFY_REFRESH_TOKEN in .env.local, preserving other lines. */
function persistRefreshToken(token: string) {
  const envPath = path.join(process.cwd(), '.env.local');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `SPOTIFY_REFRESH_TOKEN=${token}`;

  const next = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(existing)
    ? existing.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line)
    : `${existing}${existing === '' || existing.endsWith('\n') ? '' : '\n'}${line}\n`;

  fs.writeFileSync(envPath, next, 'utf8');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  const cookieState = request.headers
    .get('cookie')
    ?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1];

  if (error) {
    return page('Authorization failed', `<p class="bad">Spotify returned: <code>${error}</code></p>`);
  }
  if (!code) {
    return page('Missing code', `<p class="bad">Spotify did not return an authorization code.</p>`);
  }
  if (!state || !cookieState || state !== cookieState) {
    return page(
      'State mismatch',
      `<p class="bad">The OAuth state did not match.</p>
       <p>Restart the flow from <a href="/api/spotify/login">/api/spotify/login</a>.</p>`
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return page('Missing credentials', `<p class="bad">Client ID or secret is not set in .env.local.</p>`);
  }

  const redirectUri = getRedirectUri(url.origin);

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });

  const json = (await tokenRes.json()) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !json.refresh_token) {
    return page(
      'Token exchange failed',
      `<p class="bad">${json.error ?? 'unknown_error'} — ${json.error_description ?? ''}</p>
       <p class="muted">Redirect URI used: <code>${redirectUri}</code><br/>
       It must match the Redirect URI in your Spotify dashboard exactly.</p>`
    );
  }

  const refreshToken = json.refresh_token;
  let written = false;

  try {
    persistRefreshToken(refreshToken);
    written = true;
  } catch {
    written = false;
  }

  const response = page(
    'Spotify connected',
    `<p class="${written ? 'ok' : 'bad'}">
      ${written
        ? 'Refresh token written to <code>.env.local</code>.'
        : 'Could not write .env.local automatically — copy the token below by hand.'}
     </p>
     <div class="token">${refreshToken}</div>
     <p><strong>Final step:</strong> restart the dev server so Next.js picks up the new env value, then reload the site.</p>
     <p class="muted">The widget stays hidden until a track is actually playing.</p>
     <p><a href="/">Back to the site</a></p>`
  );

  // One-shot state cookie.
  response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
