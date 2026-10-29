import React, { useState, useEffect } from 'react';
import { useStory } from '../../state/StoryContext';
import { GameTopBar } from './components/GameBars';
import { GameBottomBar } from './components/GameBars';
import { WorldMapView } from './components/WorldMapView';
import { PlayerProfileSheet } from './components/PlayerProfileSheet';
import { CharacterListSheet } from './components/CharacterListSheet';
import { GalgamePlayerOverlay } from './GalgamePlayerOverlay';
import { GameSettlementUI } from './dialogs/GameSettlementUI';
import { GameSettingsUI } from './dialogs/GameSettingsUI';
import { GameDebugUI } from './dialogs/GameDebugUI';
import { EndDayConfirmDialog } from './dialogs/EndDayConfirmDialog';
import { GameManager } from '../../infra/gameManager';

interface GameReaderProps {
  onBack: () => void;
}

export const GameReader: React.FC<GameReaderProps> = ({ onBack }) => {
  const { story, updateStorySettings } = useStory();
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayingEvent, setCurrentPlayingEvent] = useState<any>(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);
  const [isNextWeekSettlement, setIsNextWeekSettlement] = useState(false);
  const [customEventPrompt, setCustomEventPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (story && story.gameData) {
      const manager = new GameManager(story, updateStorySettings);
      manager.loadGameData().then(() => {
        setGameManager(manager);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [story]);

  const handleTriggerTurnSettlement = (isNextWeek: boolean) => {
    if (!gameManager) return;
    setIsNextWeekSettlement(isNextWeek);
    setShowEndDayConfirm(true);
  };

  const handleConfirmEndDay = (prompt?: string) => {
    setCustomEventPrompt(prompt);
    setShowEndDayConfirm(false);
    setShowSettlement(true);
  };

  const handleSceneTap = (scene: any) => {
    // In a real implementation, this would open a sheet with events for the scene
    // For now, let's just find the first pending event for this scene and play it
    if (!gameManager) return;
    const events = gameManager.getEventsForScene(scene);
    if (events.length > 0) {
      handlePlayEvent(events[0]);
    } else {
      alert('Không có sự kiện nào ở khu vực này.');
    }
  };

  const handlePlayEvent = async (event: any) => {
    if (!gameManager) return;
    await gameManager.startEvent(event);
    setCurrentPlayingEvent(event);
  };

  const handleEventFinished = async () => {
    setCurrentPlayingEvent(null);
    // Force re-render to update map and bars
    setGameManager(gameManager ? Object.assign(Object.create(Object.getPrototypeOf(gameManager)), gameManager) : null);
  };

  const handleEventExit = async () => {
    setCurrentPlayingEvent(null);
    setGameManager(gameManager ? Object.assign(Object.create(Object.getPrototypeOf(gameManager)), gameManager) : null);
  };

  if (isLoading || !gameManager) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="loader-spinner"></div></div>;
  }

  return (
    <div className="h-[100dvh] w-full bg-gray-950 text-gray-50 font-sans flex flex-col relative overflow-hidden">
      {/* 1. Top Bar */}
      <GameTopBar 
        gameManager={gameManager} 
        onBackTap={onBack} 
        onSettingsTap={() => setShowSettings(true)}
        onDebugTap={() => setShowDebug(true)} 
      />

      {/* 2. World Map (Main Body) */}
      <div className="flex-1 overflow-hidden relative">
        <WorldMapView 
          gameManager={gameManager} 
          onSceneTap={handleSceneTap} 
        />
      </div>

      {/* 3. Bottom Control Bar */}
      <GameBottomBar 
        gameManager={gameManager} 
        onPlayerTap={() => setShowPlayerProfile(true)} 
        onCharactersTap={() => setShowCharacterList(true)} 
        onSettlementTap={() => handleTriggerTurnSettlement(false)} 
      />

      {/* Modals & Overlays */}
      {showPlayerProfile && (
        <PlayerProfileSheet 
          gameManager={gameManager} 
          onClose={() => setShowPlayerProfile(false)} 
        />
      )}

      {showCharacterList && (
        <CharacterListSheet 
          gameManager={gameManager} 
          onClose={() => setShowCharacterList(false)} 
        />
      )}

      {showSettings && (
        <GameSettingsUI 
          gameManager={gameManager} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {showDebug && (
        <GameDebugUI 
          gameManager={gameManager} 
          onClose={() => setShowDebug(false)} 
        />
      )}

      {showEndDayConfirm && (
        <EndDayConfirmDialog
          hasPendingEvents={gameManager.todayEvents.some((e: any) => e.status === 'pending')}
          onConfirm={handleConfirmEndDay}
          onCancel={() => setShowEndDayConfirm(false)}
        />
      )}

      {showSettlement && (
        <GameSettlementUI 
          gameManager={gameManager} 
          isNextWeek={isNextWeekSettlement} 
          customEventPrompt={customEventPrompt}
          onClose={() => {
            setShowSettlement(false);
            // Force re-render
            setGameManager(Object.assign(Object.create(Object.getPrototypeOf(gameManager)), gameManager));
          }} 
        />
      )}

      {/* 5. Player Overlay (Visual Novel Interface) */}
      {currentPlayingEvent && (
        <div className="absolute inset-0 z-50 bg-black">
          <GalgamePlayerOverlay 
            event={currentPlayingEvent} 
            playerName={gameManager.player.name || 'Player'} 
            gameManager={gameManager} 
            onFinished={handleEventFinished} 
            onExit={handleEventExit} 
          />
        </div>
      )}
    </div>
  );
};
