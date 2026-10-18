// Overlay stack for "Back closes the top sheet first" (Android Back button,
// Escape). Sheets register while open; the native Back handler and
// pull-to-refresh consult it.

type CloseFn = () => void;

const stack: { id: number; close: CloseFn }[] = [];
let nextId = 1;

/** Register an open overlay. Returns an unregister function (call on close/unmount). */
export function pushOverlay(close: CloseFn): () => void {
  const id = nextId++;
  stack.push({ id, close });
  return () => {
    const index = stack.findIndex((entry) => entry.id === id);
    if (index !== -1) stack.splice(index, 1);
  };
}

/** Close the most recently opened overlay. Returns false when none is open. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

export function hasOpenOverlay(): boolean {
  return stack.length > 0;
}
