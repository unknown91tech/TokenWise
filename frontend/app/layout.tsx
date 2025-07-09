
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TokenWise - Real-Time Wallet Intelligence',
  description: 'Monitor and analyze wallet behavior for Solana tokens in real-time',
  keywords: ['solana', 'crypto', 'wallet', 'analytics', 'real-time', 'blockchain'],
  authors: [{ name: 'TokenWise Team' }],
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'TokenWise - Real-Time Wallet Intelligence',
    description: 'Monitor and analyze wallet behavior for Solana tokens in real-time',
    type: 'website',
    locale: 'en_US',
    siteName: 'TokenWise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TokenWise - Real-Time Wallet Intelligence',
    description: 'Monitor and analyze wallet behavior for Solana tokens in real-time',
    creator: '@tokenwise',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}