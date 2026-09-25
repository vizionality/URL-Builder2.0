"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DASHBOARD_DROP, NEW_PREFIX, SIDEBAR_DROP } from "@/lib/dashboard-widgets";

// A widget on the dashboard that can be dragged by its grip to reorder, or
// dragged onto the sidebar to remove. Only the grip starts a drag, so charts,
// tables and the map keep their own clicks and drags.
export function SortableWidget({
  id,
  title,
  className = "",
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group relative ${isDragging ? "z-10 opacity-40" : ""} ${className}`}
    >
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
