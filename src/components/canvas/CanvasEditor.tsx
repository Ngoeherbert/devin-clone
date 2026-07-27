import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface CanvasSnapshot {
  id: string;
  kind: "canvas" | "design";
  version: number;
  data: { nodes: Node[]; edges: Edge[] };
}

const DEFAULT_NODES: Node[] = [
  { id: "1", position: { x: 60, y: 40 }, data: { label: "Table" }, type: "default" },
];

let nodeCounter = 1;

export function CanvasEditor({ chatId }: { chatId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<CanvasSnapshot | null>(`/api/chats/${chatId}/canvas`)
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        setNodes(snapshot.data.nodes ?? DEFAULT_NODES);
        setEdges(snapshot.data.edges ?? []);
        setVersion(snapshot.version);
        nodeCounter = snapshot.data.nodes?.length ?? 1;
      })
      .catch(() => {
        // No snapshot yet — start from the default single node.
      })
      .finally(() => {
        loadedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleAddNode = () => {
    nodeCounter += 1;
    const id = String(nodeCounter);
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 80 + ((nodeCounter * 40) % 240), y: 80 + ((nodeCounter * 60) % 200) },
        data: { label: `Table ${nodeCounter}` },
        type: "default",
      },
    ]);
  };

  const handleRename: NodeMouseHandler = (_event, node) => {
    const next = window.prompt("Rename table", String(node.data.label ?? ""));
    if (next === null) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: next } } : n))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const snapshot = await api.post<CanvasSnapshot>(`/api/chats/${chatId}/canvas`, {
        kind: "canvas",
        data: { nodes, edges },
      });
      setVersion(snapshot.version);
      toast.success(`Saved (v${snapshot.version})`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the canvas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleRename}
        fitView
        colorMode="light"
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="absolute right-2 top-2 z-10 flex gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <Button size="sm" variant="secondary" onClick={handleAddNode}>
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Add table</span>
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="size-3.5" />
          <span className="hidden sm:inline">
            {saving ? "Saving…" : version ? `Save (v${version})` : "Save"}
          </span>
        </Button>
      </div>

      <p className="pointer-events-none absolute bottom-4 right-4 hidden text-[11px] text-text-muted sm:block">
        Double-click a table to rename it, drag from its edge to connect.
      </p>
    </div>
  );
}
