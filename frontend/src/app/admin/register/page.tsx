'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPageDisabled() {
  const router = useRouter();

  useEffect(() => {
    // Tạm thời redirect sang login
    router.replace('/admin/login');
  }, [router]);

  return null;
}
