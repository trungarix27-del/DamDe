import { Character, PromptExample } from '../types';

export function autoAssignLoraToCharacters<T extends { 
  loraTag?: string; 
  role?: string; 
  description?: string; 
  appearance?: any; 
  core?: string; 
  triggerWords?: string; 
  promptExamples?: (string | PromptExample)[]; 
}>(characters: T[]): T[] {
  return characters;
}
