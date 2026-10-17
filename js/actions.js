// Event delegation registry: elements with data-action="name" call the registered handler.
import { sheetOpen, closeNow } from './ui.js';

export const actions = {};
export const on = (name, fn) => { actions[name] = fn; };

export function go(route) {
  if (sheetOpen()) {
    closeNow();
    history.replaceState(null, '', `#/${route}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = `#/${route}`;
  }
  window.scrollTo({ top: 0 });
}

// Shared runtime context (e.g. the deferred PWA install prompt).
export const appCtx = { installPrompt: null };
