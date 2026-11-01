import { describe, expect, it } from 'vitest';
import { escapeXml } from '../src/escape';

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    expect(escapeXml('A&B')).toBe('A&amp;B');
  });

  it('escapes angle brackets', () => {
    expect(escapeXml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeXml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('escapes all five dangerous characters together', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;');
  });

  it('keeps safe text unchanged and coerces nullish values to empty', () => {
    expect(escapeXml('普通中文 123')).toBe('普通中文 123');
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});
