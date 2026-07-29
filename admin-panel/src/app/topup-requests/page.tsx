'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TopupRequestsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/transactions?type=topup');
  }, [router]);

  return null;
}
