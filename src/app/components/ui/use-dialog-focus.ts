import { useRef } from 'react';

// Controlled dialogs can be opened from several cards or a dashboard shortcut.
// Keep keyboard focus near the action even when there is no Radix Trigger.
export function useDialogFocus() {
  const returnTarget = useRef<HTMLElement | null>(null);
  return {
    rememberFocus() {
      const active = document.activeElement;
      returnTarget.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    restoreFocus(event: Event) {
      event.preventDefault();
      window.requestAnimationFrame(() => {
        const target = returnTarget.current;
        // Another dialog may have opened from the first one; let it own focus.
        if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
        if (target?.isConnected && !target.closest('[inert]')) target.focus();
        else document.querySelector<HTMLElement>('#main-content')?.focus();
      });
    },
  };
}
