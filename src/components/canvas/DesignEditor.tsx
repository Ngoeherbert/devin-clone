import { useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface DesignElement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  variant: "block" | "text" | "button";
}

interface CanvasSnapshot {
  id: string;
  kind: "canvas" | "design";
  version: number;
  data: { elements: DesignElement[] };
}

const DEFAULT_ELEMENTS: DesignElement[] = [
  { id: "1", x: 24, y: 24, w: 200, h: 24, label: "Title", variant: "text" },
  { id: "2", x: 24, y: 60, w: 200, h: 90, label: "Image", variant: "block" },
  { id: "3", x: 24, y: 168, w: 200, h: 36, label: "Continue", variant: "button" },
];

let counter = DEFAULT_ELEMENTS.length;

export function DesignEditor({ chatId }: { chatId: string }) {
  const [elements, setElements] = useState<DesignElement[]>(DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<CanvasSnapshot | null>(`/api/chats/${chatId}/canvas`)
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        setElements(snapshot.data.elements ?? DEFAULT_ELEMENTS);
        setVersion(snapshot.version);
        counter = snapshot.data.elements?.length ?? DEFAULT_ELEMENTS.length;
      })
      .catch(() => {
        // No snapshot yet — start from the default frame.
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const handlePointerDown = (e: React.PointerEvent, el: DesignElement) => {
    const frame = frameRef.current;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    dragRef.current = {
      id: el.id,
      offsetX: e.clientX - frameRect.left - el.x,
      offsetY: e.clientY - frameRect.top - el.y,
    };
    setSelectedId(el.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;
    const frameRect = frame.getBoundingClientRect();
    const x = Math.max(0, e.clientX - frameRect.left - drag.offsetX);
    const y = Math.max(0, e.clientY - frameRect.top - drag.offsetY);
    setElements((els) => els.map((el) => (el.id === drag.id ? { ...el, x, y } : el)));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const addElement = (variant: DesignElement["variant"]) => {
    counter += 1;
    const id = String(counter);
    const defaults: Record<DesignElement["variant"], Pick<DesignElement, "w" | "h" | "label">> = {
      text: { w: 160, h: 20, label: "Text" },
      block: { w: 200, h: 80, label: "Block" },
      button: { w: 140, h: 36, label: "Button" },
    };
    setElements((els) => [
      ...els,
      { id, x: 24, y: 24 + els.length * 12, ...defaults[variant], variant },
    ]);
    setSelectedId(id);
  };

  const renameSelected = (label: string) => {
    setElements((els) => els.map((el) => (el.id === selectedId ? { ...el, label } : el)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((els) => els.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const snapshot = await api.post<CanvasSnapshot>(`/api/chats/${chatId}/canvas`, {
        kind: "design",
        data: { elements },
      });
      setVersion(snapshot.version);
      toast.success(`Saved (v${snapshot.version})`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the design.");
    } finally {
      setSaving(false);
    }
  };

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-auto sm:flex-row sm:overflow-hidden">
      <div
        ref={frameRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.target === frameRef.current && setSelectedId(null)}
        className="relative mx-auto my-4 h-[420px] w-[240px] shrink-0 rounded-2xl border border-border bg-surface-1 shadow-sm sm:m-auto"
      >
        {elements.map((el) => (
          <div
            key={el.id}
            onPointerDown={(e) => handlePointerDown(e, el)}
            style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
            className={cn(
              "absolute cursor-grab select-none rounded-md text-[11px] active:cursor-grabbing",
              el.variant === "block" && "flex items-center justify-center bg-bg-accent text-text-accent",
              el.variant === "text" && "flex items-center px-1 font-medium text-text-primary",
              el.variant === "button" &&
                "flex items-center justify-center bg-text-primary text-surface-1",
              selectedId === el.id && "ring-2 ring-border-accent"
            )}
          >
            {el.label}
          </div>
        ))}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 border-t border-border p-3 sm:w-[200px] sm:border-l sm:border-t-0">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-text-muted">Add element</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => addElement("text")}>
              <Plus className="size-3" />
              Text
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addElement("block")}>
              <Plus className="size-3" />
              Block
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => addElement("button")}>
            <Plus className="size-3" />
            Button
          </Button>
        </div>

        {selected && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="text-[11px] font-medium text-text-muted">Selected</span>
            <input
              value={selected.label}
              onChange={(e) => renameSelected(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-1 px-2 text-[12.5px] outline-none focus:border-border-accent"
            />
            <Button size="sm" variant="secondary" onClick={deleteSelected}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving} className="mt-auto">
          <Save className="size-3.5" />
          {saving ? "Saving…" : version ? `Save (v${version})` : "Save"}
        </Button>
      </div>
    </div>
  );
}
