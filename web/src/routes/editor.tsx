import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDesktop } from '@/lib/desktop-api';
import { AppShell } from '@/components/app-shell';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor, EditorTab } from '@/components/code-editor';
import { FileBrowser, FileTreeItem } from '@/components/file-browser';
import { Chat, MessageSquare, FileCode, FolderKanban, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { isBinaryFileResult, isBinaryPath, contentLooksBinary } from '@/lib/is-binary-file';
import { normalizeFileContentForEditor } from '@/lib/format-file-content';

export const Route = createFileRoute('/editor')({
  component: EditorPage,
});

function EditorPage() {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'files' | 'settings'>('files');
  const [isLoading, setIsLoading] = useState(false);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  // 加载工作区
  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = useCallback(async () => {
    const desktop = getDesktop();
    if (!desktop) return;
    
    const ws = await desktop.getWorkspace();
    setWorkspace(ws);
    
    if (ws) {
      await refreshFileTree();
    }
  }, []);

  // 刷新文件树
  const refreshFileTree = useCallback(async () => {
    const desktop = getDesktop();
    if (!desktop?.listWorkspacePanelTree) return;
    
    try {
      const result = await desktop.listWorkspacePanelTree();
      if (result.ok && result.tree) {
        const normalizedTree = normalizeTree(result.tree, workspace || '');
        setFileTree(normalizedTree);
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
    }
  }, [workspace]);

  // 规范化树结构
  const normalizeTree = (nodes: any[], rootPath: string): FileTreeItem[] => {
    return nodes.map(node => {
      const fullPath = rootPath ? `${rootPath}/${node.name}` : node.name;
      return {
        name: node.name,
        path: fullPath,
        type: node.type,
        ext: node.ext,
        children: node.children ? normalizeTree(node.children, fullPath) : undefined,
      };
    });
  };

  // 打开文件
  const openFile = useCallback(async (filePath: string, fileName: string) => {
    const desktop = getDesktop();
    if (!desktop?.readWorkspaceTextFile) return;
    
    // 检查是否已经打开
    const existingTab = tabs.find(t => t.path === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      if (isBinaryPath(filePath) || (!existingTab.binary && contentLooksBinary(existingTab.content))) {
        try {
          const result = await desktop.readWorkspaceTextFile(filePath);
          if (result.ok) {
            const binary = isBinaryFileResult(filePath, result.text, result.binary);
            setTabs(prev => prev.map(t => t.id === existingTab.id ? {
              ...t,
              content: binary ? '' : normalizeFileContentForEditor(filePath, result.text || ''),
              binary,
              size: result.size,
              binaryBase64: binary ? (result.base64 ?? null) : null,
              previewBytes: result.previewBytes,
              truncated: Boolean(result.truncated),
              dirty: false,
            } : t));
          }
        } catch { /* ignore */ }
      }
      return;
    }
    
    try {
      const result = await desktop.readWorkspaceTextFile(filePath);
      if (result.ok) {
        const binary = isBinaryFileResult(filePath, result.text, result.binary);
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const newTab: EditorTab = {
          id: `tab-${Date.now()}`,
          path: filePath,
          name: fileName,
          content: binary ? '' : normalizeFileContentForEditor(filePath, result.text || ''),
          language: ext,
          dirty: false,
          binary,
          size: result.size,
          binaryBase64: binary ? (result.base64 ?? null) : null,
          previewBytes: result.previewBytes,
          truncated: Boolean(result.truncated),
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } else {
        toast.error('打开文件失败');
      }
    } catch (err) {
      console.error('Failed to open file:', err);
      toast.error('打开文件失败');
    }
  }, [tabs]);

  // 处理文件点击
  const handleFileClick = useCallback((path: string, name: string, type: 'file' | 'dir') => {
    if (type === 'file') {
      openFile(path, name);
    }
  }, [openFile]);

  // 保存文件
  const saveFile = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const desktop = getDesktop();
    if (!desktop?.workspaceApplyWriteFence) {
      toast.error('无法保存文件');
      return;
    }
    
    try {
      const result = await desktop.workspaceApplyWriteFence([{
        path: tab.path,
        content: tab.content,
      }]);
      
      if (result.ok && result.written?.length) {
        setTabs(prev => prev.map(t => 
          t.id === tabId ? { ...t, dirty: false } : t
        ));
        toast.success('文件已保存');
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      toast.error('保存失败');
    }
  }, [tabs]);

  // 内容变化
  const handleContentChange = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, content, dirty: true } : t
    ));
  }, []);

  // 关闭标签页
  const closeTab = useCallback((tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    if (activeTabId === tabId) {
      if (tabs.length > 1) {
        const newIndex = index > 0 ? index - 1 : 0;
        setActiveTabId(tabs[newIndex]?.id || null);
      } else {
        setActiveTabId(null);
      }
    }
  }, [tabs, activeTabId]);

  // 新建文件
  const createFile = useCallback(async (parentPath: string, name: string) => {
    const desktop = getDesktop();
    if (!desktop?.workspaceApplyWriteFence) return;
    
    try {
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      const result = await desktop.workspaceApplyWriteFence([{
        path: fullPath,
        content: '',
      }]);
      
      if (result.ok) {
        toast.success('文件已创建');
        await refreshFileTree();
        await openFile(fullPath, name);
      } else {
        toast.error(result.error || '创建文件失败');
      }
    } catch (err) {
      console.error('Failed to create file:', err);
      toast.error('创建文件失败');
    }
  }, [refreshFileTree, openFile]);

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* 顶部工具栏 */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <h1 className="font-semibold">Claude Orchestrator - 编辑器</h1>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            返回聊天
          </Button>
        </div>
        
        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* 左侧 - 代码编辑器 */}
            <ResizablePanel defaultSize={70} minSize={40}>
              <div className="flex h-full flex-col">
                <CodeEditor
                  activeTab={activeTab}
                  tabs={tabs}
                  onTabChange={setActiveTabId}
                  onTabClose={closeTab}
                  onContentChange={handleContentChange}
                  onSave={saveFile}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* 右侧 - 多功能面板 */}
            <ResizablePanel defaultSize={30} minSize={25}>
              <div className="flex h-full flex-col">
                <Tabs value={rightPanelMode} onValueChange={(v: any) => setRightPanelMode(v)} className="flex-1 flex flex-col">
                  <TabsList className="mx-2 mt-2">
                    <TabsTrigger value="files" className="gap-1">
                      <FolderKanban className="h-4 w-4" />
                      文件
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="gap-1">
                      <MessageSquare className="h-4 w-4" />
                      聊天
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-1">
                      <Settings className="h-4 w-4" />
                      设置
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="files" className="flex-1 overflow-hidden p-0">
                    <FileBrowser
                      workspaceRoot={workspace}
                      tree={fileTree}
                      onFileClick={handleFileClick}
                      onRefresh={refreshFileTree}
                      onCreateFile={createFile}
                    />
                  </TabsContent>
                  
                  <TabsContent value="chat" className="flex-1 overflow-hidden p-4">
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">聊天面板</h3>
                      <p className="text-sm text-muted-foreground">
                        点击"返回聊天"按钮切换到完整聊天界面
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="flex-1 overflow-hidden p-4">
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">设置</h3>
                      <p className="text-sm text-muted-foreground">
                        编辑器设置功能即将推出
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </AppShell>
  );
}
