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
    injectPulsatingCSS();
    getSelectedHTML(tab.id);
  }
});

function injectPulsatingCSS(tabId) {
  chrome.tabs.insertCSS(tabId, {
    code: `
      @keyframes pulsate {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
        100% {
          opacity: 1;
        }
      }
      .franz-ai-pulsate {
        animation: pulsate 1s ease infinite;
      }
    `,
  });
}

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
        parentNode.classList.add('franz-ai-pulsate'); 
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


function displayOverlayMessage(tabId, message) {
  chrome.tabs.executeScript(tabId, {
    code: `
      (function() {
        const message = ${JSON.stringify(message)};
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '2147483647';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.color = 'black'; // Set font color to black
        content.style.border = '1px solid black';
        content.style.borderRadius = '4px';
        content.style.padding = '20px';
        content.style.textAlign = 'center';
        content.innerHTML = '<h3>In content replacement did not work, this is what we would have changed:</h3><p>' + message + '</p>';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.onclick = () => {
          document.body.removeChild(overlay);
        };
        
        content.appendChild(closeButton);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
      })();
    `,
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
        let success = false;
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
            const liveDomElement = document.querySelector('.' + uniqueId);
            success = liveDomElement && liveDomElement.outerHTML.includes(rewrittenText);
            
            if (success) {
              liveDomElement.classList.add('franz-ai-updated');
            }
          } else {
            console.error('Unable to find the target parent node');
          }
          
          // Remove the unique identifier and pulsating class from all elements in the DOM
          const elements = document.querySelectorAll('.' + uniqueId);
          elements.forEach(element => {
            element.classList.remove(uniqueId);
            element.classList.remove('franz-ai-pulsate');
          });
          
        } catch (error) {
          console.error('Error in text replacement:', error);
        }
        return { success };
      })();
    `,
  }, (result) => {
    if (result && result[0] && result[0].success) {
      console.log('Text replacement complete');
    } else {
      console.error('Text replacement failed');
      const escapedText = rewrittenText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      displayOverlayMessage(tabId, escapedText);
    }
  });
}



