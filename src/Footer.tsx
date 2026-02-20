export default function Footer({ m3uUrl }: { m3uUrl?: string }) {
  return (
    <footer className="fixed-footer">
      <div className="route-code">Patchwork Radio - VTuber Songs and Covers 24/7</div>
      {m3uUrl ? (
        <div className="route-code">
          <a
            href={m3uUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            Download m3u
          </a>
        </div>
      ) : (
        <div className="route-code">Listen to an endless stream of VTuber music 24/7, all archived on Patchwork</div>
      )}
    </footer>
  );
}
