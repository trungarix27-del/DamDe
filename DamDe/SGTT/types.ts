


export interface VectorData {
  id: string;
  storyId: string;
  text: string;
  embedding: number[];
  magnitude?: number; 
  createdAt: number; 
  metadata: {
    // canon_core: Tính cách/Tâm lý cốt lõi (Priority cao nhất, không được vi phạm)
    // canon_rule: Luật thế giới/Hệ thống sức mạnh
    // canon_rel: Mối quan hệ giữa các nhân vật
    // source_material: Dữ liệu thô (Dùng làm backup, priority thấp)
    type: 'chapter' | 'character' | 'lore' | 'summary' | 'beat' | 'source_material' | 'canon_core' | 'canon_rule' | 'canon_rel';
    referenceId: string; // Links to Chapter ID or Character ID
    sceneId?: string;    
    characterIds?: string[]; 
    chapterIndex?: number;   
    importance?: number;     // 1-5 (5 = Canon không thể phá vỡ)
    pov?: string;            // The POV character name or style when this was written
    rule_category?: string;  // Dùng cho canon_rule (magic, tech, history)
    provider?: string;       // AI provider that generated this embedding (e.g. 'gemini', 'local_llm') to isolate vector spaces
  };
}

export interface CharacterAppearance {
  general: string;
  face: string;
  body: string;
  hair: string;
  clothing: string;
  body_impression?: string; // For NSFW/Intimate scenes
}

export interface BigFive {
    O: number;
    C: number;
    E: number;
    A: number;
    N: number;
}

export interface EmotionState {
    anger: number;
    joy: number;
    sadness: number;
    fear: number;
    trust: number;
    surprise: number;
}

export interface PromptExample {
  sdPrompt: string;
  vietnamesePrompt: string;
}

export interface Character {
  id: string;
  name: string;
  role: string; 
  description: string; // Background/History
  
  // Appearance
  appearance: CharacterAppearance;
  
  // Personality (Simplified)
  core_personality: string; // Immutable core
  personality: string;      // Current expression
  
  // New fields
  mbti?: string;
  big_five?: BigFive;
  emotionState?: EmotionState;
  
  // RPG / Cultivation Status
  cultivation?: string;     // Công pháp / Cảnh giới (VD: Trúc Cơ Kỳ, Cửu Dương Thần Công)
  skills?: string[];        // Danh sách kỹ năng / Chiêu thức (VD: [Hỏa Cầu Thuật, Lăng Ba Vi Bộ])
  inventory?: string[];     // Vật phẩm mang theo (VD: [Túi Trữ Vật, Kiếm Gỗ])
  
  status?: string;          // Current short-term status (injured, happy, etc.)
  voiceSample?: string;
  
  traits: string[];         // Simple tags
  avatarUrl?: string;

  character_type?: 'male_lead' | 'female_young_lead' | 'female_mature_lead' | 'npc';
  loraTag?: string;
  triggerWords?: string;
  basePrompt?: string;
  promptExamples?: (string | PromptExample)[];
}

export interface Illustration {
  id: string;
  prompt: string;
  imageUrl: string;
  position: number; // line number
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary: string;
  order: number;
  lastUpdated: number;
  illustrations?: Illustration[];
  instructionMain?: string;
  instructionEnding?: string;
}

export interface EntityRegistry {
    characters: string[];
    locations: string[];
    factions: string[];
}

export interface StoryBibleChar {
  name: string;
  role: string;
  core: string;
  character_type?: 'male_lead' | 'female_young_lead' | 'female_mature_lead' | 'npc';
  loraTag?: string;
  triggerWords?: string;
  basePrompt?: string;
  promptExamples?: (string | PromptExample)[];
}

export interface StoryBibleChapterCore {
  ch: number;
  core: string;
}

export interface StoryBible {
  chars: StoryBibleChar[];
  world: string;
  rules: string;
  arc: string;
  chapter_cores: StoryBibleChapterCore[];
}

export interface StoryContinuePlanRoute {
  CharacterComment: string;
  ContinuePlan: string;
}

export interface StoryContinuePlan {
  LoveOrGoodRoute: StoryContinuePlanRoute;
  NtrOrBadRoute: StoryContinuePlanRoute;
  SupriseOrNeutralRoute: StoryContinuePlanRoute;
}

export interface StoryComment {
  id: string;
  persona: 'LoveOrGoodRoute' | 'NtrOrBadRoute' | 'SupriseOrNeutralRoute';
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Story {
  id: string;
  title: string;
  synopsis: string;
  setting: string;
  genre: string;
  writingStyle?: string;  
  pov: string;            
  pronounStyle: string;   
  negativePrompt: string; 
  nsfw?: boolean;         
  worldLore: string[]; // Replaced PinnedMemory with simple World/Lore list
  chapters: Chapter[];
  characters: Character[];
  createdAt: number;
  // Fanfic specific fields
  storyType?: 'original' | 'fanfic' | 'gameBook';
  sourceUrl?: string;
  entityRegistry?: EntityRegistry; // WHITELIST for "Existence Lock"
  storyBible?: StoryBible; // The new single source of truth for Sach Hiep
  storyContinuePlan?: StoryContinuePlan;
  comments?: StoryComment[];
  gameData?: any; // Stores game-specific data (worldConfig, player, aiCharacters, scenes, eventLogbook, todayEvents)
}

export interface BackupData {
    version: number;
    story: Story;
    vectors: VectorData[];
    exportedAt: number;
}

export interface AppState {
  currentStory: Story | null;
  isLoading: boolean;
  isGenerating: boolean;
  activeChapterId: string | null;
  showSidebar: boolean;
}

export type GenerationMode = 'continue' | 'outline' | 'rewrite';

export interface ComicDialogue {
  char: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  type?: 'speech' | 'thought' | 'narration';
}

export interface ComicPanel {
  id: string;
  description: string;
  sceneDescription: string;
  characters: string[];
  scene: string;
  emotion: string;
  dialogues: ComicDialogue[];
  imagePath?: string;
  confirmed: boolean;
  generatedAt: number;
  narrative?: string;
  monologue?: string;
  sdPrompt?: string;
  loraTags?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  panelNumber?: number;
  chapterId?: string;
  imagePrompt?: string;
  imageUrl?: string;
  progress?: number;
}

export interface ComicChapter {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalPanels: number;
  confirmedPanels: number;
  panels: ComicPanel[];
  script?: any;
  order: number;
  lastUpdated: number;
  backgrounds?: { [key: string]: string };
  setting?: string;
}

export interface ComicCharacter {
    id: string;
    name: string;
    description: string;
    appearance: string;
    avatarUrl?: string;
    referenceImageUrl?: string;
    character_type?: 'male_lead' | 'female_young_lead' | 'female_mature_lead' | 'npc';
    loraTag?: string;
    triggerWords?: string;
    basePrompt?: string;
    promptExamples?: (string | PromptExample)[];
    clothes?: { [key: string]: string };
}

export interface ComicProject {
  id: string;
  title: string;
  description: string;
  novelText: string;
  chapters: ComicChapter[];
  characters: ComicCharacter[];
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  settings: {
    panelsPerChapter: number;
    style: string;
  };
}