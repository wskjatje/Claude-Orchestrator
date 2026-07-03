import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 通用 ErrorBoundary 组件。
 * 捕获子组件树中的未处理异常，显示降级 UI 而非白屏。
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[ErrorBoundary] 捕获异常:", error.message, info.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center",
            this.props.className,
          )}
          role="alert"
        >
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-[13px] font-medium text-foreground">页面渲染异常</p>
          <p className="max-w-md text-[11.5px] text-muted-foreground">
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 rounded-md border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
