import type { ReactNode } from 'react';
import { Shell } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
