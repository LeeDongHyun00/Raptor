/** Viewer-supplied Anthropic key for the static build; kept apart from the SDK so reading it stays cheap. */

const KEY_STORAGE = "raptor.anthropicKey";

export function loadStoredKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function storeKey(key: string | null) {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage blocked (private mode): the key just lives for this page view.
  }
}
