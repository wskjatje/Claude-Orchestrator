import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { toast } from "sonner";
import { isBlankBrowserUrl } from "@/lib/workbench-browser-frame";
import { getEmbeddedBrowserNative } from "@/lib/embedded-browser-native";

export type BrowserInspectorState = {
  tabId: string | null;
  pageUrl: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeKey: number;
  /** iframe 加载后探测 contentDocument 是否可访问 */
  domAccessible: boolean;
  /** 桌面 WebContentsView 后端 */
  native: boolean;
  pickerActive: boolean;
  devtoolsOpen: boolean;
  componentsOpen: boolean;
  selectedSelector: string | null;
};

type BrowserInspectorContextValue = {
  state: BrowserInspectorState;
  inspectable: boolean;
  registerBrowser: (
    tabId: string,
    pageUrl: string,
    iframeRef: RefObject<HTMLIFrameElement | null>,
    iframeKey: number,
  ) => void;
  registerNativeBrowser: (tabId: string, pageUrl: string) => void;
  unregisterBrowser: (tabId: string) => void;
  notifyFrameLoaded: (tabId: string, domAccessible: boolean) => void;
  togglePicker: () => void;
  toggleDevtools: () => void;
  toggleComponents: () => void;
  setSelectedSelector: (selector: string | null) => void;
  setPickerActive: (active: boolean) => void;
};

const defaultState: BrowserInspectorState = {
  tabId: null,
  pageUrl: "",
  iframeRef: { current: null },
  iframeKey: 0,
  domAccessible: false,
  native: false,
  pickerActive: false,
  devtoolsOpen: false,
  componentsOpen: false,
  selectedSelector: null,
};

const BrowserInspectorContext = createContext<BrowserInspectorContextValue | null>(null);

function guardInspectable(state: BrowserInspectorState): boolean {
  if (isBlankBrowserUrl(state.pageUrl)) {
    toast.message("请先在地址栏加载页面");
    return false;
  }
  if (!state.domAccessible) {
    toast.message("页面尚未就绪，或内嵌浏览器未加载完成");
    return false;
  }
  return true;
}

export function BrowserInspectorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BrowserInspectorState>(defaultState);
  const sharedIframeRef = useRef<RefObject<HTMLIFrameElement | null>>({ current: null });

  const inspectable = !isBlankBrowserUrl(state.pageUrl) && (state.native || state.domAccessible);

  const registerBrowser = useCallback(
    (tabId: string, pageUrl: string, iframeRef: RefObject<HTMLIFrameElement | null>, iframeKey: number) => {
      sharedIframeRef.current = iframeRef;
      setState((prev) => ({
        ...prev,
        tabId,
        pageUrl,
        iframeRef,
        iframeKey,
        native: false,
        domAccessible: false,
        pickerActive: prev.tabId === tabId ? prev.pickerActive : false,
        devtoolsOpen: prev.tabId === tabId ? prev.devtoolsOpen : false,
        componentsOpen: prev.tabId === tabId ? prev.componentsOpen : false,
        selectedSelector: prev.tabId === tabId ? prev.selectedSelector : null,
      }));
    },
    [],
  );

  const registerNativeBrowser = useCallback((tabId: string, pageUrl: string) => {
    setState((prev) => ({
      ...prev,
      tabId,
      pageUrl,
      iframeRef: sharedIframeRef.current ?? { current: null },
      iframeKey: prev.iframeKey + 1,
      native: true,
      domAccessible: !isBlankBrowserUrl(pageUrl),
      pickerActive: prev.tabId === tabId ? prev.pickerActive : false,
      devtoolsOpen: false,
      componentsOpen: false,
      selectedSelector: prev.tabId === tabId ? prev.selectedSelector : null,
    }));
  }, []);

  function syncNativePicker(tabId: string, active: boolean) {
    void getEmbeddedBrowserNative()?.setPickerActive(tabId, active);
  }

  const notifyFrameLoaded = useCallback((tabId: string, domAccessible: boolean) => {
    setState((prev) => {
      if (prev.tabId !== tabId) return prev;
      return { ...prev, domAccessible };
    });
  }, []);

  const unregisterBrowser = useCallback((tabId: string) => {
    setState((prev) => {
      if (prev.tabId !== tabId) return prev;
      return { ...defaultState, iframeRef: sharedIframeRef.current ?? { current: null } };
    });
  }, []);

  const togglePicker = useCallback(() => {
    setState((prev) => {
      if (!guardInspectable(prev)) return prev;
      const next = !prev.pickerActive;
      if (prev.native && prev.tabId) {
        syncNativePicker(prev.tabId, next);
      }
      return { ...prev, pickerActive: next, componentsOpen: next ? false : prev.componentsOpen };
    });
  }, []);

  const toggleDevtools = useCallback(() => {
    setState((prev) => {
      if (!guardInspectable(prev)) return prev;
      if (prev.native && prev.tabId) {
        void getEmbeddedBrowserNative()?.openDevTools(prev.tabId);
        return prev;
      }
      return { ...prev, devtoolsOpen: !prev.devtoolsOpen };
    });
  }, []);

  const toggleComponents = useCallback(() => {
    setState((prev) => {
      if (!guardInspectable(prev)) return prev;
      if (prev.native) {
        toast.message("组件树请使用开发者工具查看");
        return prev;
      }
      return { ...prev, componentsOpen: !prev.componentsOpen, pickerActive: false };
    });
  }, []);

  const setSelectedSelector = useCallback((selector: string | null) => {
    setState((prev) => ({ ...prev, selectedSelector: selector }));
  }, []);

  const setPickerActive = useCallback((active: boolean) => {
    setState((prev) => {
      if (prev.native && prev.tabId) {
        syncNativePicker(prev.tabId, active);
      }
      return { ...prev, pickerActive: active };
    });
  }, []);

  const value = useMemo(
    () => ({
      state,
      inspectable,
      registerBrowser,
      registerNativeBrowser,
      unregisterBrowser,
      notifyFrameLoaded,
      togglePicker,
      toggleDevtools,
      toggleComponents,
      setSelectedSelector,
      setPickerActive,
    }),
    [
      state,
      inspectable,
      registerBrowser,
      registerNativeBrowser,
      unregisterBrowser,
      notifyFrameLoaded,
      togglePicker,
      toggleDevtools,
      toggleComponents,
      setSelectedSelector,
      setPickerActive,
    ],
  );

  return (
    <BrowserInspectorContext.Provider value={value}>{children}</BrowserInspectorContext.Provider>
  );
}

export function useBrowserInspector() {
  const ctx = useContext(BrowserInspectorContext);
  if (!ctx) {
    throw new Error("useBrowserInspector must be used within BrowserInspectorProvider");
  }
  return ctx;
}

export function useBrowserInspectorOptional() {
  return useContext(BrowserInspectorContext);
}
