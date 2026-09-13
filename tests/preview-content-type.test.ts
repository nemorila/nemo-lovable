import { describe, it, expect } from 'vitest';
import {
  contentTypeFor,
  resolvePreviewObjectPath,
  buildingPlaceholderHtml,
} from '@/lib/preview/content-type';

describe('contentTypeFor', () => {
  it('maps known extensions', () => {
    expect(contentTypeFor('index.html')).toBe('text/html; charset=utf-8');
    expect(contentTypeFor('assets/app-a1b2c3.js')).toBe('text/javascript; charset=utf-8');
    expect(contentTypeFor('assets/style-d4e5.css')).toBe('text/css; charset=utf-8');
    expect(contentTypeFor('logo.svg')).toBe('image/svg+xml');
    expect(contentTypeFor('photo.PNG')).toBe('image/png');
    expect(contentTypeFor('font.woff2')).toBe('font/woff2');
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(contentTypeFor('data.xyz')).toBe('application/octet-stream');
  });

  it('falls back to octet-stream when there is no extension', () => {
    expect(contentTypeFor('LICENSE')).toBe('application/octet-stream');
    expect(contentTypeFor('nested/path/file')).toBe('application/octet-stream');
  });

  it('is not confused by dots in directory names', () => {
    expect(contentTypeFor('my.assets/app.js')).toBe('text/javascript; charset=utf-8');
    expect(contentTypeFor('my.assets/README')).toBe('application/octet-stream');
  });
});

describe('resolvePreviewObjectPath', () => {
  it('resolves an empty path to index.html', () => {
    expect(resolvePreviewObjectPath(undefined)).toBe('index.html');
    expect(resolvePreviewObjectPath([])).toBe('index.html');
    expect(resolvePreviewObjectPath([''])).toBe('index.html');
  });

  it('passes through paths that have a file extension', () => {
    expect(resolvePreviewObjectPath(['assets', 'app-a1b2.js'])).toBe('assets/app-a1b2.js');
    expect(resolvePreviewObjectPath(['favicon.ico'])).toBe('favicon.ico');
  });

  it('resolves extensionless deep links to index.html for client routing', () => {
    expect(resolvePreviewObjectPath(['about'])).toBe('index.html');
    expect(resolvePreviewObjectPath(['blog', 'my-post'])).toBe('index.html');
  });
});

describe('buildingPlaceholderHtml', () => {
  it('shows the building message', () => {
    expect(buildingPlaceholderHtml()).toContain('Bygger din sida…');
  });

  it('refreshes itself so the build appears without user action', () => {
    expect(buildingPlaceholderHtml()).toMatch(/http-equiv="refresh"/);
  });

  it('is a self-contained document with no external references', () => {
    const html = buildingPlaceholderHtml();

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/src=|href="http/);
  });
});
