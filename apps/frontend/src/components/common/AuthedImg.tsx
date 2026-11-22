import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { API_BASE, apiFetch } from '../../lib/api';

/**
 * <img> for images served by the authenticated API (audit screenshots).
 *
 * A plain <img src="/api/..."> cannot send the Clerk bearer token, so the
 * backend answers 401 and the replay shows broken images. For API paths this
 * fetches the bytes with apiFetch (which attaches the token) and renders an
 * object URL; any other src (http(s), data:, blob:) is passed straight through.
 */
export function AuthedImg({ src, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const needsAuth = src.startsWith(`${API_BASE}/`);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needsAuth) return;
    let cancelled = false;
    let created: string | null = null;
    setObjectUrl(null);
    setFailed(false);

    // apiFetch prepends API_BASE itself; pass the API-relative path.
    apiFetch(src.slice(API_BASE.length))
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src, needsAuth]);

  if (!needsAuth) return <img src={src} alt={alt} {...rest} />;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${rest.className ?? ''} flex items-center justify-center text-[11px] text-white/40 bg-white/[0.03]`}
        style={rest.style}
      >
        Screenshot unavailable
      </div>
    );
  }

  // Keep the element (and its layout box) while loading.
  return <img src={objectUrl ?? undefined} alt={alt} aria-busy={!objectUrl} {...rest} />;
}
