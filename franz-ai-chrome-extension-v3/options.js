const apiKeyInput = document.getElementById('apiKey');
const promptTemplateInput = document.getElementById('prompt-template');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');
const modelInput = document.getElementById('model');
const saveButton = document.getElementById('save');
const apiCount = document.getElementById('api-count'); // Get the API count element

chrome.storage.local.get('requestCount', function(result) {
  let count = result.requestCount;
  if (isNaN(count)) {
    count = 100;
  } else {
    count = 100 - count;
  }
  apiCount.innerText = `Free rewrites: ${count} of 100`; // Set the text of the API count element

  if (count < 10) { // If less than 10 rewrites are left
    apiCount.style.fontWeight = "bold"; // Make the text bold
    apiCount.style.color = "red"; // Make the text red
  }
});

// Function to fetch available models
async function fetchAvailableModels(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.data;
    } else {
      console.error('Failed to fetch available models:', response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
}

// Function to update model select box
function updateModelSelectBox(availableModels, selectedModel) {
  modelInput.innerHTML = ''; // Clear the existing options

  // Default option (gpt-3.5-turbo)
  const defaultOption = document.createElement('option');
  defaultOption.value = 'gpt-3.5-turbo';
  defaultOption.textContent = 'gpt-3.5-turbo';
  modelInput.appendChild(defaultOption);

  availableModels.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.id;
    modelInput.appendChild(option);
  });

  // Set the selected model
  modelInput.value = selectedModel || 'gpt-3.5-turbo';
}

async function loadOptions() {
  const defaultOptions = await getDefaultOptions();
  chrome.storage.sync.get(['apiKey', 'promptTemplate', 'temperature', 'model'], async function (data) {
    apiKeyInput.value = data.apiKey || '';
    promptTemplateInput.value = data.promptTemplate || defaultOptions.promptTemplate;
    temperatureInput.value = data.temperature || defaultOptions.temperature;
    temperatureValue.textContent = temperatureInput.value;

    if (apiKeyInput.value) {
      const availableModels = await fetchAvailableModels(apiKeyInput.value);
      updateModelSelectBox(availableModels, data.model || defaultOptions.model);
    } else {
      updateModelSelectBox([], data.model || defaultOptions.model);
    }
  });
}


function saveOptions() {
  chrome.storage.sync.set({
    apiKey: apiKeyInput.value,
    promptTemplate: promptTemplateInput.value,
    temperature: temperatureInput.value,
    model: modelInput.value,
  }, function () {
    // Remove focus from the popup
    window.blur();
    // Create a mini message overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = '#fff';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.fontSize = '2rem';
    overlay.style.zIndex = 9999;
    overlay.textContent = 'Changes saved.';
    document.body.appendChild(overlay);
    // Remove the overlay after 1 seconds
    setTimeout(() => {
      document.body.removeChild(overlay);
      // Close the popup
      window.close();
    }, 1000);
  });
}


document.addEventListener('DOMContentLoaded', loadOptions);

temperatureInput.addEventListener('input', () => {
  temperatureValue.textContent = temperatureInput.value;
});

saveButton.addEventListener('click', saveOptions);


// Add a reference to the reset button
const resetButton = document.getElementById('reset');

async function resetOptions() {
  const { promptTemplate, temperature, model } = await getDefaultOptions();

  chrome.storage.sync.set(
    {
      promptTemplate,
      temperature,
      model,
    },
    function () {
      //alert('Options reset to defaults');
      loadOptions(); // Reload the options after resetting
    }
  );
}

async function getDefaultOptions() {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get("DEFAULT_OPTIONS", function (items) {
        resolve(items.DEFAULT_OPTIONS);
      });
    } else {
      reject(new Error("Chrome storage API is not available"));
    }
  });
}



// Add an event listener for the reset button
resetButton.addEventListener('click', resetOptions);

