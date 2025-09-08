"use client";

// Dynamic imports for client-side only libraries
let Tesseract: any = null;
let html2canvas: any = null;

// Load libraries dynamically
const loadLibraries = async () => {
  if (!Tesseract) {
    Tesseract = (await import('tesseract.js')).default;
  }
  if (!html2canvas) {
    html2canvas = (await import('html2canvas')).default;
  }
};

export interface OCRResult {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export const captureAndOCR = async (element: HTMLElement): Promise<OCRResult[]> => {
  await loadLibraries();
  
  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: 2 // Higher resolution for better OCR
    });
    
    // Run OCR on the canvas
    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: m => console.log('OCR Progress:', m)
    });
    
    // Extract words with bounding boxes
    const words: OCRResult[] = result.data.words.map((word: any) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1
      }
    }));
    
    return words;
  } catch (error) {
    console.error('OCR Error:', error);
    return [];
  }
};

export const highlightTextOnScreen = (
  textToFind: string, 
  color: string = 'yellow',
  containerElement: HTMLElement
) => {
  // Remove existing highlights
  const existingHighlights = containerElement.querySelectorAll('.ocr-highlight');
  existingHighlights.forEach(highlight => highlight.remove());
  
  // Find text in OCR results and create highlights
  captureAndOCR(containerElement).then(words => {
    const foundWords = words.filter(word => 
      word.text.toLowerCase().includes(textToFind.toLowerCase()) && 
      word.confidence > 50 // Only highlight high-confidence matches
    );
    
    foundWords.forEach(word => {
      const highlight = document.createElement('div');
      highlight.className = 'ocr-highlight';
      highlight.style.position = 'absolute';
      highlight.style.left = word.bbox.x0 + 'px';
      highlight.style.top = word.bbox.y0 + 'px';
      highlight.style.width = (word.bbox.x1 - word.bbox.x0) + 'px';
      highlight.style.height = (word.bbox.y1 - word.bbox.y0) + 'px';
      highlight.style.backgroundColor = color;
      highlight.style.opacity = '0.3';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '1000';
      highlight.style.borderRadius = '2px';
      
      containerElement.appendChild(highlight);
    });
    
    console.log(`Highlighted ${foundWords.length} instances of "${textToFind}"`);
  });
};

export const readScreenText = async (element: HTMLElement): Promise<string> => {
  const words = await captureAndOCR(element);
  return words.map(word => word.text).join(' ');
};
