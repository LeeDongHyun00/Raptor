/** Viewer-supplied Anthropic key for the static build; kept apart from the SDK so reading it stays cheap. */

const KEY_STORAGE = "raptor.anthropicKey";

export function loadStoredKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/** Fired on this window whenever the key changes, so open screens can switch between demo and live. */
export const KEY_EVENT = "raptor:key";

export function storeKey(key: string | null) {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage blocked (private mode): the key just lives for this page view.
  }
  window.dispatchEvent(new Event(KEY_EVENT));
}
