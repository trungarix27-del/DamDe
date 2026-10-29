import { Story } from '../types';
import { gameEventAiService } from './gameEventAiService';
import { gameSettlementService } from './gameSettlementService';

export class GameManager {
  public story: Story;
  private updateStorySettings: (settings: Partial<Story>) => Promise<void>;

  public worldConfig: any = {};
  public player: any = {};
  public aiCharacters: any[] = [];
  private _persistentScenes: any[] = [];
  public scenes: any[] = [];
  public eventLogbook: any = {};
  public todayEvents: any[] = [];
  public gameBible: any = {}; // NEW: Missing piece for continuity
  public debugLogs: any[] = []; // Phase 3: Store debugging materials

  constructor(story: Story, updateStorySettings: (settings: Partial<Story>) => Promise<void>) {
    this.story = story;
    this.updateStorySettings = updateStorySettings;
  }

  get totalDays(): number {
    return Number(this.worldConfig.total_days) || 1;
  }

  get currentWeek(): number {
    return Math.floor((this.totalDays - 1) / 7) + 1;
  }

  get currentDayOfWeek(): number {
    return ((this.totalDays - 1) % 7) + 1;
  }

  get historyEvents(): any[] {
    const list = [...(this.eventLogbook.history_events || [])];
    return list.reverse();
  }

  async loadGameData(): Promise<void> {
    try {
      const data = this.story.gameData || {};
      this.worldConfig = data.worldConfig || {};
      this.player = data.player || {};
      this.aiCharacters = data.aiCharacters || [];
      this._persistentScenes = data.scenes || [];
      this.eventLogbook = data.eventLogbook || { history_events: [], logs: [] };
      this.todayEvents = data.todayEvents || [];
      this.gameBible = data.gameBible || { world_rules: "Chưa thiết lập", current_arc: "Chưa thiết lập", day_cores: [], character_states: {} };
      this.debugLogs = data.debugLogs || [];

      this._migrateEventIds();
      this._refreshScenesList();
    } catch (e) {
      console.error('GameManager: Failed to load data', e);
      throw e;
    }
  }

  private _migrateEventIds() {
    let changed = false;
    for (let i = 0; i < this.todayEvents.length; i++) {
      if (!this.todayEvents[i].id) {
        this.todayEvents[i].id = `evt_${Date.now()}_${i}`;
        changed = true;
      }
    }
    if (changed) {
      this._saveTodayEvents();
    }
  }

  private _refreshScenesList() {
    const combinedScenes = [...this._persistentScenes];
    const existingIds = new Set(combinedScenes.map(s => s.id));
    const existingNames = new Set(combinedScenes.map(s => s.name));

    // Fix: We need to make sure we show persistent scenes even if they have no active events
    // Persistent scenes are loaded from worldConfig.scenes initially

    const activeEvents = this.todayEvents.filter(e => e.status !== 'completed');
    
    for (const event of activeEvents) {
      const sceneId = event.scene_id;
      if (!sceneId) continue;
      
      if (!existingIds.has(sceneId) && !existingNames.has(sceneId)) {
        const alreadyAdded = combinedScenes.some(s => s.id === sceneId || s.name === sceneId);
        if (alreadyAdded) continue;

        combinedScenes.push({
          id: sceneId,
          name: sceneId,
          description: '（Khu vực tạm thời）Phát sinh từ sự kiện bất ngờ.',
          status: 'Không rõ',
          is_temporary: true,
        });
      }
    }
    this.scenes = combinedScenes;
  }

  async updateWorldSetting(key: string, value: string): Promise<void> {
    this.worldConfig[key] = value;
    await this.saveGameData();
  }

  async updatePlayerProfile(newPlayerData: any): Promise<void> {
    const updatedAttributes = newPlayerData.attributes;
    const oldAttributes = this.player.attributes;
    
    // Deep merge if attributes is an object
    let mergedAttributes = updatedAttributes;
    if (typeof updatedAttributes === 'object' && !Array.isArray(updatedAttributes) && updatedAttributes !== null && typeof oldAttributes === 'object') {
       mergedAttributes = { ...oldAttributes, ...updatedAttributes };
    }

    // Merge skills and inventory instead of overwriting if they are arrays
    let mergedSkills = newPlayerData.skills;
    if (Array.isArray(newPlayerData.skills) && Array.isArray(this.player.skills)) {
      mergedSkills = Array.from(new Set([...this.player.skills, ...newPlayerData.skills]));
    }

    let mergedInventory = newPlayerData.inventory;
    if (Array.isArray(newPlayerData.inventory) && Array.isArray(this.player.inventory)) {
      mergedInventory = Array.from(new Set([...this.player.inventory, ...newPlayerData.inventory]));
    }

    this.player = { 
       ...this.player, 
       ...newPlayerData,
       attributes: mergedAttributes !== undefined ? mergedAttributes : oldAttributes,
       skills: mergedSkills !== undefined ? mergedSkills : this.player.skills,
       inventory: mergedInventory !== undefined ? mergedInventory : this.player.inventory
    };
    await this.saveGameData();
  }

  async saveGameData(): Promise<void> {
    const gameData = {
      worldConfig: this.worldConfig,
      player: this.player,
      aiCharacters: this.aiCharacters,
      scenes: this._persistentScenes,
      eventLogbook: this.eventLogbook,
      todayEvents: this.todayEvents,
      gameBible: this.gameBible,
      debugLogs: this.debugLogs.slice(-20),
    };
    await this.updateStorySettings({ gameData });
  }

  async _saveTodayEvents(): Promise<void> {
    await this.saveGameData();
  }

