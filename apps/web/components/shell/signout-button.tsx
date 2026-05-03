'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await api.post('/auth/signout');
        } finally {
          router.push('/signin');
          router.refresh();
        }
      }}
    >
      <LogOut className="h-4 w-4" />
      <span>Sign out</span>
    </Button>
  );
}
