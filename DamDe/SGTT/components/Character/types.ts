
export interface WorldInfoEntry {
  key: string;
  keysecondary?: string;
  keyanti?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  widisabled?: boolean;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2' | 'chara_card_v3';
  spec_version: string;
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    tags: string[];
    creator: string;
    character_version: string;
    alternate_greetings: string[];
    extensions: Record<string, any>;
    character_book?: {
      entries: Array<{
        keys: string[];
        content: string;
        extensions: any;
        enabled: boolean;
        insertion_order: number;
        case_sensitive?: boolean;
        name?: string;
        priority?: number;
        id?: number;
        comment?: string;
        selective?: boolean;
        secondary_keys?: string[];
        constant?: boolean;
        position?: string;
      }>;
      name?: string;
      description?: string;
      scan_depth?: number;
      token_budget?: number;
      recursive_scanning?: boolean;
      extensions: any;
    };
  };
}

export interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  description: string;
  personality: string;
  scenario: string;
  firstMes: string;
  mesExample: string;
  creatorNotes: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  tags: string[];
  creator: string;
  characterVersion: string;
  alternateGreetings: string[];
  createdAt: number;
  updatedAt: number;
  worldInfo: WorldInfoEntry[];
  source?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'character' | 'system';
  content: string;
  thought?: string; // Hidden reasoning/thinking content
  timestamp: number;
}

export interface ChatSession {
  id: string;
  characterId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
