import { createInitialState } from './model';
import type { AppState } from './model';
import { normalizePersistedState } from './validation';

const STORAGE_KEY = 'vocabsprite.state.v1';

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): AppState {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return createInitialState();
  try {
    return normalizePersistedState(JSON.parse(raw)) ?? createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveState(
  state: AppState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export function serializeBackup(state: AppState): string {
  return `${JSON.stringify(
    {
      format: 'VocabSpriteBackup',
      schemaVersion: 1,
      exportedAtUtc: new Date().toISOString(),
      state,
    },
    null,
    2,
  )}\n`;
}

export function restoreBackup(json: string): AppState {
  if (new Blob([json]).size > 5 * 1024 * 1024) throw new Error('备份文件超过 5 MiB 限制。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('备份 JSON 语法无效。');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('不是受支持的 VocabSprite 备份。');
  }
  const document = parsed as Record<string, unknown>;
  if (document.format !== 'VocabSpriteBackup' || document.schemaVersion !== 1) {
    throw new Error('不是受支持的 VocabSprite 备份。');
  }
  const state = normalizePersistedState(document.state);
  if (state === null) throw new Error('备份状态结构无效，未导入任何数据。');
  return state;
}
