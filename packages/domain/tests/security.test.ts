import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl } from '../src';

describe('external link allowlist', () => {
  it('allows only exact HTTPS documentation hosts', () => {
    expect(isAllowedExternalUrl('https://tauri.app/security/csp/')).toBe(true);
    expect(isAllowedExternalUrl('https://docs.rs/fsrs/latest/fsrs/')).toBe(true);
    expect(isAllowedExternalUrl('http://tauri.app/security/csp/')).toBe(false);
    expect(isAllowedExternalUrl('https://tauri.app.evil.example/')).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedExternalUrl('https://user:secret@rust-lang.org/')).toBe(false);
  });
});
