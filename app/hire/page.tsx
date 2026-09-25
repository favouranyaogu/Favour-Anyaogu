import { Metadata } from 'next';
import hire from '@/data/hire.json';
import site from '@/data/site.json';
import social from '@/data/social.json';
import { socialCard } from '@/lib/social';

export const metadata: Metadata = {
  title: 'Hire — Favour Anyaogu',
  description: 'Design and engineering services for founders, startups, and specialized teams.',
  ...socialCard('hire', social.hire),
};

export default function HirePage() {
  const waNumber = site.availability.whatsapp.replace(/\D/g, '');
  const whatsappBase = `https://wa.me/${waNumber}?text=`;

  return (
    <div className="space-y-12">
      <header className="space-y-2 border-b border-border-subtle pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground">
          Services &amp; Contracting
        </h1>
        <p className="font-sans text-sm text-muted-fg leading-relaxed max-w-xl">
          {hire.intro}
        </p>
      </header>

      {/* Service Tiers */}
      <div className="space-y-10">
        {hire.services.map((service, index) => {
          const prefill = encodeURIComponent(
            `Hi Favour, I'm reaching out regarding your ${service.tier} service tier.`
          );
          const whatsappUrl = `${whatsappBase}${prefill}`;
          const mailtoUrl = `mailto:${site.availability.email}?subject=${encodeURIComponent(
            `Inquiry: ${service.tier}`
          )}&body=${prefill}`;

          return (
            <article 
              key={index}
              className="p-6 rounded-xl border border-border-subtle/60 bg-surface/20 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-border-subtle/50 pb-3">
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-foreground">
                  {service.tier}
                </h2>
                <span className="font-mono text-xs text-muted-fg">
                  Timeline: {service.timeline}
                </span>
              </div>

              <p className="font-sans text-sm text-foreground/85 leading-relaxed">
                {service.description}
              </p>

              {/* Deliverables list */}
              <ul className="space-y-1.5 text-xs text-muted-fg list-disc pl-4 font-sans">
                {service.deliverables.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>

              {/* Get a quote links — honest, no loud buttons */}
              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-muted-fg">
                <span>Get a quote &rarr;</span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flo-link"
                >
                  WhatsApp
                </a>
                <span className="opacity-40">or</span>
                <a
                  href={mailtoUrl}
                  className="flo-link"
                >
                  Email
                </a>
              </div>
            </article>
          );
        })}

        {/* Instalments — one quiet line covering all three tiers */}
        <p className="font-sans text-xs text-muted-fg/80 leading-relaxed">
          {hire.paymentNote}
        </p>
      </div>

      {/* General Inquiry Footer */}
      <section className="pt-6 border-t border-border-subtle text-xs text-muted-fg space-y-2">
        <p className="font-sans">
          Have an unconventional idea or need technical diligence on an existing codebase?
        </p>
        {/* Labels, not raw addresses — the numbers overflowed narrow screens. */}
        <p className="font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Reach out directly:</span>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flo-link"
          >
            WhatsApp
          </a>
          <span className="opacity-40">or</span>
          <a href={`mailto:${site.availability.email}`} className="flo-link">
            Email
          </a>
        </p>
      </section>
    </div>
  );
}