  getEventsForScene(scene: any): any[] {
    const sceneName = scene.name;
    const sceneId = scene.id;

    const activeEvents = this.todayEvents.filter(e => {
      const status = e.status || 'pending';
      return status === 'pending' || status === 'playing';
    });

    if (activeEvents.length === 0) return [];

    const firstActiveEvent = activeEvents[0];
    const target = firstActiveEvent.scene_id;
    const isMatch = target === sceneName || target === sceneId;

    if (isMatch) {
       return [firstActiveEvent];
    }
    return [];
  }

  async saveCurrentEventProgress(eventData: any, currentIndex: number): Promise<void> {
    const index = this.todayEvents.findIndex(e => e.id === eventData.id);
    if (index !== -1) {
      this.todayEvents[index].dialogues = eventData.dialogues; 
      this.todayEvents[index].breakpoint_index = currentIndex;  
      this.todayEvents[index].status = 'playing';               
      this.todayEvents[index].last_updated = new Date().toISOString();
      await this._saveTodayEvents();
    }
  }

  async startEvent(event: any): Promise<void> {
    if (!event.id) {
      event.id = `${event.scene_id}_${Date.now()}`;
    }
    const index = this.todayEvents.findIndex(e => e.id === event.id);
    if (index !== -1) {
      this.todayEvents[index].status = 'playing';
      await this._saveTodayEvents();
    }
  }

  async reactivateEvent(eventId: string): Promise<void> {
    const index = this.todayEvents.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this.todayEvents[index].status = 'pending';
      this.todayEvents[index].breakpoint_index = 0;
      delete this.todayEvents[index].completed_at;
      await this._saveTodayEvents();
      this._refreshScenesList();
    }
  }

  async completeEvent(finalEventData: any, breakpointIndex?: number): Promise<void> {
    const eventId = finalEventData.id;
    const finalDialogues = [...(finalEventData.dialogues || [])];

    const completedEvent = { ...finalEventData };
    completedEvent.dialogues = finalDialogues;
    completedEvent.completed_at = new Date().toISOString();
    completedEvent.status = 'completed'; 

    const index = this.todayEvents.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this.todayEvents[index] = completedEvent;
    } else {
      this.todayEvents.push(completedEvent);
    }

    this._refreshScenesList();
    await this.saveGameData(); 
  }

  async generateEventContinuation(currentDialogues: any[], userInput: string, sceneId: string): Promise<any> {
    const recentHistory = currentDialogues.length > 15 
        ? currentDialogues.slice(currentDialogues.length - 15) 
        : currentDialogues;

    const sceneObj = this.scenes.find(
      s => s.name === sceneId || s.id === sceneId
    ) || { name: sceneId };

    const gameBibleContext = this.gameBible ? {
       current_arc: this.gameBible.current_arc,
       world_rules: this.gameBible.world_rules,
       character_states: this.gameBible.character_states || {}
    } : undefined;

    return await gameEventAiService.generateEventContinuation({
      recentDialogues: recentHistory,
      userInput,
      sceneId,
      playerInfo: this.player,
      currentScene: sceneObj,
      worldConfig: this.worldConfig,
      aiCharacters: this.aiCharacters,
      gameBible: gameBibleContext // Pass truncated gameBible for coherence
    });
  }

  getEventStats(): { total: number } {
    const pending = this.todayEvents.filter(e => e.status === 'pending' || e.status === 'playing').length;
    return { total: pending };
  }

  getCompletedEvents(): any[] {
    return this.todayEvents.filter(e => e.status === 'completed');
  }

  getSettlementGameTimeStr(): string {
     const week = Math.floor((this.totalDays - 1) / 7) + 1;
     const day = ((this.totalDays - 1) % 7) + 1;
     return `Tuần ${week} Ngày ${day}`;
  }

  async applySettlementResult(ctx: any, isNextWeek: boolean): Promise<void> {
    this.player = ctx.updatedPlayer;
    this.aiCharacters = ctx.updatedAiCharacters;
    this._persistentScenes = ctx.updatedScenes;
    if (ctx.updatedBible) {
      this.gameBible = ctx.updatedBible;
    }
    
    if (ctx.debugLogs && Array.isArray(ctx.debugLogs)) {
      this.debugLogs.push(...ctx.debugLogs);
      // Keep only last 10 logs
      if (this.debugLogs.length > 10) {
        this.debugLogs = this.debugLogs.slice(-10);
      }
    }
    
    const historyEvents = [...(this.eventLogbook.history_events || [])];
    historyEvents.push(...ctx.historyEvents);
    this.eventLogbook.history_events = historyEvents;
    
    const logEntry = {
      time: new Date().toISOString(),
      game_time: ctx.gameTimeStr,
      completed_events: ctx.historyEvents.length,
      new_events: ctx.newEvents.length,
    };
    if (!this.eventLogbook.logs) this.eventLogbook.logs = [];
    this.eventLogbook.logs.push(logEntry);

    for (const newEvent of ctx.newEvents) {
      if (!newEvent.id) {
        newEvent.id = `evt_${Date.now()}_${ctx.newEvents.indexOf(newEvent)}`;
      }
      newEvent.status = 'pending';
    }
    this.todayEvents = ctx.newEvents;

    if (isNextWeek) {
      const daysToSkip = 8 - this.currentDayOfWeek;
      this.worldConfig.total_days = this.totalDays + daysToSkip;
    } else {
      this.worldConfig.total_days = this.totalDays + 1;
    }

    this._refreshScenesList();
    await this.saveGameData();
  }
}
