import Link from 'next/link';
import DictionaryPronunciation from '@/components/DictionaryPronunciation';
import projectsData from '@/data/projects.json';
import notesData from '@/data/notes.json';
import site from '@/data/site.json';

export default function HomePage() {
  const featuredProjects = projectsData
    .filter((p) => p.featured || p.status === 'live')
    .slice(0, 3);
  const latestPost = notesData[0];

  return (
    <div className="space-y-14">
      {/* Dictionary hero format — directly from floguo.com */}
      <section className="space-y-4">
        <DictionaryPronunciation />

        <p className="font-sans text-base text-foreground leading-relaxed pt-2 max-w-xl">
          {site.bio}
        </p>

        {/* Plain-text availability — no badge, no green pill */}
        <p className="font-sans text-sm text-muted-fg leading-relaxed">
          {site.availability.label} —{' '}
          <a href={`mailto:${site.availability.email}`} className="flo-link">
            {site.availability.email}
          </a>{' '}
          or WhatsApp{' '}
          <a
            href={site.availability.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flo-link"
          >
            {site.availability.whatsapp}
          </a>
        </p>

        {/* Flo Guo-style "See also:" inline text links */}
        <div className="flex items-center gap-2 pt-1 text-sm">
          <span className="text-muted-fg">See also:</span>
          {site.socials.map((social, index) => (
            <span key={social.label} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted-fg/60">·</span>}
              <a
                href={social.href}
                {...(social.href.startsWith('mailto:')
                  ? {}
                  : { target: '_blank', rel: 'noopener noreferrer' })}
                className="flo-link"
              >
                {social.label}
              </a>
            </span>
          ))}
        </div>
      </section>

      {/* Selected works — quiet dated list, no arbitrary color */}
      <section className="space-y-4 pt-4 border-t border-border-subtle">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">
            Selected Projects
          </h2>
          <Link href="/projects" className="flo-link text-xs font-mono">
            all projects ({projectsData.length}) &rarr;
          </Link>
        </div>

        <div className="space-y-1">
          {featuredProjects.map((project) => (
            <div
              key={project.id}
              className="group p-4 -mx-4 rounded-xl border border-transparent hover:border-border-subtle/70 hover:bg-surface/25 transition-[background-color,border-color] duration-500 ease-out space-y-1"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-sans text-base font-medium text-foreground">
                    {project.link ? (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flo-link"
                      >
                        {project.name}
                      </a>
                    ) : (
                      <span>{project.name}</span>
                    )}
                  </h3>
                  <span className="font-mono text-xs text-muted-fg/70">
                    [{project.status}]
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-fg">{project.year}</span>
              </div>
              <p className="text-sm text-muted-fg font-sans">{project.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent note teaser */}
      {latestPost && (
        <section className="space-y-3 pt-4 border-t border-border-subtle">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">
              Recent Note
            </h2>
            <Link href="/blog" className="flo-link text-xs font-mono">
              all notes &rarr;
            </Link>
          </div>

          <article className="p-4 -mx-4 rounded-xl border border-transparent hover:border-border-subtle/70 hover:bg-surface/25 transition-[background-color,border-color] duration-500 ease-out space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-lg font-medium text-foreground">
                <Link href={`/blog/${latestPost.slug}`} className="flo-link">
                  {latestPost.title}
                </Link>
              </h3>
              <span className="font-mono text-xs text-muted-fg whitespace-nowrap">
                {latestPost.date}
              </span>
            </div>
            <p className="text-sm text-muted-fg line-clamp-2">{latestPost.description}</p>
          </article>
        </section>
      )}
    </div>
  );
}
