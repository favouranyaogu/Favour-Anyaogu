import querystring from 'querystring';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

export const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';
export const STATE_COOKIE = 'spotify_oauth_state';

/**
 * Spotify rejects `localhost` as a redirect URI — loopback must be an explicit
 * http://127.0.0.1:PORT or http://[::1]:PORT literal. Everything else must be HTTPS.
 */
export function getRedirectUri(origin: string) {
  if (process.env.SPOTIFY_REDIRECT_URI) return process.env.SPOTIFY_REDIRECT_URI;
  return `${origin.replace('//localhost', '//127.0.0.1')}/api/spotify/callback`;
}

export function isConfigured() {
  return Boolean(client_id && client_secret && refresh_token);
}

export function getBasicAuth() {
  return basic;
}

export const getAccessToken = async () => {
  if (!isConfigured()) return null;

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token,
      }),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
};

export const getNowPlaying = async () => {
  const tokenData = await getAccessToken();

  if (!tokenData || !tokenData.access_token) return null;

  try {
    return fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
};
