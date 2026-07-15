import { createFileRoute, redirect } from "@tanstack/react-router";

/** 独立 /editor 已收口；工作台首页已含编辑器 */
export const Route = createFileRoute("/editor")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
