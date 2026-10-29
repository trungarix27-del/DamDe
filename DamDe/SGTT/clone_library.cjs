const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'components/StoryLibrary.tsx');
const targetPath = path.join(__dirname, 'components/SachHiepLibrary.tsx');

let content = fs.readFileSync(sourcePath, 'utf8');

// Replace imports and context usage
content = content.replace(/import \{ useStory \} from '\.\.\/state\/StoryContext';/g, "import { useSachHiep } from '../state/SachHiepContext';");
content = content.replace(/const \{ storiesList, openStory, deleteStory, exportStory, importStory, isStoriesLoaded \} = useStory\(\);/g, "const { storiesList, openStory, deleteStory, exportStory, importStory, isStoriesLoaded } = useSachHiep();");

// Replace component name
content = content.replace(/export const StoryLibrary/g, 'export const SachHiepLibrary');

// Replace some specific texts to differentiate
content = content.replace(/Thư Viện Truyện/g, 'Thư Viện Truyện Sắc Hiệp');
content = content.replace(/Chưa có truyện nào/g, 'Chưa có truyện Sắc Hiệp nào');
content = content.replace(/Tạo truyện mới/g, 'Tạo truyện Sắc Hiệp mới');

fs.writeFileSync(targetPath, content);
console.log('Successfully cloned and modified StoryLibrary.tsx to SachHiepLibrary.tsx');
