chrome.runtime.onInstalled.addListener(function () {
    console.log('Extension installed');
    chrome.contextMenus.create({
      id: 'rewriteText',
      title: 'Rewrite Text with Franz AI',
      contexts: ['selection'],
    });
    console.log('Context menu item created');
  });
  
  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    console.log('Context menu item clicked');
    if (info.menuItemId === 'rewriteText' && info.selectionText) {
      console.log('Rewriting text:', info.selectionText);
      getSelectedHTML(tab.id);
    }
  });
  
  function getSelectedHTML(tabId) {
    chrome.tabs.executeScript(tabId, {
      code: `
        (function() {
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          return container.innerHTML;
        })();
      `,
    }, (result) => {
      if (result && result[0]) {
        console.log('Selected HTML:', result[0]);
        rewriteText(result[0], tabId);
      } else {
        console.log('No valid HTML selected');
      }
    });
  }
  
  
  async function rewriteText(text, tabId) {
    if (!text) {
      console.error('Invalid input text:', text);
      return;
    }
  
    const rewrittenText = await fetchRewrittenText(text);
    if (rewrittenText) {
      replaceSelectedText(tabId, text, rewrittenText);
    }
  }
  
  async function fetchRewrittenText(text) {
    console.log('rewriteText function called with text:', text);
    const apiKey = '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';
  
    try {
      console.log('Sending API request');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: `Rewrite the following text, make it better, more actionable and more strucuted, do your best to create great website copy, while preserving any HTML structure: "${text}"` }],
          temperature: 0.7,
        }),
      });
  
      console.log('API response:', response);
      const data = await response.json();
      console.log('API data:', data);
      const rewrittenText = data.choices[0].message.content.trim();
      console.log('Rewritten text:', rewrittenText);
  
      return rewrittenText;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }
  
  function replaceSelectedText(tabId, originalText, rewrittenText) {
    chrome.tabs.executeScript(tabId, {
      code: `
        const originalText = ${JSON.stringify(originalText)};
        const rewrittenText = ${JSON.stringify(rewrittenText)};
        (function() {
          console.log('Executing script to replace text');
          try {
            const selection = window.getSelection();
            console.log('Current selection:', selection.toString());
            const range = selection.getRangeAt(0);
            const originalNode = range.commonAncestorContainer;
            const parentNode = originalNode.parentNode;
            const clonedNode = parentNode.cloneNode(true);
            const tmpElement = document.createElement('div');
            tmpElement.innerHTML = clonedNode.innerHTML.replace(originalText, rewrittenText);
            parentNode.parentNode.replaceChild(tmpElement.firstChild, parentNode);
            selection.removeAllRanges();
            console.log('Text replacement complete');
          } catch (error) {
            console.error('Error in text replacement:', error);
          }
        })();
      `,
    }, (result) => {
      console.log('Script injection result:', result);
    });
  }
  