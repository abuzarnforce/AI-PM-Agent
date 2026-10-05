"use client";

import { createContext, useContext } from "react";

export type Tab =
  | "home"
  | "agent"
  | "standup"
  | "projects"
  | "roadmap"
  | "health"
  | "studio"
  | "feedback"
  | "drafts"
  | "activity"
  | "connections";

/** Optional hand-off when jumping between screens, e.g. the command palette
 * opening the Agent with a question already asked. */
export interface NavIntent {
  question?: string;
  brief?: string;
  studioKind?: "user_story" | "prd" | "brd";
  subtab?: string;
}

export const NavContext = createContext<{ navigate: (tab: Tab, intent?: NavIntent) => void; intent: NavIntent | null }>({
  navigate: () => {},
  intent: null,
});

export const useNav = () => useContext(NavContext);
