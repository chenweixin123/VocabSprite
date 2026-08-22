const externalHostAllowlist = new Set(['docs.rs', 'rust-lang.org', 'tauri.app']);

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      externalHostAllowlist.has(url.hostname)
    );
  } catch {
    return false;
  }
}
