import ProjectList from '@/components/ProjectList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects — Favour Anyaogu',
  description: 'Everything I\'ve built, shipped, and conceptualized. Personal ventures, client systems, and experimental prototypes.',
};

export default function ProjectsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-border-subtle pb-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground">
          Projects
        </h1>
        <p className="font-sans text-sm text-muted-fg leading-relaxed max-w-xl">
          An archive of software, digital platforms, and experiments. Spanning live products in production, active builds, and explored concepts.
        </p>
      </header>

      {/* Filterable dated list */}
      <ProjectList />
    </div>
  );
}
