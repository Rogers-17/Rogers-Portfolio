"use client"

import * as React from "react"
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { LuGripVertical } from "react-icons/lu"

// Vertical drag-and-drop list (mouse, touch and keyboard: focus the handle, Space, arrows, Space).

export function SortableList<T extends { id: string }> ({ items, onReorder, children }: {
    items: T[]
    onReorder: (items: T[]) => void
    children: React.ReactNode
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    function onDragEnd (event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const from = items.findIndex(item => item.id === active.id)
        const to = items.findIndex(item => item.id === over.id)
        if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

type RenderProps = { handle: React.ReactNode, dragging: boolean }

export function SortableRow ({ id, label, className = "", children }: { id: string, label: string, className?: string, children: (props: RenderProps) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
    const handle = (
        <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dim hover:bg-white/6 hover:text-white active:cursor-grabbing"
        >
            <LuGripVertical aria-hidden="true" />
        </button>
    )
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`${className} ${isDragging ? "relative z-20 opacity-80 shadow-2xl" : ""}`}
        >
            {children({ handle, dragging: isDragging })}
        </div>
    )
}
