import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAppStore } from "@/store/useAppStore";
import { ChatsView } from "@/components/views/ChatsView";
import { LibraryView } from "@/components/views/LibraryView";
import { IntegrationsView } from "@/components/views/IntegrationsView";
import { CanvasWorkspace } from "@/components/views/CanvasWorkspace";
import { AgentWorkspace } from "@/components/views/AgentWorkspace";
import { ChatWorkspace } from "@/components/views/ChatWorkspace";
import { SettingsView } from "@/components/views/SettingsView";

export function AppShell() {
  const location = useLocation();
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const isFullBleed =
    location.pathname.startsWith("/canvas") ||
    location.pathname.startsWith("/design");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-0 text-text-primary">
      {!isFullBleed && <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        {!isFullBleed && (
          <div className="flex shrink-0 items-center border-b border-border px-2 py-2 sm:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
              className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
            >
              <Menu className="size-[18px]" />
            </button>
            <span className="ml-1.5 text-[13px] font-medium">Omni</span>
          </div>
        )}

        <main className="flex min-h-0 flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/chats" replace />} />
            <Route path="/chats" element={<ChatsView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/integrations" element={<IntegrationsView />} />
            <Route path="/canvas" element={<CanvasWorkspace kind="canvas" />} />
            <Route path="/canvas/:chatId" element={<CanvasWorkspace kind="canvas" />} />
            <Route path="/design" element={<CanvasWorkspace kind="design" />} />
            <Route path="/design/:chatId" element={<CanvasWorkspace kind="design" />} />
            <Route path="/agent/:chatId" element={<AgentWorkspace />} />
            <Route path="/chat/:chatId" element={<ChatWorkspace />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
