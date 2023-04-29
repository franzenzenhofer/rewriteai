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

  const rewrittenText = await fetchRewrittenText(text, tabId);
  if (rewrittenText) {
    replaceSelectedText(tabId, text, rewrittenText, parentNode, uniqueId);
  }
}


async function fetchRewrittenText(text, tabId) {
  console.log('rewriteText function called with text:', text);

  const apiKey = await getOption('apiKey');
  const model = (await getOption('model')) || 'gpt-3.5-turbo'; // Use gpt-3.5-turbo as default if model is not available
  const promptTemplate = await getOption('promptTemplate'); // Change this line
  const temperature = await getOption('temperature');

  const finalPrompt = `${promptTemplate} "${text}"`; // Added this line
  console.log('Final prompt submitted to OpenAI:', finalPrompt); 

  try {
    console.log('Sending API request');
    await createTimer(tabId);
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
    removeTimer(tabId);

    //final to do do fix this
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
    removeTimer(tabI);
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
  let targetParentNode = findTargetParentNode();

  if (targetParentNode) {
    success = tryReplaceMethods();
  }

  if (!success) handleError();
  removeUniqueIdentifierAndPulsateClass();
  if (success) console.log("SUCCESS: Text replaced successfully");
  return null;

  function findTargetParentNode() {
    const liveDomElement = findLiveDomElement(document.body);
    if (liveDomElement) {
      console.log('Found liveDomElement');
      return liveDomElement;
    }
    const targetParentNode = findTextNode(document.body);
    if (targetParentNode) console.log('Found targetParentNode using tree traversal');
    return targetParentNode;
  }

  function findLiveDomElement(node) {
    if (node.classList && node.classList.contains(uniqueId)) {
      return node;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i];
      const foundNode = findLiveDomElement(childNode);
      if (foundNode) return foundNode;
    }
  }

  function tryReplaceMethods() {
    let success = false;
    // Method 1: Try replacing using innerHTML
    let newParentInnerHTML = targetParentNode.innerHTML.replace(originalText, rewrittenText);
    
    if (targetParentNode.innerHTML === newParentInnerHTML) {
      console.log('Failed to replace text using innerHTML');
      // If the first replacement failed, use a more sophisticated replacement algorithm
      const regex = new RegExp(originalText.replace(/[.*+\-?^$\{\}()|[\]\\]/g, '\\$&'), 'g');
      newParentInnerHTML = targetParentNode.innerHTML.replace(regex, rewrittenText);
    } else {
      console.log('Text replaced using innerHTML');
    }
  
    targetParentNode.innerHTML = newParentInnerHTML;
    success = targetParentNode.innerHTML.includes(rewrittenText);
  
    // Method 2: If the innerHTML method failed, try replacing using text nodes
    if (!success) {
      console.log('Trying to replace text using text nodes');
      const textNode = findTextNode(targetParentNode, originalText);
  
      if (textNode) {
        const newText = textNode.textContent.replace(originalText, rewrittenText);
        const newNode = document.createTextNode(newText);
  
        targetParentNode.replaceChild(newNode, textNode);
        success = newNode.textContent.includes(rewrittenText);
  
        if (success) {
          console.log('Text replaced using text nodes');
        } else {
          console.log('Failed to replace text using text nodes');
        }
      } else {
        console.log('Text node not found for replacement');
      }
    }
// Method 3: If both methods above failed, try replacing using outerHTML
if (!success) {
  console.log('Trying to replace text using outerHTML');
  const oldOuterHTML = targetParentNode.outerHTML;
  const regex = new RegExp(originalText.replace(/[.*+\-?^$\{\}()|[\]\\]/g, '\\$&'), 'g');
  const newOuterHTML = oldOuterHTML.replace(regex, rewrittenText);
  const parser = new DOMParser();
  const newElement = parser.parseFromString(newOuterHTML, 'text/html').body.firstChild;

  if (newElement) {
    targetParentNode.parentNode.replaceChild(newElement, targetParentNode);
    success = newElement.outerHTML.includes(rewrittenText);

    if (success) {
      console.log('Text replaced using outerHTML');
    } else {
      console.log('Failed to replace text using outerHTML');
    }
  } else {
    console.log('Failed to create a new element using outerHTML');
  }
}

// Method 4: If all methods above failed, try replacing using a new span element with unique ID
if (!success) {
  console.log('Trying to replace text using span method');
  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const newNode = document.createElement('span');
    newNode.setAttribute('id', 'franz_ai_span_'+uniqueId);
    range.surroundContents(newNode);

    const spanInLiveDOM = document.getElementById('franz_ai_span_'+uniqueId);

    if (spanInLiveDOM && spanInLiveDOM.innerHTML.includes(originalText)) {
      spanInLiveDOM.innerHTML = spanInLiveDOM.innerHTML.replace(originalText, '');
      spanInLiveDOM.innerHTML = rewrittenText;
      success = spanInLiveDOM.innerHTML.includes(rewrittenText);
    }

    if (success) {
      console.log('Text replaced using span method');
    } else {
      console.log('Failed to replace text using span method');
    }
  } else {
    console.log('No selection found for replacement');
  }
}


/// Method 5: If all methods above failed, try replacing the selected text in the live DOM
// Method 5: If all methods above failed, try replacing the selected text in the live DOM
if (!success) {
  console.log('Trying to replace text using window.getSelection()');
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const parentNode = range.commonAncestorContainer.parentNode;

    // First way to delete the contents
    range.deleteContents();
    console.log('Deleted selected contents (first way)');

    if (!parentNode.innerHTML.includes(rewrittenText)) {
      // Second way to delete the contents
      const startNode = range.startContainer;
      const startOffset = range.startOffset;
      const endNode = range.endContainer;
      const endOffset = range.endOffset;

      if (startNode === endNode) {
        startNode.textContent = startNode.textContent.slice(0, startOffset) + startNode.textContent.slice(endOffset);
        console.log('Deleted selected contents (second way)');
      }
    }

    // First way to move the replaced content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rewrittenText;
    const fragment = document.createDocumentFragment();
    let child;

    while ((child = tempDiv.firstChild)) {
      fragment.appendChild(child);
    }

    range.insertNode(fragment);
    console.log('Inserted new element (first way):', fragment);

    if (!parentNode.innerHTML.includes(rewrittenText)) {
      // Second way to move the replaced content
      const parser = new DOMParser();
      const newElement = parser.parseFromString(rewrittenText, 'text/html').body.firstChild;
      parentNode.insertBefore(newElement, range.startContainer.nextSibling);
      console.log('Inserted new element (second way):', newElement);
    }

    // Check if the rewrittenText is now in the live DOM
    const rewrittenTextFound = parentNode.innerHTML.includes(rewrittenText);
    if (rewrittenTextFound) {
      console.log('SUCCESS: Text replaced using window.getSelection()');
      success = true;
    } else {
      console.log('Failed to replace text using window.getSelection()');
    }

 // Scroll to the inserted content
const insertedElement = parentNode.querySelector(`[class*='${uniqueId}']`);
if (insertedElement) {
  insertedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  console.log('Scrolled to the inserted content');
} else {
  console.log('Failed to find the inserted content for scrolling');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  console.log('Scrolled to the top of the page');
}

  } else {
    console.log('No selection found for replacement');
  }
}




    return success;
  }

  function findTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(originalText)) {
      return node.parentNode;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i];
      const foundNode = findTextNode(childNode);
      if (foundNode) return foundNode;
    }
  }

  function handleError() {
    console.error("ERROR: Text replacement failed");
    const escapedText = rewrittenText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    displayOverlayMessage(escapedText);

    const liveDomElement = document.querySelector('.' + uniqueId);

    if (liveDomElement) {
      liveDomElement.style.border = '5px solid blue';
      liveDomElement.classList.add('big-fat-blue-border');
      console.log('marked liveDomElement');
      console.log('Parent node:', liveDomElement);
      console.log('Parent node styles:', window.getComputedStyle(liveDomElement));

    } else {
      console.log('Failed mark liveDomElement');
    }
  }

  function removeUniqueIdentifierAndPulsateClass() {
    const elements = document.querySelectorAll('.' + uniqueId);
    elements.forEach(element => {
      //element.classList.remove(uniqueId);
      element.classList.remove('franz-ai-pulsate');
    });
  }
}


function replaceSelectedText(tabId, originalText, rewrittenText, parentNode, uniqueId)
{
  chrome.scripting.executeScript({
      target : {tabId : tabId},
      args: [originalText, rewrittenText, parentNode, uniqueId],
      func : theReplaceLogic,
    })
    .then(() => console.log("text repaced"))
}

