function displayOverlayMessage(message) {
  function removeAllPulsateClass() {
    const pulsatingElements = document.querySelectorAll('.franz-ai-pulsate');
    pulsatingElements.forEach(element => {
      element.classList.remove('franz-ai-pulsate');
    });
  }

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '2147483647';
  overlay.style.bottom = '10px';
  overlay.style.left = '10px';
  overlay.style.right = '10px';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'flex-start';

  const content = document.createElement('div');
  content.style.backgroundColor = 'white';
  content.style.color = 'black';
  content.style.border = '1px solid black';
  content.style.borderRadius = '4px';
  content.style.padding = '20px';
  content.style.textAlign = 'center';
  content.style.maxHeight = '80%';
  content.style.overflowY = 'auto';
  content.style.boxShadow = '0px 3px 6px rgba(0, 0, 0, 0.2)';
  content.innerHTML = '<h3>In content replacement did not work, this is what we would have changed:</h3><p>' + message + '</p>';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '20px';
  closeButton.style.color = 'black';
  closeButton.onclick = () => {
    document.body.removeChild(overlay);
  };

  content.appendChild(closeButton);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  removeAllPulsateClass();
}

console.log("overlay injected");
