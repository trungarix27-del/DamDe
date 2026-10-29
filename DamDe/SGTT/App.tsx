import React, { useState } from 'react';
import { SachHiepProvider, useSachHiep } from './state/SachHiepContext';
import { SachHiepWorkspace } from './components/SachHiepWorkspace';
import { CreateSachHiepWizard } from './components/CreateSachHiepWizard';
import { SachHiepLibrary } from './components/SachHiepLibrary';
import { GlobalNav } from './components/GlobalNav';
import { SettingsPage } from './components/SettingsPage';
import { ChapterLimitModal } from './components/ChapterLimitModal';

const AppContent: React.FC = () => {
    const sachHiepContext = useSachHiep();

    if (!sachHiepContext) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
                <div className="loader-spinner mb-5"></div>
                <div className="text-primary-500 text-sm font-medium tracking-wide animate-pulse">
                    Đang tải dữ liệu Dâm Tu Thần Bút...
                </div>
            </div>
        );
    }

    const { 
        story: sachHiepStory, 
        isStoriesLoaded: isSachHiepLoaded, 
        showChapterLimitModal,
        setShowChapterLimitModal,
        chapterLimitInfo,
        addChapter,
        generateContinue
    } = sachHiepContext;
    
    // View modes: 'library' (Tủ truyện), 'create' (Tạo truyện mới), 'settings' (Cài đặt AI)
    const [viewMode, setViewMode] = useState<'library' | 'create' | 'settings'>('library');

    if (!isSachHiepLoaded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
                <div className="loader-spinner mb-5"></div>
                <div className="text-primary-500 text-sm font-medium tracking-wide animate-pulse">
                    Đang khởi tạo studio sáng tạo tiểu thuyết...
                </div>
            </div>
        );
    }

    const renderView = () => {
        if (viewMode === 'create') {
            return <CreateSachHiepWizard onCancel={() => setViewMode('library')} />;
        }

        if (viewMode === 'settings') {
            return <SettingsPage />;
        }

        return <SachHiepLibrary onCreateNew={() => setViewMode('create')} />;
    };

    const renderMainContent = () => {
        // If a story is currently opened, show the full writing workspace
        if (sachHiepStory) {
            return <SachHiepWorkspace />;
        }

        return (
            <div className="flex h-full bg-gray-950 overflow-hidden">
                <GlobalNav currentView={viewMode} onNavigate={(view) => setViewMode(view)} />
                <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    {renderView()}
                </div>
            </div>
        );
    };

    return (
        <div className="relative h-[100dvh] w-full bg-gray-950 overflow-hidden">
            {renderMainContent()}
            {showChapterLimitModal && chapterLimitInfo && (
                <ChapterLimitModal 
                    current={chapterLimitInfo.current}
                    limit={chapterLimitInfo.limit}
                    model={chapterLimitInfo.model}
                    onClose={() => setShowChapterLimitModal(false)}
                    onAddChapter={() => {
                        addChapter();
                        setShowChapterLimitModal(false);
                    }}
                    onContinue={() => {
                        setShowChapterLimitModal(false);
                        generateContinue(undefined, true);
                    }}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
  return (
      <SachHiepProvider>
          <AppContent />
      </SachHiepProvider>
  );
};

export default App;
