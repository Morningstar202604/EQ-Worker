import type { StudioStore } from '../state';
import { policyEntries } from '../assistant';
import type { AIPolicyView, AIViewData } from '../views/ai';
import { renderAI } from '../views/ai';

export function buildAIViewData(studio: StudioStore): AIViewData {
  const settings = studio.getAISettings();
  const form = studio.getAIForm();
  const person = studio.getSelectedPerson();

  const policies: AIPolicyView[] = policyEntries().map((entry) => ({
    key: entry.key,
    label: entry.label,
    hint: entry.hint,
    checked: settings.contextPolicy[entry.key]
  }));

  return {
    enabled: settings.enabled,
    mock: form.mock,
    personName: person ? person.name : null,
    scene: studio.getAIScene(),
    note: studio.getAINote(),
    preview: studio.getAIPreview(),
    result: studio.getAIResult(),
    status: studio.getAIStatus(),
    message: studio.getAIMessage() || '准备就绪',
    messages: studio.getAIMessages(),
    configError: null,
    provider: {
      kind: form.kind,
      baseUrl: form.baseUrl,
      model: form.model,
      apiKey: form.apiKey,
      mock: form.mock
    },
    policies,
    persons: studio.getState().persons.map((item) => ({ id: item.id, name: item.name })),
    selectedPersonId: studio.getSelectedId(),
    hasPerson: !!person,
    offline: studio.getAIStatus() === 'offline'
  };
}

export function renderAIView(studio: StudioStore): string {
  return renderAI(buildAIViewData(studio));
}
