


function findTargetParentNode(originalText, rewrittenText, parentNode, uniqueId) {
    const liveDomElement = findLiveDomElement(document.body, originalText, rewrittenText, parentNode, uniqueId);
    if (liveDomElement) {
      console.log('Found liveDomElement');
      return liveDomElement;
    }
    const targetParentNode = findTextNode(document.body, originalText, rewrittenText, parentNode, uniqueId);
    if (targetParentNode) console.log('Found targetParentNode using tree traversal');
    return targetParentNode;
  }

  function findLiveDomElement(node, originalText, rewrittenText, parentNode, uniqueId) {
    if (node.classList && node.classList.contains(uniqueId)) {
      return node;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i];
      const foundNode = findLiveDomElement(childNode, originalText, rewrittenText, parentNode, uniqueId);
      if (foundNode) return foundNode;
    }
  }

  function findTextNode(node, originalText, rewrittenText, parentNode, uniqueId) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(originalText)) {
      return node.parentNode;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i];
      const foundNode = findTextNode(childNode, originalText, rewrittenText, parentNode, uniqueId);
      if (foundNode) return foundNode;
    }
  }

  function tryReplaceMethods(targetParentNode, originalText, rewrittenText, parentNode, uniqueId) {
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
      const textNode = findTextNode(targetParentNode, originalText, rewrittenText, parentNode, uniqueId);
  
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
// Method 3: If the previous methods failed, try replacing using regex search and replace
if (!success) {
    console.log('Trying to replace text using regex search and replace');
    const regex = new RegExp(originalText.substr(0, 5) + '.+' + originalText.substr(-5), 'g');
    const bodyHTML = document.body.innerHTML;
    const newBodyHTML = bodyHTML.replace(regex, rewrittenText);
  
    if (newBodyHTML !== bodyHTML) {
      document.body.innerHTML = newBodyHTML;
      success = document.body.innerHTML.includes(rewrittenText);
  
      if (success) {
        console.log('Text replaced using regex search and replace');
        //targetParentNode.textContent = rewrittenText; // update targetParentNode's textContent
      } else {
        console.log('Failed to replace text using regex search and replace');
      }
    } else {
      console.log('Failed to replace text using regex search and replace');
    }
  }
  





/// Method 4: If all methods above failed, try replacing the selected text in the live DOM
// Method 4: If all methods above failed, try replacing the selected text in the live DOM
/*if (!success) {
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
} */




    return success;
  }



  function handleError(originalText, rewrittenText, parentNode, uniqueId) {
    console.error("ERROR: Text replacement failed");
    const escapedText = rewrittenText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    displayOverlayMessage(escapedText);

    const liveDomElement = document.querySelector('.' + uniqueId);

    if (liveDomElement) {
      //liveDomElement.style.border = '5px solid blue';
      //liveDomElement.classList.add('big-fat-blue-border');
      //console.log('marked liveDomElement');
      console.log('Parent node:', liveDomElement);
      console.log('Parent node styles:', window.getComputedStyle(liveDomElement));

    } else {
      console.log('Failed mark liveDomElement');
    }
  }

  function removeUniqueIdentifierAndPulsateClass(originalText, rewrittenText, parentNode, uniqueId) {
    const elements = document.querySelectorAll('.' + uniqueId);
    elements.forEach(element => {
      //element.classList.remove(uniqueId);
      element.classList.remove('franz-ai-pulsate');
    });
  }