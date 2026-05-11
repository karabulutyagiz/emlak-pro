import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Webico EMLAK',
  description: 'Gercek zamanli emlak operasyon paneli',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#07111f', color: '#f4f7fb' }}>
        {children}
      </body>
    </html>
  );
}
