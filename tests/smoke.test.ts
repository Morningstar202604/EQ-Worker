import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSmokeMessage, mountSmokeApp } from '../src/smoke/main';

const smokeHtmlPath = resolve(process.cwd(), 'src/smoke/index.html');
const smokeHtml = readFileSync(smokeHtmlPath, 'utf8');

function createSmokeDocument(): Document {
  return new DOMParser().parseFromString(smokeHtml, 'text/html');
}

describe('createSmokeMessage', () => {
  it('shows the default name when no name is provided', () => {
    expect(createSmokeMessage()).toBe('Hello, EQ-Worker!');
  });

  it('shows a custom name in the user-visible message', () => {
    expect(createSmokeMessage('Alice')).toBe('Hello, Alice!');
  });

  it('uses the default name for whitespace-only input', () => {
    expect(createSmokeMessage('   ')).toBe('Hello, EQ-Worker!');
  });

  it('mounts the greeting into the real smoke HTML app element', () => {
    const document = createSmokeDocument();
    const app = document.querySelector('#app');
    const moduleScript = document.querySelector('script[type="module"]');

    expect(app).not.toBeNull();
    expect(moduleScript?.getAttribute('src')).toBe('./main.ts');

    mountSmokeApp(document);

    expect(app?.textContent).toBe('Hello, EQ-Worker!');
  });
});
