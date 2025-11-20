import Authenticate from './auth/auth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Authenticate />
      </body>
    </html>
  );
}
