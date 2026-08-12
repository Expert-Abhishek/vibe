'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { ImageModalProvider } from '@/components/ImagePreviewModal';

const PUBLIC_ROUTES = ['/delete-account', '/reset-password', '/privacy-policy'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  if (isPublicRoute) {
    return (
      <ImageModalProvider>
        <main className="min-h-screen w-full bg-dark-bg text-white">{children}</main>
      </ImageModalProvider>
    );
  }

  return (
    <ImageModalProvider>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="p-6 md:p-8 flex-1 overflow-y-auto">{children}</main>
      </div>
    </ImageModalProvider>
  );
}
