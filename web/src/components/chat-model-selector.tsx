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
  const autoAvailable = cloudModels.length > 0 || localModels.length > 0;

  const leadingOptions = useMemo(
    () =>
      autoAvailable
        ? [buildAutoLeadingOption(cloudModels, localModels, isAutoModelSelection)]
        : [],
    [autoAvailable, cloudModels, localModels],
  );

  return (
    <ChatEnabledModelPicker
      variant="composer"
      side="top"
      cloudModels={cloudModels}
      localModels={localModels}
      value={resolvedValue}
      disabled={disabled}
      leadingOptions={leadingOptions}
      onChange={(next) => {
        if (isAutoModelSelection(next)) {
          onModelPick({ mode: orchMode, model: AUTO_MODEL_ID });
          return;
        }
        const mode = inferOrchModeForChatModel(next, { cloudModels, localModels });
        onModelPick({ mode, model: next });
      }}
    />
  );
}
