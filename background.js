chrome.runtime.onInstalled.addListener(function () {
  console.log('Extension installed');
  chrome.storage.sync.get(['apiKey'], function (result) {
    if (!result.apiKey) {
      chrome.runtime.openOptionsPage();
    }
  });
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

  const apiKey = await getOption('apiKey');
  const model = (await getOption('model')) || 'gpt-3.5-turbo'; // Use gpt-3.5-turbo as default if model is not available
  const promptTemplate = await getOption('promptTemplate'); // Change this line
  const temperature = await getOption('temperature');

  const finalPrompt = `${promptTemplate} "${text}"`; // Added this line
  console.log('Final prompt submitted to OpenAI:', finalPrompt); 

  try {
    console.log('Sending API request');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: finalPrompt,
        }],
        temperature: parseFloat(temperature),
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

async function getOption(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], function (result) {
      resolve(result[key]);
    });
  });
}


function replaceSelectedText(tabId, originalText, rewrittenText, parentNode, uniqueId) {
  chrome.tabs.executeScript(tabId, {
    code: `
      (function() {
        const originalText = ${JSON.stringify(originalText)};
        const rewrittenText = ${JSON.stringify(rewrittenText)};
        const parentNode = ${JSON.stringify(parentNode)};
        const uniqueId = ${JSON.stringify(uniqueId)};
        
        console.log('Executing script to replace text');
        try {
          const parser = new DOMParser();
          const parsedParentNode = parser.parseFromString(parentNode, 'text/html').body.firstChild;
          let newParentInnerHTML = parsedParentNode.innerHTML.replace(originalText, rewrittenText);
          
          if (parsedParentNode.innerHTML === newParentInnerHTML) {
            // Perform a more flexible search and replace if the original text was not found
            const regex = new RegExp(originalText.replace(/[.*+\-?^$\{\}()|[\]\\]/g, '\\$&'), 'g');
            newParentInnerHTML = parsedParentNode.innerHTML.replace(regex, rewrittenText);
          }
          
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
