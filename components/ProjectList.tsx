'use client';

import { useState } from 'react';
import projectsData from '@/data/projects.json';

interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: string;
  stack: string[];
  link?: string;
  featured?: boolean;
  year: string;
}

export default function ProjectList() {
  const [filter, setFilter] = useState<'all' | 'personal' | 'client' | 'concept'>('all');
  const projects = projectsData as Project[];

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  return (
    <div className="space-y-8">
      {/* Category Filter tabs — quiet, restrained */}
      <div className="flex items-center gap-4 border-b border-border-subtle pb-3 text-xs font-mono">
        {(['all', 'personal', 'client', 'concept'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`capitalize transition-colors ${
              filter === tab
                ? 'text-foreground underline decoration-1 underline-offset-4'
                : 'text-muted-fg hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Projects list — invisible borders at rest, emerge subtly on hover */}
      <div className="space-y-2">
        {filteredProjects.map((project) => (
          <article 
            key={project.id}
            className="group p-5 -mx-5 rounded-xl border border-transparent hover:border-border-subtle/70 hover:bg-surface/25 transition-[background-color,border-color] duration-500 ease-out space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="flex items-baseline gap-2.5">
                <h3 className="font-sans text-base sm:text-lg font-medium text-foreground">
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

              <div className="font-mono text-xs text-muted-fg sm:text-right">
                {project.year}
              </div>
            </div>

            {/* Tagline / primary hook */}
            <p className="font-sans text-sm text-foreground/90 font-medium">
              {project.tagline}
            </p>

            {/* Problem-first description */}
            <p className="font-sans text-sm text-muted-fg leading-relaxed">
              {project.description}
            </p>

            {/* Stack tags & subtle link */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs font-mono text-muted-fg">
              <span>{project.stack.join(' · ')}</span>
              {project.link && (
                <>
                  <span className="opacity-40">/</span>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flo-link"
                  >
                    visit site
                  </a>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
