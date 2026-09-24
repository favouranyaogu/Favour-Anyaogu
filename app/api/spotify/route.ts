import { NextResponse } from 'next/server';
import { getNowPlaying } from '@/lib/spotify';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await getNowPlaying();

    if (!response || response.status === 204 || response.status >= 400) {
      return NextResponse.json({ isPlaying: false });
    }

    const song = await response.json();

    if (!song || !song.item || !song.is_playing) {
      return NextResponse.json({ isPlaying: false });
    }

    const isPlaying = song.is_playing;
    const title = song.item.name;
    const artist = song.item.artists?.map((_artist: { name: string }) => _artist.name).join(', ') || '';
    const songUrl = song.item.external_urls?.spotify || '';

    return NextResponse.json({
      isPlaying,
      title,
      artist,
      songUrl,
    });
  } catch (error) {
    return NextResponse.json({ isPlaying: false });
  }
}
