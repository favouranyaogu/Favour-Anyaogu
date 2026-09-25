import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LagosClock from '@/components/LagosClock';

export const metadata: Metadata = {
  title: 'Favour Anyaogu',
  description: "fa·vour /ˈfeɪ.vər/ — one who builds things that shouldn't exist yet. Designer with an opinion. Full-stack developer, real estate broker, based in Nigeria.",
  keywords: ['Favour Anyaogu', 'Full-stack Developer', 'Product Designer', 'Nigeria', 'Lagos', 'Portfolio'],
  authors: [{ name: 'Favour Anyaogu' }],
  metadataBase: new URL('https://favouranyaogu.com'),
  openGraph: {
    title: 'Favour Anyaogu',
    description: "fa·vour — 1. one who builds things that shouldn't exist yet. 2. designer with an opinion.",
    url: 'https://favouranyaogu.com',
    siteName: 'Favour Anyaogu',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Favour Anyaogu',
    description:
      "fa·vour — 1. one who builds things that shouldn't exist yet. 2. designer with an opinion.",
  },
  icons: {
    icon: '/mark.svg',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col justify-between selection:bg-stone-500/20">
        <LagosClock />
        <div>
          <Navbar />
          <main className="max-w-3xl mx-auto px-6 pt-10 sm:pt-16 pb-12">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
