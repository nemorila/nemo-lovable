import { describe, it, expect } from 'vitest';
import { findMissingComponents, normalizePlanPath } from '@/lib/plan/missing-components';
import type { PlannedComponent } from '@/types/plan';

const component = (name: string, path: string): PlannedComponent => ({
  name,
  path,
  description: `${name}-komponenten`,
});

const plan = {
  components: [
    component('App', 'src/App.jsx'),
    component('Header', 'src/components/Header.jsx'),
    component('Hero', 'src/components/Hero.jsx'),
    component('Footer', 'src/components/Footer.jsx'),
  ],
};

describe('findMissingComponents', () => {
  it('returns an empty list when every component was generated', () => {
    const written = [
      'src/App.jsx',
      'src/components/Header.jsx',
      'src/components/Hero.jsx',
      'src/components/Footer.jsx',
      'src/index.css',
    ];

    expect(findMissingComponents(plan, written)).toEqual([]);
  });

  it('returns exactly the one component that is missing', () => {
    const written = ['src/App.jsx', 'src/components/Header.jsx', 'src/components/Hero.jsx'];

    const missing = findMissingComponents(plan, written);

    expect(missing).toEqual([component('Footer', 'src/components/Footer.jsx')]);
  });

  it('returns every missing component, in plan order', () => {
    const written = ['src/components/Hero.jsx'];

    const missing = findMissingComponents(plan, written);

    expect(missing).toEqual([
      component('App', 'src/App.jsx'),
      component('Header', 'src/components/Header.jsx'),
      component('Footer', 'src/components/Footer.jsx'),
    ]);
    expect(missing.map(c => c.name)).toEqual(['App', 'Header', 'Footer']);
  });

  it('treats a case mismatch as missing', () => {
    // header.jsx resolves on macOS and then fails to build on Linux, so the
    // component counts as not delivered.
    const written = [
      'src/App.jsx',
      'src/components/header.jsx',
      'src/components/Hero.jsx',
      'src/components/Footer.jsx',
    ];

    const missing = findMissingComponents(plan, written);

    expect(missing).toEqual([component('Header', 'src/components/Header.jsx')]);
  });

  it('matches a component that lives in a subfolder', () => {
    const nestedPlan = {
      components: [
        component('Sidebar', 'src/components/layout/Sidebar.jsx'),
        component('Topbar', 'src/components/layout/Topbar.jsx'),
      ],
    };
    const written = ['src/components/layout/Sidebar.jsx'];

    const missing = findMissingComponents(nestedPlan, written);

    expect(missing).toEqual([component('Topbar', 'src/components/layout/Topbar.jsx')]);
  });

  it('reports every component when the file tree is empty', () => {
    const missing = findMissingComponents(plan, []);

    expect(missing).toEqual(plan.components);
    expect(missing).toHaveLength(4);
  });

  it('returns an empty list when there is no plan or no components', () => {
    expect(findMissingComponents(null, ['src/App.jsx'])).toEqual([]);
    expect(findMissingComponents(undefined, ['src/App.jsx'])).toEqual([]);
    expect(findMissingComponents({ components: [] }, ['src/App.jsx'])).toEqual([]);
  });

  it('matches a planned path that is missing the src/ prefix', () => {
    const bareplan = { components: [component('Header', 'components/Header.jsx')] };

    expect(findMissingComponents(bareplan, ['src/components/Header.jsx'])).toEqual([]);
  });
});

describe('normalizePlanPath', () => {
  it('prefixes src/ for component paths', () => {
    expect(normalizePlanPath('components/Header.jsx')).toBe('src/components/Header.jsx');
  });

  it('leaves src/ and public/ paths untouched', () => {
    expect(normalizePlanPath('src/App.jsx')).toBe('src/App.jsx');
    expect(normalizePlanPath('public/logo.svg')).toBe('public/logo.svg');
  });

  it('leaves config files at the root', () => {
    expect(normalizePlanPath('index.html')).toBe('index.html');
    expect(normalizePlanPath('tailwind.config.js')).toBe('tailwind.config.js');
  });

  it('strips a leading slash', () => {
    expect(normalizePlanPath('/src/App.jsx')).toBe('src/App.jsx');
  });
});
