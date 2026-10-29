const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'state/StoryContext.tsx');
const targetPath = path.join(__dirname, 'state/SachHiepContext.tsx');

let content = fs.readFileSync(sourcePath, 'utf8');

// Replace imports
content = content.replace(/import \{ storageService \} from '\.\.\/infra\/storage';/g, "import { sachHiepStorageService as storageService } from '../infra/sachHiepStorage';");
content = content.replace(/import \{ ProviderFactory \} from '\.\.\/infra\/providers\/ProviderFactory';/g, "import { SachHiepProviderFactory as ProviderFactory } from '../infra/providers/SachHiepProviderFactory';");

// Replace Context names
content = content.replace(/StoryContextType/g, 'SachHiepContextType');
content = content.replace(/StoryContext/g, 'SachHiepContext');
content = content.replace(/StoryProvider/g, 'SachHiepProvider');
content = content.replace(/useStory/g, 'useSachHiep');

fs.writeFileSync(targetPath, content);
console.log('Successfully cloned and modified StoryContext.tsx to SachHiepContext.tsx');
