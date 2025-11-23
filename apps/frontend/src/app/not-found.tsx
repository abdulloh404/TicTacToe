export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#6b7280' }}>This page could not be found.</p>
    </main>
  );
}
