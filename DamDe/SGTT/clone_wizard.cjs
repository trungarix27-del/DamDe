const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'components/CreateWizard.tsx');
const targetPath = path.join(__dirname, 'components/CreateSachHiepWizard.tsx');

let content = fs.readFileSync(sourcePath, 'utf8');

// Replace imports and context usage
content = content.replace(/import \{ useStory \} from '\.\.\/state\/StoryContext';/g, "import { useSachHiep } from '../state/SachHiepContext';");
content = content.replace(/const \{ createStory, isGenerating, generationStatus, generationProgress, generationSteps, generationLogs \} = useStory\(\);/g, "const { createStory, isGenerating, generationStatus, generationProgress, generationSteps, generationLogs } = useSachHiep();");

// Replace component name
content = content.replace(/export const CreateWizard/g, 'export const CreateSachHiepWizard');

// Replace some specific texts to differentiate
content = content.replace(/Tạo Truyện Mới/g, 'Tạo Truyện Sắc Hiệp Mới');
content = content.replace(/Tạo Truyện Fanfic/g, 'Tạo Truyện Sắc Hiệp Fanfic');

fs.writeFileSync(targetPath, content);
console.log('Successfully cloned and modified CreateWizard.tsx to CreateSachHiepWizard.tsx');
