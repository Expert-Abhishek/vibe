import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Vibzz - Platform Services',
  description: 'Vibzz application platform services, privacy policy, and account management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-white antialiased flex min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
