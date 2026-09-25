import SpotifyWidget from './SpotifyWidget';
import FooterTagline from './FooterTagline';
import ColophonDialog from './ColophonDialog';
import site from '@/data/site.json';

const SUN_ASCII = "   \\ | /\n  -( * )-\n   / | \\";

export default function Footer() {
  return (
    <footer className="mt-28 pb-12 pt-8 text-center text-xs font-mono text-muted-fg">
      <div className="max-w-3xl mx-auto px-6 space-y-5">
        {/* Rotating tagline — one line per page load */}
        <FooterTagline />

        {/* Flo Guo-inspired ASCII sun mark */}
        <div className="select-none font-mono text-[11px] leading-tight text-muted-fg/60 whitespace-pre flex justify-center">
          {SUN_ASCII}
        </div>

        {/* The colophon is requested, not displayed — it opens on click. */}
        <p className="pt-1">
          <ColophonDialog />
        </p>

        <p className="tracking-wide opacity-70">{site.footer}</p>

        {/* Now playing — renders nothing when idle or unconfigured */}
        <div className="flex justify-center">
          <SpotifyWidget />
        </div>
      </div>
    </footer>
  );
}
