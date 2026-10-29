
import React, { useState } from 'react';
import { Character } from './types';
import { readTavernPngFromBlob, load_tavern_wi, TavernCardV2 } from '../../utils/tavernCardUtils';

interface ScenarioLoaderProps {
  onScenarioLoaded: (character: Character) => void;
}

export const ScenarioLoader: React.FC<ScenarioLoaderProps> = ({ onScenarioLoaded }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      let character: Character | null = null;
      if (url.includes('prompts.forthisfeel.club')) {
        character = await fetchFromPromptsForThisFeel(url);
      } else if (url.includes('chub.ai') || url.includes('characterhub.org')) {
        character = await fetchFromChubAi(url);
      } else if (url.includes('pygmalion.chat')) {
        character = await fetchFromPygmalion(url);
      } else if (url.includes('aicharactercards.com') || url.includes('character-tavern.com')) {
        character = await fetchFromCharacterCards(url);
      } else {
        throw new Error('URL không được hỗ trợ');
      }

      if (character) {
        onScenarioLoaded(character);
      } else {
        throw new Error('Không thể tải nhân vật');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromPromptsForThisFeel = async (url: string): Promise<Character | null> => {
    // Extract ID (last 4 digits)
    const match = url.match(/(\d{4})$/);
    if (!match) throw new Error('URL Prompts không hợp lệ');
    const id = match[1];
    // Using a CORS proxy might be necessary here if direct access is blocked
    const apiUrl = `https://prompts.forthisfeel.club/api/prompt/${id}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Không thể lấy dữ liệu từ Prompts');
    const data = await response.json();
    
    return mapTavernToCharacter(data);
  };

  const fetchFromChubAi = async (url: string): Promise<Character | null> => {
    // Extract username/character
    const match = url.match(/chub\.ai\/characters\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('URL Chub.ai không hợp lệ');
    const fullPath = `${match[1]}/${match[2]}`;
    
    // Try to fetch the character card image directly first
    const imageUrl = `https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png`;
    
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const tavernData = await readTavernPngFromBlob(blob);
        if (tavernData) {
          const character = mapTavernToCharacter(tavernData);
          character.avatarUrl = imageUrl;
          return character;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch avatar directly, trying API fallback', e);
    }

    // Fallback: Fetch JSON definition (this endpoint is hypothetical based on common patterns)
    // The original code used a complex logic involving a proxy and scraping/API
    // For now, we'll rely on the image fetch or throw an error if it fails
    throw new Error('Không thể lấy hình ảnh thẻ nhân vật từ Chub.ai. Đảm bảo CORS được cho phép hoặc thử một URL khác.');
  };

  const fetchFromPygmalion = async (url: string): Promise<Character | null> => {
    // Extract UUID
    const match = url.match(/pygmalion\.chat\/character\/([a-zA-Z0-9-]+)/);
    if (!match) throw new Error('URL Pygmalion không hợp lệ');
    const uuid = match[1];
    const apiUrl = `https://pygmalion.chat/api/characters/${uuid}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Không thể lấy dữ liệu từ Pygmalion');
    const data = await response.json();
    
    if (data && data.character) {
        // Pygmalion API returns a structure that might need mapping
        // Assuming data.character follows a compatible structure or we map it
        const charData = data.character;
        // Map Pygmalion specific fields to Tavern format if needed
        const tavernData: any = {
            name: charData.name,
            description: charData.description,
            personality: charData.personality,
            scenario: charData.scenario,
            first_mes: charData.first_mes,
            mes_example: charData.mes_example,
            creator_notes: charData.creator_notes,
            system_prompt: charData.system_prompt,
            post_history_instructions: charData.post_history_instructions,
            tags: charData.tags,
            creator: charData.creator,
            character_version: charData.character_version,
            alternate_greetings: charData.alternate_greetings,
            extensions: charData.extensions
            // Pygmalion might handle world info differently
        };
        return mapTavernToCharacter(tavernData);
    }
    return null;
  };

  const fetchFromCharacterCards = async (url: string): Promise<Character | null> => {
      // This source typically provides a direct link to a PNG or a page with a PNG
      // If it's a direct PNG link:
      if (url.match(/\.png$/i)) {
          const response = await fetch(url);
          if (response.ok) {
              const blob = await response.blob();
              const tavernData = await readTavernPngFromBlob(blob);
              if (tavernData) {
                  const character = mapTavernToCharacter(tavernData);
                  character.avatarUrl = url;
                  return character;
              }
          }
      }
      
      // If it's a page URL, we'd need to scrape it, which is hard from the client side without a proxy
      throw new Error('Hỗ trợ các liên kết PNG trực tiếp. Đối với URL trang, cần có proxy backend.');
  };

  const mapTavernToCharacter = (data: any): Character => {
      // Handle V2/V3 spec wrapper
      let charData = data;
      if (data.spec === 'chara_card_v2' || data.spec === 'chara_card_v3') {
          charData = data.data;
      }

      const now = Date.now();
      const character: Character = {
          id: crypto.randomUUID(),
          name: charData.name || 'Không rõ',
          description: charData.description || '',
          personality: charData.personality || '',
          scenario: charData.scenario || '',
          firstMes: charData.first_mes || '',
          mesExample: charData.mes_example || '',
          creatorNotes: charData.creator_notes || '',
          systemPrompt: charData.system_prompt || '',
          postHistoryInstructions: charData.post_history_instructions || '',
          tags: charData.tags || [],
          creator: charData.creator || '',
          characterVersion: charData.character_version || '',
          alternateGreetings: charData.alternate_greetings || [],
          createdAt: now,
          updatedAt: now,
          worldInfo: []
      };

      // Handle World Info
      if (charData.character_book) {
          character.worldInfo = load_tavern_wi(charData.character_book);
      } else if (data.character_book) {
           character.worldInfo = load_tavern_wi(data.character_book);
      }

      return character;
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2 text-white">Tải Nhân vật từ URL</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán URL (chub.ai, pygmalion.chat, v.v.)"
          className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600"
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Tải'}
        </button>
      </div>
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
};
