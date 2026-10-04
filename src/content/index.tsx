import { Readability } from '@mozilla/readability';

console.log('PagePilot content script loaded.');

chrome.runtime.onMessage.addListener((request: any) => {
  if (request.type === 'GET_PAGE_CONTEXT') {
    try {
      let article = null;
      try {
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        article = reader.parse();
      } catch (e) {
        console.warn('Readability parsing failed:', e);
      }

      let rawText = '';
      try {
        rawText = document.body.innerText || '';
      } catch (e) {
        rawText = '';
      }

      let selectedText = '';
      try {
        selectedText = window.getSelection()?.toString() || '';
      } catch (e) {
        selectedText = '';
      }

      return Promise.resolve({
        success: true,
        title: document.title || article?.title || '',
        url: window.location.href,
        excerpt: article?.excerpt || '',
        textContent: article?.textContent || '',
        rawText: rawText,
        selectedText: selectedText,
      });
    } catch (error) {
      console.error('PagePilot failed to parse page content:', error);
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during extraction'
      });
    }
  }
  // Important: return true for async response, or undefined for no response
  return undefined;
});
