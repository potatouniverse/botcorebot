import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BotCoreBot - Memory API',
  description: 'Memory-as-a-Service for AI bots',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
