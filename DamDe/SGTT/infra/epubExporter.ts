import JSZip from 'jszip';
import { Story, Chapter } from '../types';

export const exportToEpub = async (story: Story): Promise<void> => {
  const zip = new JSZip();

  // 1. mimetype (must be uncompressed, but JSZip handles it if we add it first)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF')?.file('container.xml', containerXml);

  // 3. OEBPS/
  const oebps = zip.folder('OEBPS');
  if (!oebps) return;

  const textFolder = oebps.folder('Text');
  const imagesFolder = oebps.folder('Images');

  let manifestItems = '';
  let spineItems = '';
  let navPoints = '';
  let imageManifestItems = '';

  let playOrder = 1;

  for (let i = 0; i < story.chapters.length; i++) {
    const chapter = story.chapters[i];
    const chapterId = `chapter_${i + 1}`;
    const chapterFileName = `${chapterId}.xhtml`;

    let chapterContentHtml = '';
    const lines = chapter.content.split('\n');
    const illustrations = chapter.illustrations || [];

    lines.forEach((line, index) => {
      chapterContentHtml += `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>\n`;
      
      const lineIllustrations = illustrations.filter(ill => ill.position === index + 1);
      lineIllustrations.forEach((ill, illIndex) => {
        const imageFileName = `image_${chapterId}_${index}_${illIndex}.png`;
        
        // Extract base64 data
        const base64Data = ill.imageUrl.split(',')[1];
        if (base64Data) {
          imagesFolder?.file(imageFileName, base64Data, { base64: true });
          imageManifestItems += `<item id="img_${imageFileName}" href="Images/${imageFileName}" media-type="image/png"/>\n`;
          chapterContentHtml += `<div class="illustration"><img src="../Images/${imageFileName}" alt="Illustration" /></div>\n`;
        }
      });
    });

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${chapter.title}</title>
  <style>
    body { font-family: serif; line-height: 1.6; padding: 1em; }
    p { text-indent: 1.5em; margin-bottom: 0.5em; }
    .illustration { text-align: center; margin: 1em 0; }
    .illustration img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${chapter.title}</h1>
  ${chapterContentHtml}
</body>
</html>`;

    textFolder?.file(chapterFileName, xhtml);

    manifestItems += `<item id="${chapterId}" href="Text/${chapterFileName}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `<itemref idref="${chapterId}"/>\n`;
    navPoints += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${chapter.title}</text></navLabel>
      <content src="Text/${chapterFileName}"/>
    </navPoint>`;
    playOrder++;
  }

  // content.opf
  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${story.title}</dc:title>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:${story.id}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
${imageManifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;
  oebps.file('content.opf', contentOpf);

  // toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${story.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${story.title}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  oebps.file('toc.ncx', tocNcx);

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${story.title.replace(/[^a-zA-Z0-9]/g, '_')}.epub`;
  link.click();
  URL.revokeObjectURL(url);
};
