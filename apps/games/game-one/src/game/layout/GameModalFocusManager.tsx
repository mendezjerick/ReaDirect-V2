import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function GameModalFocusManager() {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let restoreTarget: HTMLElement | null = null;

    const syncDialog = () => {
      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".game-route [role='dialog'][aria-modal='true'], .game-route [role='alertdialog'][aria-modal='true']"
        )
      ).filter((dialog) => dialog.getClientRects().length > 0);
      const nextDialog = dialogs.at(-1) ?? null;

      if (nextDialog === activeDialog) return;
      if (!activeDialog && nextDialog) {
        restoreTarget = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }

      activeDialog = nextDialog;
      if (!activeDialog) {
        restoreTarget?.focus({ preventScroll: true });
        restoreTarget = null;
        return;
      }

      if (!activeDialog.hasAttribute("tabindex")) {
        activeDialog.setAttribute("tabindex", "-1");
      }
      const preferred = activeDialog.querySelector<HTMLElement>(
        "[autofocus], [data-dialogue-primary], [data-first-choice], " + FOCUSABLE_SELECTOR
      );
      (preferred ?? activeDialog).focus({ preventScroll: true });
    };

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !activeDialog) return;
      const focusable = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        activeDialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(syncDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", trapFocus);
    syncDialog();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", trapFocus);
      restoreTarget?.focus({ preventScroll: true });
    };
  }, []);

  return null;
}
