const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
export function assertLocalOrigin(origin, host, protocol, configured) {
  try {
    const source = new URL(origin);
    const target = new URL(`${protocol}//${host}`);
    const setting = new URL(configured || target.origin);
    for (const url of [source, target, setting]) {
      if (!hosts.has(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    }
    // Trust the actual local server's port, including Next.js's fallback port.
    // A different local website must not post into this application.
    if (source.origin !== target.origin || source.protocol !== setting.protocol) throw new Error();
  } catch { throw new Error('ORIGIN_REJECTED'); }
}
export function localDatabaseUrl(value) {
  if (!value) throw new Error('DATABASE_URL is required');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !hosts.has(url.hostname)) throw new Error('Only a loopback PostgreSQL database is allowed');
  for (const [key, entry] of url.searchParams) {
    if (key !== 'options' || !/^-c search_path=verification_test_[a-f0-9]{32}$/.test(entry)) throw new Error('Database connection overrides are forbidden');
  }
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.toString();
}
export function localPredictionUrl(value, path) {
  const url = new URL(value || 'http://127.0.0.1:8000');
  if (url.protocol !== 'http:' || !hosts.has(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.port || '80') !== '8000') throw new Error('Only the loopback prediction service on port 8000 is allowed');
  if (!['/model', '/predict-hazard'].includes(path)) throw new Error('Prediction path is not allowed');
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  url.pathname = path;
  return url;
}
