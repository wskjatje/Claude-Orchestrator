import { useMemo } from "react";
import {
  AgentModelPicker,
  buildAutoLeadingOption,
  ChatEnabledModelPicker,
} from "@/components/chat-enabled-model-picker";
import { AUTO_MODEL_ID, inferOrchModeForChatModel, isAutoModelSelection } from "@/lib/model-catalog";

type OrchMode = "claude-code" | "local-mcp";

export type ModelPick = {
  mode: OrchMode;
  model: string;
};

type Props = {
  orchMode: OrchMode;
  cloudModels: string[];
  localModels: string[];
  modelValue: string;
  onModelPick: (pick: ModelPick) => void;
  modelFallback: string;
  disabled?: boolean;
};

export function ChatModelSelector({
  orchMode,
  cloudModels,
  localModels,
  modelValue,
  onModelPick,
  modelFallback,
  disabled,
}: Props) {
  const selectedModel = modelValue || modelFallback || "";
  const resolvedValue = isAutoModelSelection(selectedModel) ? AUTO_MODEL_ID : selectedModel;
  // 选择器始终展示两个已启用池；手选具体模型时由 onModelPick 切换执行通道。
  // orchMode 只记录当前执行通道，不再充当模型列表过滤器。
  const listCloud = cloudModels;
  const listLocal = localModels;
  const autoAvailable = listCloud.length > 0 || listLocal.length > 0;

  const leadingOptions = useMemo(
    () =>
      autoAvailable
        ? [buildAutoLeadingOption(listCloud, listLocal, isAutoModelSelection)]
        : [],
    [autoAvailable, listCloud, listLocal],
  );

  return (
    <ChatEnabledModelPicker
      variant="composer"
      side="top"
      cloudModels={listCloud}
      localModels={listLocal}
      value={resolvedValue}
      disabled={disabled}
      leadingOptions={leadingOptions}
      onChange={(next) => {
        if (isAutoModelSelection(next)) {
          onModelPick({ mode: orchMode, model: AUTO_MODEL_ID });
          return;
        }
        const mode = inferOrchModeForChatModel(next, {
          cloudModels,
          localModels,
        });
        onModelPick({ mode, model: next });
      }}
    />
  );
}
