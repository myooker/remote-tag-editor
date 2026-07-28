import { useApp } from "@/context/AppContext";
import { SearchProvider } from "@/context/SearchContext";
import { ExplorerProvider } from "@/context/ExplorerContext";
import { HistoryProvider } from "@/context/HistoryContext";
import { Header } from "@/components/layout/Header";
import { FileExplorer } from "@/components/explorer/FileExplorer";
import { TagPanel } from "@/components/tags/TagPanel";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { GlobalKeyboard } from "@/components/layout/GlobalKeyboard";
import { UploadZone } from "@/components/explorer/UploadZone";

export default function App() {
  const { ready } = useApp();

  return (
    <SearchProvider>
      <ExplorerProvider>
        <HistoryProvider>
          <GlobalKeyboard />
          <div className="flex h-full flex-col">
            <Header />
            <main className="flex min-h-0 flex-1">
              <UploadZone>
                <FileExplorer connecting={!ready} />
              </UploadZone>
              <HistoryPanel />
              <TagPanel />
            </main>
          </div>
        </HistoryProvider>
      </ExplorerProvider>
    </SearchProvider>
  );
}
