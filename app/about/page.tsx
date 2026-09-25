import { Metadata } from 'next';
import about from '@/data/about.json';
import social from '@/data/social.json';
import { socialCard } from '@/lib/social';

export const metadata: Metadata = {
  title: 'About — Favour Anyaogu',
  description:
    'I build things I actually care about. Full-stack developer, real estate broker, based in Nigeria.',
  ...socialCard('about', social.about),
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border-subtle pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground">About</h1>
        <p className="font-sans text-sm text-muted-fg leading-relaxed">{about.intro}</p>
      </header>

      {/* Flo Guo-style conversational interview format: ↳ Question */}
      <div className="space-y-8 font-sans">
        {about.questions.map((entry) => (
          <section key={entry.question} className="space-y-1.5">
            <h2 className="text-sm font-mono text-muted-fg flex items-center gap-1.5">
              <span>↳</span>
              <span className="text-foreground">{entry.question}</span>
            </h2>
            <div className="pl-4 text-foreground/90 text-sm sm:text-base leading-relaxed">
              <p>{entry.answer}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="pt-8 border-t border-border-subtle space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">Contact</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {about.contact.map((link, index) => (
            <span key={link.label} className="flex items-center gap-3">
              {index > 0 && <span className="text-muted-fg/60">·</span>}
              <a
                href={link.href}
                {...(link.href.startsWith('mailto:')
                  ? {}
                  : { target: '_blank', rel: 'noopener noreferrer' })}
                className="flo-link"
              >
                {link.label}
              </a>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
