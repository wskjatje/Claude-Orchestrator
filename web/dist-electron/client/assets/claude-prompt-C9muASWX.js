import{c as p}from"./app-shell-DbOTmUz6.js";const w=[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]],_=p("wrench",w);function C(n){const t=typeof n=="string"?n.trim().toLowerCase():"";return!t||t==="auto"||t==="__auto__"}function k(n){const t=typeof n=="string"?n.trim():"";return!t||C(t)?"product-manager":(t.toLowerCase().endsWith(".md")?t.slice(0,-3).trim():t)||"product-manager"}function $(n){return typeof n=="string"&&n.trim().length>0}async function A(n,t){let r="";if($(t.workspaceDir))try{const e=await n.workspaceGetExecutionSnapshot();e?.ok&&typeof e.text=="string"&&e.text.trim()&&(r="\n【当前项目执行情况快照】\n以下为应用从你的「所选工作区」采集的客观事实；若须写入磁盘请使用 ```workspace-write``` JSON。\n\n"+e.text.trim())}catch{r=`
【快照】采集失败，可忽略。
`}let i="";if(typeof n.getCrossAgentContext=="function")try{const e=await n.getCrossAgentContext();e?.ok&&typeof e.text=="string"&&e.text.trim()&&(i=`

`+e.text.trim())}catch{}const l=t.orchestration??{},f=l.localOllamaModel?.trim()||"（用户未在设置中指定，可先 ollama_list_models 再选）",d=l.orchestratorModel?.trim()||"（由会话选择）",m=k(t.localAgentBasename??void 0),u=t.skipDefaultRoleBlock?"":[`【角色】Agent「${m}」`,m==="product-manager"?"先做需求澄清与验收口径；未确认前不做破坏性变更。":""].filter(Boolean).join(`
`),a=[["【环境】Claude Code CLI；本机 Ollama 须经 MCP 工具 ollama_chat 调用。",`【模型】编排 ${d}；Ollama ${f}`,t.workspaceDir?`【工作区】${t.workspaceDir}`:"","【语言】简体中文（代码与路径除外）。","【写盘】保存到工作区时使用 ```workspace-write``` JSON。",r,i].filter(Boolean).join(`
`)];u&&a.push(u),t.chainCatalogSnippet?.trim()&&a.push(t.chainCatalogSnippet.trim());for(const e of t.priorHistory){if(e.role!=="user"&&e.role!=="assistant")continue;const o=e.role==="user"?"### 用户":"### 助手";let h=e.content;if(e.role==="user"&&e.attachments?.length){const g=e.attachments.filter(s=>s?.kind==="image").map(s=>s.name||"image").join(", ");h+=`
（本条含 ${e.attachments.length} 个图片附件${g?`：${g}`:""}；若已落盘可在 .claudecode/chat-images/ 查找。）`}a.push(`${o}
${h}`)}let c=t.userLine;if(t.savedImagePaths?.length)c+=`

【附图·已落盘】用户上传 ${t.savedImagePaths.length} 张截图，工作区相对路径：
${t.savedImagePaths.map(e=>`- ${e}`).join(`
`)}
请使用 Read 工具读取上述图片并结合用户问题分析（例如 HTTP 404 页面、终端报错）；禁止声称无法查看图片。`;else if(t.userAttachments?.length){const e=t.userAttachments.filter(o=>o?.kind==="image").map(o=>o.name||"image").join(", ");c+=`

【附图】用户附带 ${t.userAttachments.length} 张截图${e?`（${e}）`:""}。请根据用户在对话中的描述与上下文排查；若需读图请提示用户确认工作区已落盘或使用支持视觉的模型。`}return a.push(`### 用户（本轮）
${c}`),a.push("### 指令\n1）理解「用户（本轮）」意图；2）如需本机开源模型推理，先判定权限与任务范围，再调用 MCP 工具 `ollama_chat`（勿跳过 Claude 编排）；3）如需列举已安装模型，可调用 `ollama_list_models`；4）其它工具/MCP/Skill 按工作区配置执行。"),a.join(`

`)}export{_ as W,k as a,A as b,C as i};
