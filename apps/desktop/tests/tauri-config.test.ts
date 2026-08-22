import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface TauriConfiguration {
  readonly app?: {
    readonly windows?: readonly {
      readonly additionalBrowserArgs?: string;
      readonly width?: number;
      readonly height?: number;
      readonly minWidth?: number;
      readonly minHeight?: number;
      readonly decorations?: boolean;
      readonly resizable?: boolean;
      readonly transparent?: boolean;
      readonly shadow?: boolean;
    }[];
    readonly security?: { readonly csp?: string };
  };
}

const config = JSON.parse(
  readFileSync(resolve('apps/desktop/src-tauri/tauri.conf.json'), 'utf8'),
) as TauriConfiguration;

describe('native privacy configuration', () => {
  it('disables WebView2 background networking before explicit opt-in', () => {
    const arguments_ = config.app?.windows?.[0]?.additionalBrowserArgs ?? '';
    for (const required of [
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-sync',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      'msSmartScreenProtection',
      'AutofillServerCommunication',
      'OptimizationHints',
    ]) {
      expect(arguments_).toContain(required);
    }
  });

  it('keeps production connect-src limited to the Tauri IPC bridge', () => {
    const csp = config.app?.security?.csp ?? '';
    expect(csp).toContain('connect-src ipc: http://ipc.localhost');
    expect(csp).not.toMatch(/connect-src[^;]*https?:\/\/(?!ipc\.localhost)/);
  });
});

describe('native window configuration', () => {
  it('starts in a compact laptop-friendly, normally resizable window', () => {
    const window = config.app?.windows?.[0];
    expect(window).toMatchObject({
      width: 1080,
      height: 680,
      minWidth: 640,
      minHeight: 420,
      decorations: true,
      resizable: true,
      transparent: true,
      shadow: false,
    });
  });

  it('uses the Windows GUI subsystem for release builds', () => {
    const mainSource = readFileSync(resolve('apps/desktop/src-tauri/src/main.rs'), 'utf8');
    expect(mainSource).toContain(
      '#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]',
    );
  });
});
