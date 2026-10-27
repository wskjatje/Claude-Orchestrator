/** @see direct-chat-policy.mjs */
export const FULL_PLAN_USER_RE: RegExp;
export function userAskedForFullPlanReply(userLine: string): boolean;
export const DIRECT_CHAT_OUTPUT_RULE: string;
export function looksLikeTruncatedDirectReply(text: string): boolean;
export const FULL_PLAN_COMPLETENESS_RULE: string;
export function buildDirectChatPolicyBlock(userLine: string): string;
