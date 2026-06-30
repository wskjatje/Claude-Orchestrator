/**
 * 根据用户自然语言（感觉词 / 关键词）推断应调用的 Agent stem。
 * 与任务链 parse-active-chain 共用；聊天 Auto 模式亦使用。
 */
export function inferAgentStemFromText(text: string): string {
  const t = text.trim();
  if (!t) return "product-manager";

  if (/(画|绘制|设计稿|mockup|原型|视觉稿|ui\s*稿|界面设计|登录页|注册页|忘记密码)/i.test(t)) {
    if (/(信息架构|交互流程|ux\s*结构|线框)/i.test(t)) return "design-ux-architect";
    if (/(视觉|配色|组件库|像素|美观)/i.test(t)) return "design-ui-designer";
    return "frontend-engineer";
  }

  if (/(前端|ui|ux|页面|界面|组件|react|vue|样式|html|css|tailwind)/i.test(t)) {
    return "frontend-engineer";
  }
  if (/(后端|api|接口|数据库|sql|模型|服务|引擎|算法|推理)/i.test(t)) {
    return "backend-engineer";
  }
  if (/(测试|qa|验收|回归|用例)/i.test(t)) {
    return "qa-engineer";
  }
  if (/(评审|审查|review|代码质量|安全审计)/i.test(t)) {
    return "code-reviewer";
  }
  if (/(部署|发布|devops|ci|cd|运维|监控|容器|docker|k8s)/i.test(t)) {
    return "devops-engineer";
  }
  if (/(架构|边界|选型|数据流|模块划分)/i.test(t)) {
    return "software-architect";
  }
  if (/(产品|prd|需求|验收口径|优先级|范围)/i.test(t)) {
    return "product-manager";
  }
  if (/(项目|里程碑|排期|wbs|风险|依赖|拆解)/i.test(t)) {
    return "project-manager";
  }
  if (/(写作|文案|文章|博客)/i.test(t)) {
    return "__general__";
  }

  return "__general__";
}
