import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(process.cwd(), 'apps/studio/index.html'), 'utf8');

function mountShell(): void {
  document.body.innerHTML = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]*>/g, '');
}

describe('studio real entry render', () => {
  beforeEach(() => {
    localStorage.clear();
    mountShell();
    vi.resetModules();
  });

  it('html provides the #studio mount node', () => {
    expect(document.querySelector('#studio')).not.toBeNull();
  });

  it('renders the shell with navigation and brand after importing main', async () => {
    await import('../main');

    const root = document.querySelector('#studio');
    expect(root).not.toBeNull();
    expect(root!.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(root!.textContent).toContain('EQ-Worker');
    expect(root!.textContent).toContain('仪表盘');
    expect(root!.textContent).toContain('账本与洞察');
    expect(root!.textContent).toContain('AI 助手');
    expect(root!.querySelectorAll('[data-act="nav"]').length).toBe(4);
    expect(root!.querySelector('[data-view="insights"]')).toBeNull();
  });

  it('shows the empty landing before any data exists', async () => {
    await import('../main');
    const text = document.querySelector('#studio')!.textContent ?? '';
    expect(text).toMatch(/演示|导入/);
  });

  it('renders an svg chart after loading demo data', async () => {
    await import('../main');
    const demoBtn = Array.from(document.querySelectorAll('#studio button')).find((b) =>
      (b.textContent ?? '').includes('演示')
    );
    expect(demoBtn).toBeTruthy();
    demoBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));

    const root = document.querySelector('#studio')!;
    expect(root.querySelectorAll('svg').length).toBeGreaterThan(0);
    expect(root.textContent).toContain('今日行动');
  });
});
