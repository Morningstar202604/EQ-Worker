export function createSmokeMessage(name = ''): string {
  const trimmedName = name.trim();
  return `Hello, ${trimmedName || 'EQ-Worker'}!`;
}

export function mountSmokeApp(doc: Document): void {
  const app = doc.querySelector<HTMLElement>('#app');

  if (app) {
    app.textContent = createSmokeMessage('');
  }
}

if (typeof document !== 'undefined') {
  mountSmokeApp(document);
}
