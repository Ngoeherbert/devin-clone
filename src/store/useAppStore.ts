import { create } from "zustand";
import type { ChatMode, ChatSession } from "@/types";
import { api } from "@/lib/api";

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;

  islandOpen: boolean;
  setIslandOpen: (open: boolean) => void;

  chats: ChatSession[];
  chatsLoaded: boolean;
  fetchChats: () => Promise<void>;
  addChat: (chat: ChatSession) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  chatMode: "agent",
  setChatMode: (mode) => set({ chatMode: mode }),

  islandOpen: false,
  setIslandOpen: (open) => set({ islandOpen: open }),

  chats: [],
  chatsLoaded: false,
  fetchChats: async () => {
    if (get().chatsLoaded) return;
    const chats = await api.get<ChatSession[]>("/api/chats");
    set({ chats, chatsLoaded: true });
  },
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
}));
