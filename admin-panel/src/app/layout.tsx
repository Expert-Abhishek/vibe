import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Vibzz - Super Admin Dashboard',
  description: 'Control center for Vibzz tourists, drivers, guides, and rate pricing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-white antialiased flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="p-6 md:p-8 flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
