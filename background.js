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
        const parentNode = range.commonAncestorContainer.parentNode;
        const parentInnerHTML = parentNode.innerHTML;
        return { selectedHTML: container.innerHTML, parentInnerHTML, parentNodeTagName: parentNode.tagName };
      })();
    `,
  }, (result) => {
    if (result && result[0]) {
      console.log('Selected HTML:', result[0].selectedHTML);
      rewriteText(result[0].selectedHTML, result[0].parentInnerHTML, result[0].parentNodeTagName, tabId);
    } else {
      console.log('No valid HTML selected');
    }
  });
}

async function rewriteText(text, parentInnerHTML, parentNodeTagName, tabId) {
  if (!text) {
    console.error('Invalid input text:', text);
    return;
  }

  const rewrittenText = await fetchRewrittenText(text);
  if (rewrittenText) {
    replaceSelectedText(tabId, text, rewrittenText, parentInnerHTML, parentNodeTagName);
  }
}

async function fetchRewrittenText(text) {
  console.log('rewriteText function called with text:', text);
  const apiKey = API_KEY;

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
        messages: [{
          role: 'user',
          content: `Rewrite the following text, making it better as if a professional website editor did it. You must preserve any HTML structure if present. You can add bullet points if it fits the topic. Respond in the same language as the original text, and return approximately the same amount of text received. If you got a short sentence or just a word, never turn it into a paragraph, the shorter the text, the more keep to the original content length, just respond with the text or HTML that we need: "${text}"`
        }],
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

function replaceSelectedText(tabId, originalText, rewrittenText, parentInnerHTML, parentNodeTagName) {
  chrome.tabs.executeScript(tabId, {
    code: `
      const originalText = ${JSON.stringify(originalText)};
      const rewrittenText = ${JSON.stringify(rewrittenText)};
      const parentInnerHTML = ${JSON.stringify(parentInnerHTML)};
      const parentNodeTagName = ${JSON.stringify(parentNodeTagName)};
      (function() {
        console.log('Executing script to replace text');
        try {
          const selection = window.getSelection();
          console.log('Current selection:', selection.toString());
          const range = selection.getRangeAt(0);
          const parentNode = range.commonAncestorContainer.parentNode;
          const newParentInnerHTML = parentInnerHTML.replace(originalText, rewrittenText);
          parentNode.innerHTML = newParentInnerHTML;
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