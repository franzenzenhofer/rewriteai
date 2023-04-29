// Get the saved counter from Chrome storage API
chrome.storage.local.get(['requestCount'], function (result) {
  if (!result.requestCount) {
    // If the counter is not set yet, set it to 0
    chrome.storage.local.set({ requestCount: 0 });
  }
});

async function canRequest() {
  const { apiKey, requestCount } = await new Promise((resolve) =>
    chrome.storage.local.get(['apiKey', 'requestCount'], resolve)
  );

  if (apiKey) {
    return true; // Own API key is set, allow request
  }

  const newCount = requestCount + 1;
  if (newCount > 100) {
    console.error('You have exceeded the request limit of 100');
    chrome.runtime.openOptionsPage(); // Open the options page
    return false;
  } else {
    // Save the new count to Chrome storage API
    chrome.storage.local.set({ requestCount: newCount });
    return true;
  }
}



chrome.runtime.onInstalled.addListener(async function (details) {
  chrome.contextMenus.create({
    id: 'rewriteText',
    title: 'Rewrite Text with Franz AI',
    contexts: ['selection'],
  });
  console.log('Context menu item created');
  
  if (details.reason === 'install') {
    console.log('Extension installed');
    chrome.runtime.openOptionsPage();
  }
});



chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log('Context menu item clicked');
  if (info.menuItemId === 'rewriteText' && info.selectionText) {
    console.log('Rewriting text:', info.selectionText);
    injectPulsatingCSS(tab.id);
    getSelectedHTML(tab.id);
    injectOverlay(tab.id);
  }
});

function injectPulsatingCSS(tabId) {
  chrome.scripting.insertCSS({ target: { tabId }, files: ['pulsating.css'] });
}

function getSelectedHTML(tabId) {
  console.log('Getting selected HTML ', tabId);
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function() {
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
    }
  }).then((results) => {
    try {
      if (results && results[0]) {
        const result = results[0].result;
        console.log('Selected HTML:', result.selectedHTML);
        console.log('Parent node outerHTML:', result.parentNodeOuterHTML);
        console.log('Unique identifier:', result.uniqueId);
        rewriteText(result.selectedHTML, result.parentNodeOuterHTML, tabId, result.uniqueId);
      } else {
        console.log('No valid HTML selected');
        triggerOverlay(tabId, 'No valid HTML selected');
      }
    } catch (error) {
      console.error('Error in getSelectedHTML:', error);
      const message = 'Selected HTML could not be processed due to unknown reasons';
      const escapedHTML = escapeHTML(result.selectedHTML);
      triggerOverlay(tabId, `${message}: ${escapedHTML}`);
    }
  }).catch((error) => {
    console.error('Error in getSelectedHTML:', error);
    const message = 'Selected HTML could not be processed due to unknown reasons';
    triggerOverlay(tabId, message);
  });
}










function showInvalidInputError(tabId, text) {
  const message = `An error occurred: The input text could not be used for a rewrite due to unknown reasons. Text: ${escapeHtml(text)}`;
  triggerOverlay(tabId, message);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function rewriteText(text, parentNode, tabId, uniqueId) {
  if (!text) {
    console.error('Invalid input text:', text);
    showInvalidInputError(tabId, text);
    return;
  }

  const canExecute = await canRequest();
  if (!canExecute) {
  //  if(true){
    console.error('You have exceeded the request limit of 100');
    chrome.runtime.openOptionsPage(); // Open the options page
    return;
  }


  const rewrittenText = await fetchRewrittenText(text, tabId);
  if (rewrittenText) {
    replaceSelectedText(tabId, text, rewrittenText, parentNode, uniqueId);
  }
}


async function fetchRewrittenText(text, tabId) {
  console.log('rewriteText function called with text:', text);

  const apiKey = await getOption('apiKey');
  const model = (await getOption('model')) || 'gpt-3.5-turbo'; // Use gpt-3.5-turbo as default if model is not available
  const promptTemplate = await getOption('promptTemplate') || "Rewrite this to a much better, more informative, cooler version. Keep the HTML as is during the rewrite, even if the HTML is broken. Use lots of emojis:";
  const temperature = await getOption('temperature');

  const finalPrompt = `${promptTemplate} "${text}"`; 
  console.log('Final prompt submitted to OpenAI:', finalPrompt); 

  let response; // define response variable outside blocks

  try {
    console.log('Sending API request');
    await createTimer(tabId);

    if(apiKey)
    {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    } else {
      console.log("no api key is set");
      response = await fetch('https://sweet-cloud-2d13.franz-enzenhofer7308.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    }

    console.log('API response:', response);
    removeTimer(tabId);

    if (!response.ok) {
      const errorMessage = handleApiError(response.status);
      console.error(errorMessage);
      triggerOverlay(tabId, errorMessage);
      return null;
    }

    const data = await response.json();
    console.log('API data:', data);
    const rewrittenText = data.choices[0].message.content.trim();
    console.log('Rewritten text:', rewrittenText);

    return rewrittenText;
  } catch (error) {
    console.error('Error:', error);
    removeTimer(tabId);
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

function handleApiError(statusCode) {
  switch (statusCode) {
    case 400:
      return 'Error 400: Bad request. Please check your input and try again.';
    case 401:
      return 'Authentication error 401: Please check your API key and organization.';
    case 404:
      return 'Error 404: The requested resource was not found.';
    case 429:
      return 'Error 429: Rate limit reached or quota exceeded. Please check your plan and billing details, or try again later.';
    case 500:
      return 'Error 500: Server error while processing your request. Please try again later.';
    default:
      return 'Error : An unknown error occurred. Please try again later.';
  }
}



async function createTimer(tabId) {
  console.log("Creating timer");
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      files : [ "timer.js" ],
    })
    return result && result[0].result;
  } catch (error) {
    console.error("Error creating and displaying timer:", error);
  }
}

async function triggerOverlay(tabId, message) {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      args: [message],
      func : (message) => { 
        displayOverlayMessage(message);
      }
    })
    .then(() => console.log("triggered overlay"));
}

async function injectOverlay(tabId) {
  console.log("injectin overlay");
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      files : [ "overlay.js" ],
    })
    return result && result[0].result;
  } catch (error) {
    console.error("could not inject overlay:", error);
  }
}


function removeTimer(tabId)
{
  chrome.scripting.executeScript({
      target : {tabId : tabId},
      func : () => { 
        const timer = document.getElementById("franz-ai-timer");
        if (timer) {
          timer.remove();
        }
      }
    })
    .then(() => console.log("timer removed"))
}

function theReplaceLogic(originalText, rewrittenText, parentNode, uniqueId) {
  console.log('Executing script to replace text');
  let success = false;
  let targetParentNode = findTargetParentNode(originalText, rewrittenText, parentNode, uniqueId);

  if (targetParentNode) {
    success = tryReplaceMethods(targetParentNode, originalText, rewrittenText, parentNode, uniqueId);
  }

  if (!success) handleError(originalText, rewrittenText, parentNode, uniqueId);
  removeUniqueIdentifierAndPulsateClass(originalText, rewrittenText, parentNode, uniqueId);
  if (success) console.log("SUCCESS: Text replaced successfully");
  return null;

}

function replaceSelectedText(tabId, originalText, rewrittenText, parentNode, uniqueId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["replace.js"]
  })
    .then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [originalText, rewrittenText, parentNode, uniqueId],
        function: theReplaceLogic,
      })
        .then(() => console.log("Text replaced"))
        .catch((error) => console.log(error));
    })
    .catch((error) => console.log(error));
}


