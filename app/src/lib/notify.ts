import { create } from 'zustand';

/** In-app messaging: short notes appear as a toast, anything with a title or a choice as a dialog. */
export type Dialog = {
  id: number;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};
export type Toast = { id: number; message: string };

type State = {
  dialogs: Dialog[];
  toast: Toast | null;
  close: (id: number, ok: boolean) => void;
  dismissToast: (id: number) => void;
};

let seq = 0;
export const useNotices = create<State>((set, get) => ({
  dialogs: [],
  toast: null,
  close: (id, ok) => {
    const dialog = get().dialogs.find((d) => d.id === id);
    set({ dialogs: get().dialogs.filter((d) => d.id !== id) });
    dialog?.resolve(ok);
  },
  dismissToast: (id) => { if (get().toast?.id === id) set({ toast: null }); },
}));

function openDialog(d: Omit<Dialog, 'id' | 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useNotices.setState((s) => ({ dialogs: [...s.dialogs, { ...d, id: ++seq, resolve }] }));
  });
}

/** A passing note (toast). Pass a title to show it as a dialog the person has to read instead. */
export function notify(message: string, title?: string) {
  if (title) {
    void openDialog({ title, message });
    return;
  }
  const id = ++seq;
  useNotices.setState({ toast: { id, message } });
  setTimeout(() => useNotices.getState().dismissToast(id), Math.min(6000, 2600 + message.length * 35));
}

/** Confirmation dialog; resolves true only when the person confirms. */
export function confirm(message: string, confirmLabel: string, cancelLabel: string, destructive = true): Promise<boolean> {
  return openDialog({ message, confirmLabel, cancelLabel, destructive });
}
