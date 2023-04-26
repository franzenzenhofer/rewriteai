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
        function generateUniqueId() {
          return 'franz-ai-' + Math.random().toString(36).substr(2, 9);
        }

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        const parentNode = range.commonAncestorContainer.parentNode;
        const uniqueId = generateUniqueId();
        parentNode.classList.add(uniqueId);
        return { selectedHTML: container.innerHTML, parentNodeOuterHTML: parentNode.outerHTML, uniqueId };
      })();
    `,
  }, (result) => {
    if (result && result[0]) {
      console.log('Selected HTML:', result[0].selectedHTML);
      console.log('Parent node outerHTML:', result[0].parentNodeOuterHTML);
      console.log('Unique identifier:', result[0].uniqueId);
      rewriteText(result[0].selectedHTML, result[0].parentNodeOuterHTML, tabId, result[0].uniqueId);
    } else {
      console.log('No valid HTML selected');
    }
  });
}



async function rewriteText(text, parentNode, tabId, uniqueId) {
  if (!text) {
    console.error('Invalid input text:', text);
    return;
  }

  const rewrittenText = await fetchRewrittenText(text);
  if (rewrittenText) {
    replaceSelectedText(tabId, text, rewrittenText, parentNode, uniqueId);
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
          content: `Rewrite the following text, making it better as if a professional website editor did it. Preserve any HTML structure if present. If there are links in there, keep the links. You can add bullet points if it fits the topic. Respond in the same language as the original text, and return approximately the same amount of text received. If you got a short headline or sentence, don't turn it into a paragraph: "${text}"`
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

function replaceSelectedText(tabId, originalText, rewrittenText, parentNode, uniqueId) {
  chrome.tabs.executeScript(tabId, {
    code: `
      const originalText = ${JSON.stringify(originalText)};
      const rewrittenText = ${JSON.stringify(rewrittenText)};
      const parentNode = ${JSON.stringify(parentNode)};
      const uniqueId = ${JSON.stringify(uniqueId)};
      (function() {
        console.log('Executing script to replace text');
        try {
          const parser = new DOMParser();
          const parsedParentNode = parser.parseFromString(parentNode, 'text/html').body.firstChild;
          const newParentInnerHTML = parsedParentNode.innerHTML.replace(originalText, rewrittenText);
          parsedParentNode.innerHTML = newParentInnerHTML;
          const targetParentNode = document.querySelector('.' + uniqueId);
          if (targetParentNode) {
            targetParentNode.outerHTML = parsedParentNode.outerHTML;
            console.log('Text replacement complete');
            targetParentNode.classList.remove(uniqueId); // Remove the unique identifier after the replacement
          } else {
            console.error('Unable to find the target parent node');
          }
        } catch (error) {
          console.error('Error in text replacement:', error);
        }
      })();
    `,
  }, (result) => {
    console.log('Script injection result:', result);
  });
}