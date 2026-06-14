# Claude Workbench — 本机 Bridge 接入指南

## 概念
Claude Workbench 前端通过 WebSocket 与本机 Bridge 守护进程通信,后者代理本地 `claude` CLI 与 `~/.claude/*` 文件系统。

## 连接配置
默认地址:`ws://127.0.0.1:18789`
在概览页或设置页可修改;客户端会自动重连(指数退避)。

## Bridge 协议
Bridge 接收浏览器的请求,推送以下事件给前端:

```ts
type BridgeEvent =
  | { type: "hello"; payload: { version: string; account?: string; subscription?: string } }
  | { type: "tool_use"; payload: { name: string; input: unknown } }
  | { type: "tool_result"; payload: { name: string; result: unknown } }
  | { type: "message_delta"; payload: { content: string; tokens_in?: number; tokens_out?: number } }
  | { type: "session_update"; payload: { id: string; title?: string } }
  | { type: "mcp_status"; payload: { servers: { name: string; ok: boolean }[] } }
  | { type: "error"; payload: { message: string } };
```

## 守护进程参考实现(单独发布)
推荐使用 `@anthropic-ai/claude-agent-sdk` 在 Node.js 中实现;
示例:`scripts/claude-bridge.mjs`(可选另行交付)。

## 离线降级
Bridge 未连接时:
- 顶部出现「Bridge 离线」提示条
- 所有页面继续显示数据库内的缓存数据
- 聊天可降级到 Lovable AI Gateway(需后续实现)
