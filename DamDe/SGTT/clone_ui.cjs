const fs = require('fs');
const path = require('path');

function cloneFile(sourceName, targetName, replacements) {
    const sourcePath = path.join(__dirname, 'components', sourceName);
    const targetPath = path.join(__dirname, 'components', targetName);
    
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        return;
    }

    let content = fs.readFileSync(sourcePath, 'utf8');

    for (const [search, replace] of Object.entries(replacements)) {
        // Use global regex if search is string, otherwise use it as is
        const regex = new RegExp(search, 'g');
        content = content.replace(regex, replace);
    }

    fs.writeFileSync(targetPath, content);
    console.log(`Successfully cloned ${sourceName} to ${targetName}`);
}

const commonReplacements = {
    "import \\{ useStory \\} from '\\.\\.\\/state\\/StoryContext'": "import { useSachHiep } from '../state/SachHiepContext'",
    "useStory\\(\\)": "useSachHiep()",
    "StorySettingsModal": "SachHiepSettingsModal",
    "Sidebar": "SachHiepSidebar",
    "Editor": "SachHiepEditor",
    "MainWorkspace": "SachHiepWorkspace"
};

// Clone MainWorkspace
cloneFile('MainWorkspace.tsx', 'SachHiepWorkspace.tsx', {
    ...commonReplacements,
    "export const MainWorkspace": "export const SachHiepWorkspace"
});

// Clone Sidebar
cloneFile('Sidebar.tsx', 'SachHiepSidebar.tsx', {
    ...commonReplacements,
    "export const Sidebar": "export const SachHiepSidebar"
});

// Clone Editor
cloneFile('Editor.tsx', 'SachHiepEditor.tsx', {
    ...commonReplacements,
    "export const Editor": "export const SachHiepEditor"
});

// Clone StorySettingsModal
cloneFile('StorySettingsModal.tsx', 'SachHiepSettingsModal.tsx', {
    ...commonReplacements,
    "export const StorySettingsModal": "export const SachHiepSettingsModal"
});

