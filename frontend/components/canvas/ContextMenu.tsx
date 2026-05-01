"use client";

import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  mode: "pane" | "node";
  hasClipboard: boolean;
  onAddNote: () => void;
  onPaste: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  mode,
  hasClipboard,
  onAddNote,
  onPaste,
  onCopy,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[140px] overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {mode === "pane" && (
        <>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100"
            onClick={onAddNote}
          >
            Add Note
          </button>
          <button
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${hasClipboard ? "text-neutral-700 hover:bg-neutral-100" : "cursor-default text-neutral-400"}`}
            disabled={!hasClipboard}
            onClick={onPaste}
          >
            Paste
          </button>
        </>
      )}
      {mode === "node" && (
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100"
          onClick={onCopy}
        >
          Copy Node
        </button>
      )}
    </div>
  );
}
