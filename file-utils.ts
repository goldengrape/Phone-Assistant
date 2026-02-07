import { ProcessedFile } from './types';

export const parseFile = async (file: File): Promise<ProcessedFile> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  let content = '';

  try {
    if (fileType === 'pdf') {
      content = await parsePDF(file);
    } else if (fileType === 'epub') {
      content = await parseEPUB(file);
    } else {
      // Default to text for txt, md, etc.
      content = await file.text();
    }
  } catch (err) {
    console.error(`Error parsing file ${file.name}:`, err);
    content = `[Error parsing file: ${file.name}]`;
  }

  return {
    id: Math.random().toString(36).substring(7),
    name: file.name,
    type: fileType || 'unknown',
    content,
    size: file.size,
  };
};

const parsePDF = async (file: File): Promise<string> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js not loaded");
  }
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }
  return fullText;
};

const parseEPUB = async (file: File): Promise<string> => {
  if (!window.JSZip) {
    throw new Error("JSZip not loaded");
  }
  const zip = new window.JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  let fullText = '';
  
  // Simple heuristic: Iterate all files, look for .html or .xhtml, extract text
  const filePromises: Promise<string>[] = [];
  
  loadedZip.forEach((relativePath: string, zipEntry: any) => {
    if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
        filePromises.push(
            zipEntry.async('string').then((content: string) => {
                 // Basic regex to strip tags, definitely not perfect but lightweight
                 const parser = new DOMParser();
                 const doc = parser.parseFromString(content, 'text/html');
                 return doc.body.textContent || '';
            })
        );
    }
  });

  const texts = await Promise.all(filePromises);
  fullText = texts.join('\n\n');
  return fullText;
};