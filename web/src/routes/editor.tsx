import { createFileRoute, redirect } from "@tanstack/react-router";
import { EMPTY_CHAT_SEARCH } from "@/lib/chat-route-search";

/** 独立 /editor 已收口；工作台首页已含编辑器 */
export const Route = createFileRoute("/editor")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: EMPTY_CHAT_SEARCH });
  },
  component: () => null,
});
