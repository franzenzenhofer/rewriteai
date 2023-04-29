/* 
Displays an overlay message with a close button in the center of the screen. 
The overlay is centered horizontally and is copy and pasteable.
*/

function displayOverlayMessage(message) {
  function removeAllPulsateClass() {
    const pulsatingElements = document.querySelectorAll('.franz-ai-pulsate');
    pulsatingElements.forEach(element => {
      element.classList.remove('franz-ai-pulsate');
    });
  }
  window.getSelection().removeAllRanges();

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '2147483647';
  overlay.style.bottom = '10px';
  overlay.style.left = '10px';
  overlay.style.right = '10px';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'flex-start';
  overlay.style.margin = '0 auto';
  overlay.style.maxWidth = '80%';
  overlay.style.width = 'auto';

  if (window.innerWidth <= 800) {
    overlay.style.width = '100%';
  }

  const content = document.createElement('div');
  content.style.backgroundColor = 'white';
  content.style.color = 'black';
  content.style.border = '1px solid black';
  content.style.borderRadius = '4px';
  content.style.padding = '20px';
  content.style.textAlign = 'center';
  content.style.maxHeight = '75%';
  content.style.overflowY = 'auto';
  content.style.boxShadow = '0px 3px 6px rgba(0, 0, 0, 0)';
  content.innerHTML = `
    <h3 style="margin-top: 0">Onpage replacement did not work, here is your Franz AI content:</h3>
    <p style="margin-bottom: 20px">${message}</p>
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.color = 'black';
  closeButton.style.background = 'white';
  closeButton.style.border = 'none';
  closeButton.style.padding = '8px 16px';
  closeButton.style.borderRadius = '4px';
  closeButton.style.boxShadow = '0px 3px 6px rgba(0, 0, 0, 0.2)';
  closeButton.onclick = () => {
    document.body.removeChild(overlay);
  };

  content.appendChild(closeButton);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  removeAllPulsateClass();
}

console.log("overlay injected");