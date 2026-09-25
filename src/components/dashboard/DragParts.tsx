"use client";

import { useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DASHBOARD_DROP, NEW_PREFIX, SIDEBAR_DROP, snapSpan, SPANS, type Span } from "@/lib/dashboard-widgets";

// A widget on the dashboard that can be dragged by its grip to reorder, or
// dragged onto the sidebar to remove. Only the grip starts a drag, so charts,
// tables and the map keep their own clicks and drags.
export function SortableWidget({
  id,
  title,
  className = "",
  span,
  onResize,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  // Width in 12ths of the row (wide screens); omitted for scorecards.
  span?: Span;
  onResize?: (span: Span) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const nodeRef = useRef<HTMLDivElement | null>(null);
  // Width while the resize handle is being dragged (committed on release).
  const [preview, setPreview] = useState<Span | null>(null);
  const shown = preview ?? span;

  function startResize(e: React.PointerEvent) {
    const node = nodeRef.current;
    const grid = node?.parentElement;
    if (!node || !grid || !onResize) return;
    e.preventDefault();
    e.stopPropagation();
    const left = node.getBoundingClientRect().left;
    const gridWidth = grid.getBoundingClientRect().width;
    let last: Span = span ?? 12;
    const move = (ev: PointerEvent) => {
      last = snapSpan(((ev.clientX - left) / gridWidth) * 12);
      setPreview(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setPreview(null);
      if (last !== span) onResize(last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        nodeRef.current = el;
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(shown ? ({ "--span": shown } as React.CSSProperties) : {}),
      }}
      className={`group relative ${shown ? "lg:[grid-column:span_var(--span)_/_span_var(--span)]" : ""} ${
        isDragging ? "z-10 opacity-40" : ""
      } ${preview ? "rounded-xl ring-2 ring-green-300" : ""} ${className}`}
    >
      {onResize && (
        <>
          {/* Drag the right edge to resize: 25 / 33 / 50 / 75 / 100% of the row. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize ${title}`}
            aria-valuenow={Math.round(((span ?? 12) / 12) * 100)}
            tabIndex={0}
            onPointerDown={startResize}
            // Keyboard: left/right arrows step through the widths.
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const i = SPANS.indexOf(span ?? 12);
              const next = SPANS[Math.max(0, Math.min(SPANS.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)))];
              if (next !== span) onResize(next);
            }}
            className="absolute -right-3 top-1/2 z-10 hidden h-16 w-3 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center outline-none focus-visible:[&>span]:opacity-100 lg:flex"
          >
            <span className="h-10 w-1 rounded-full bg-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {preview && (
            <span className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
              {Math.round((preview / 12) * 100)}%
            </span>
          )}
        </>
      )}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${title}`}
        className="absolute right-2 top-2 z-10 cursor-grab touch-none rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:text-zinc-600 active:cursor-grabbing group-hover:text-zinc-400"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

// A catalog item in the sidebar that can be dragged onto the dashboard.
export function CatalogDraggable({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${NEW_PREFIX}${id}` });
  return (
    <div ref={setNodeRef} className={`flex items-start gap-1 ${isDragging ? "opacity-40" : ""}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${title} onto the dashboard`}
        className="mt-2.5 cursor-grab touch-none rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// The dashboard area: dropping a catalog item here (not on a widget) adds it at the end.
export function DashboardDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DASHBOARD_DROP });
  return (
    <div ref={setNodeRef} className={`rounded-xl ${isOver ? "ring-2 ring-green-300 ring-offset-4" : ""}`}>
      {children}
    </div>
  );
}

// The sidebar: dropping a dashboard widget here removes it.
export function SidebarDropZone({ className, children }: { className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_DROP });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "bg-red-50/60" : ""}`}>
      {children}
    </div>
  );
}
