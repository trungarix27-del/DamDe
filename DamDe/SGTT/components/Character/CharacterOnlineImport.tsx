import React, { useState } from 'react';
import { X, Search, Globe, Download, ExternalLink } from 'lucide-react';
import { Character } from './types';
import { readTavernPngFromBlob, load_tavern_wi } from '../../utils/tavernCardUtils';
import { v4 as uuidv4 } from 'uuid';

interface CharacterOnlineImportProps {
  onClose: () => void;
  onImport: (character: Character) => void;
}

const SOURCES = [
  /*
  {
    name: 'AiCharacterCards',
    url: 'https://aicharactercards.com/',
    description: 'Bộ sưu tập thẻ nhân vật khổng lồ.',
    searchUrl: 'https://aicharactercards.com/?s='
  },
  */
  {
    name: 'CharacterTavern',
    url: 'https://character-tavern.com/',
    description: 'Một nguồn phổ biến khác cho thẻ Tavern.',
    searchUrl: 'https://character-tavern.com/?s='
  },
  /*
  {
    name: 'Charhub.io',
    url: 'https://charhub.io/',
    description: 'Trung tâm cho các nhân vật và bot AI.',
    searchUrl: 'https://charhub.io/characters?search='
  }
  */
];

export const CharacterOnlineImport: React.FC<CharacterOnlineImportProps> = ({ onClose, onImport }) => {
  const [importUrl, setImportUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let finalUrl = importUrl.trim();
      let isJsonApi = false;

      // Extraction logic from klite.txt
      if (finalUrl.match(/aicharactercards\.com\//i) && finalUrl.match(/sdm_process_download/i)) {
        // keep as is
      } else if (finalUrl.match(/character-tavern\.com\//i)) {
        finalUrl = finalUrl.replaceAll("%20", "%2520");
        if (finalUrl.match(/com\/character\//i)) {
          finalUrl = finalUrl.split(".png")[0];
          finalUrl = finalUrl.split("?")[0];
          finalUrl = finalUrl.split(".com/character/")[1];
          finalUrl = finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
          finalUrl = `https://cards.character-tavern.com/${finalUrl}.png?action=download`;
        }
      } else if (finalUrl.match(/charhub\.io\//i) || finalUrl.match(/chub\.ai\//i)) {
        let tmp = finalUrl.split("?")[0].split("#")[0];
        if (tmp.endsWith("/")) tmp = tmp.slice(0, -1);
        let parts = tmp.split("/");
        if (parts.length >= 2) {
          finalUrl = parts[parts.length - 2] + "/" + parts[parts.length - 1];
        }
        finalUrl = "https://api.chub.ai/api/characters/" + finalUrl;
        isJsonApi = true;
      } else if (finalUrl.match(/aicharactercards\.com\//i) || finalUrl.match(/AICC\//i)) {
        finalUrl = finalUrl.split("#")[0].split("?")[0];
        finalUrl = finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
        let tmp = finalUrl.split("/");
        if (tmp.length >= 2) {
          finalUrl = tmp[tmp.length - 2] + "/" + tmp[tmp.length - 1];
        }
        finalUrl = "https://aicharactercards.com/wp-json/pngapi/v1/image/" + finalUrl;
        isJsonApi = true;
      }

      // Apply CORS proxy
      const proxyUrl = `https://proxy.concedo.workers.dev/?${finalUrl}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Không thể lấy dữ liệu nhân vật');
      
      let charData: any = null;
      let avatarUrl: string | undefined = undefined;

      if (isJsonApi) {
        const json = await response.json();
        if (json.url) {
            // some APIs return a URL to the image
            const imgResponse = await fetch(`https://proxy.concedo.workers.dev/?${json.url}`);
            if (!imgResponse.ok) throw new Error('Không thể lấy hình ảnh từ API');
            const blob = await imgResponse.blob();
            const file = new File([blob], "imported_card.png", { type: blob.type });
            const result = await readTavernPngFromBlob(file);
            if (result && result.data) {
                charData = result.data;
                avatarUrl = URL.createObjectURL(blob);
            }
        } else {
            // some APIs return the character data directly or base64 image
            // Assuming it returns the character data directly for now
            charData = json;
        }
      } else {
        const blob = await response.blob();
        const file = new File([blob], "imported_card.png", { type: blob.type });
        const result = await readTavernPngFromBlob(file);
        if (result && result.data) {
            charData = result.data;
            avatarUrl = URL.createObjectURL(blob);
        }
      }
      
      if (charData) {
        const data = charData.data || charData;
        const newCharacter: Character = {
          id: uuidv4(),
          name: data.name || 'Không rõ',
          description: data.description || '',
          personality: data.personality || '',
          scenario: data.scenario || '',
          firstMes: data.first_mes || '',
          mesExample: data.mes_example || '',
          creatorNotes: data.creator_notes || '',
          systemPrompt: data.system_prompt || '',
          postHistoryInstructions: data.post_history_instructions || '',
          tags: data.tags || [],
          creator: data.creator || 'Không rõ',
          characterVersion: data.character_version || '1.0',
          alternateGreetings: data.alternate_greetings || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          worldInfo: load_tavern_wi(data.character_book),
          avatarUrl: avatarUrl,
          source: 'imported'
        };
        
        onImport(newCharacter);
        onClose();
      } else {
        throw new Error('Không thể phân tích dữ liệu thẻ nhân vật từ hình ảnh hoặc API.');
      }

    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Nhập thất bại: ${err.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 bg-gray-950 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 text-indigo-400">
            <Globe size={20} className="md:w-6 md:h-6" />
            <h3 className="text-base md:text-xl font-bold text-gray-100 uppercase tracking-wider">Nhập Trực tuyến</h3>
          </div>
          <button onClick={onClose} className="p-1.5 md:p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-gray-900 space-y-6 md:space-y-8">
          
          {/* URL Import Section */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">Nhập từ URL</h4>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Dán URL hình ảnh (PNG/WEBP)..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-gray-100 focus:border-indigo-500 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              />
              <button
                onClick={handleUrlImport}
                disabled={isLoading || !importUrl.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-gray-50 px-4 md:px-6 py-2.5 md:py-0 rounded-lg md:rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isLoading ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={16} className="md:w-[18px] md:h-[18px]" />
                    Nhập
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Dán liên kết trực tiếp đến hình ảnh thẻ nhân vật (PNG hoặc WEBP). Hình ảnh phải chứa dữ liệu nhân vật được nhúng (định dạng Tavern Card format).
            </p>
          </div>

          <div className="border-t border-gray-800 my-6" />

          {/* Sources List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Duyệt Nguồn</h4>
            <div className="grid grid-cols-1 gap-4">
              {SOURCES.map((source) => (
                <div key={source.name} className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/50 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-gray-200 group-hover:text-indigo-400 transition-colors">{source.name}</h5>
                      <p className="text-sm text-gray-500 mt-1">{source.description}</p>
                    </div>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-900 rounded-lg text-gray-400 hover:text-gray-50 hover:bg-indigo-600 transition-colors"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-900 flex gap-2">
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                    >
                      Truy cập Trang web
                    </a>
                    <span className="text-gray-700">|</span>
                    <a 
                      href={source.searchUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider"
                    >
                      Tìm kiếm
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Lưu ý: Đây là các trang web bên ngoài. Bạn có thể tải xuống thẻ nhân vật từ đó và sau đó sử dụng "Nhập từ Tệp" hoặc sao chép URL hình ảnh để sử dụng "Nhập từ URL" ở trên.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
