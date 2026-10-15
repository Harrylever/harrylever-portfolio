"use client";

import { useEffect, useRef } from "react";

export const unsavedChangesMessage =
  "You have unsaved changes. Leave this page and lose them?";

let unloadAllowed = false;

/**
 * For explicit "discard and reload" buttons: the next unload proceeds
 * without the warning.
 */
export function reloadDiscardingChanges() {
  unloadAllowed = true;
  window.location.reload();
}

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Warns before leaving while `dirty`:
 * - full unloads (reload, typed URL, external links) via beforeunload;
 * - in-app navigation through <a>/<Link>: a capture-phase listener on the
 *   document runs before Next's Link handler and cancels it when the
 *   person chooses to stay.
 */
export function useUnsavedChangesWarning(
  dirty: boolean,
  message = unsavedChangesMessage,
) {
  const dirtyRef = useRef(dirty);

  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current || unloadAllowed) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented) return;
      if (!isPlainLeftClick(event)) return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;

      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const next = new URL(anchor.href, window.location.href);
      const here = new URL(window.location.href);

      // Same-document hash links don't leave the page.
      if (
        next.origin === here.origin &&
        next.pathname === here.pathname &&
        next.search === here.search
      ) {
        return;
      }
      if (window.confirm(message)) {
        // Navigation is going ahead; don't ask again from beforeunload.
        dirtyRef.current = false;

        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("click", onClick, true);

    return () => document.removeEventListener("click", onClick, true);
  }, [message]);
}

/** Component form of the hook, for server-rendered pages. */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);

  return null;
}
