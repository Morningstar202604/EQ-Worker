const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => XML_ENTITIES[char] ?? char);
}
