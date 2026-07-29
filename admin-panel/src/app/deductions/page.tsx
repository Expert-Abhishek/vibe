'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeductionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/transactions?type=deduction');
  }, [router]);

  return null;
}
