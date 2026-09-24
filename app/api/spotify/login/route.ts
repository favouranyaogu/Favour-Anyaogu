import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRedirectUri, SPOTIFY_SCOPES, STATE_COOKIE } from '@/lib/spotify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'SPOTIFY_CLIENT_ID is not set in .env.local' },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = getRedirectUri(origin);
  const state = crypto.randomBytes(16).toString('hex');

  const authorize = new URL('https://accounts.spotify.com/authorize');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('scope', SPOTIFY_SCOPES);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('state', state);

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
