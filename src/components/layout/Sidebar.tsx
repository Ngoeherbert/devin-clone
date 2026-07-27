import { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  Image,
  Plug,
  Waypoints,
  Palette,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Bot,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { chatPath, viewPath } from "@/lib/routes";
import type { ViewId, ChatSession } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tabs: { id: ViewId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "library", label: "Library", icon: Image },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "canvas", label: "Canvas", icon: Waypoints },
  { id: "design", label: "Design", icon: Palette },
];

const chatIcon = (type: ChatSession["type"]) =>
  ({ agent: Bot, canvas: Waypoints, design: Palette, image: Image, chat: MessageCircle }[type]);

function SidebarLink({
  icon: Icon,
  label,
  to,
  collapsed,
  onNavigate,
}: {
  icon: typeof MessageCircle;
  label: string;
  to: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
          collapsed && "sm:justify-center sm:px-0",
          isActive
            ? "bg-surface-2 text-text-accent"
            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        )
      }
    >
      <Icon className="size-[15px] shrink-0" />
      <span className={cn("truncate", collapsed && "sm:hidden")}>{label}</span>
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="hidden sm:block">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    chats,
    chatsLoaded,
    fetchChats,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Collapsed-icon-only styling only applies at sm+ — on mobile the drawer is
  // always full width when open, regardless of the desktop collapse toggle.
  const collapsed = sidebarCollapsed;
  const closeOnMobile = () => setMobileSidebarOpen(false);

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          onClick={closeOnMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-85 shrink-0 flex-col border-r border-border bg-surface-1 transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 sm:transition-[width]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "sm:w-13" : "sm:w-53"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-2.5 py-2.5">
          <span className={cn("flex-1 text-[13px] font-medium", collapsed && "sm:hidden")}>
            Omni
          </span>
          <button
            onClick={closeOnMobile}
            aria-label="Close menu"
            className="flex size-6 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-surface-2 sm:hidden"
          >
            <X className="size-4" />
          </button>
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden size-6 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-surface-2 hover:text-text-primary sm:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <div className="flex flex-col gap-0.5 p-1.5">
          {tabs.map((t) => (
            <SidebarLink
              key={t.id}
              icon={t.icon}
              label={t.label}
              to={viewPath(t.id)}
              collapsed={collapsed}
              onNavigate={closeOnMobile}
            />
          ))}
        </div>

        <div className="mt-1.5 flex min-h-0 flex-1 flex-col px-1.5">
          <div className={cn("px-1 pb-1 pt-2 text-[11px] font-medium text-text-muted", collapsed && "sm:hidden")}>
            Recent
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
            {chatsLoaded && chats.length === 0 && (
              <p className={cn("px-2 py-1.5 text-[12px] text-text-muted", collapsed && "sm:hidden")}>
                No chats yet
              </p>
            )}
            {chats.map((chat) => {
              const Icon = chatIcon(chat.type);
              const path = chatPath(chat);
              const active = location.pathname === path;
              const item = (
                <button
                  key={chat.id}
                  onClick={() => {
                    navigate(path);
                    closeOnMobile();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-surface-2 text-text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                    collapsed && "sm:justify-center sm:px-0"
                  )}
                >
                  <Icon className="size-[14px] shrink-0" />
                  <span className={cn("truncate text-left", collapsed && "sm:hidden")}>
                    {chat.title}
                  </span>
                </button>
              );
              if (!collapsed) return item;
              return (
                <Tooltip key={chat.id}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right" className="hidden sm:block">
                    {chat.title}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border p-1.5">
          <SidebarLink
            icon={Settings}
            label="Settings"
            to={viewPath("settings")}
            collapsed={collapsed}
            onNavigate={closeOnMobile}
          />
        </div>
      </aside>
    </>
  );
}

export function NewSessionButton({ collapsed }: { collapsed: boolean }) {
  return (
    <button
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface-1 py-1.5 text-[12.5px] font-medium text-text-primary hover:bg-surface-2",
        collapsed ? "w-8" : "w-full"
      )}
    >
      <Plus className="size-3.5" />
      {!collapsed && "New session"}
    </button>
  );
}
