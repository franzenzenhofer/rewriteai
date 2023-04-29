const apiKeyInput = document.getElementById('apiKey');
const promptTemplateInput = document.getElementById('prompt-template');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');
const modelInput = document.getElementById('model');
const saveButton = document.getElementById('save');

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
  chrome.storage.sync.get(['apiKey', 'promptTemplate', 'temperature', 'model'], async function (data) {
    apiKeyInput.value = data.apiKey || '';
    promptTemplateInput.value = data.promptTemplate || 'Rewrite the following text, making it better as if a professional website editor did it. Preserve any HTML structure if present. If there are links in there, keep the links. You can add bullet points if it fits the topic. Respond in the same language as the original text, and return approximately the same amount of text received. If you got a short headline or sentence, don\'t turn it into a paragraph:';
    temperatureInput.value = data.temperature || 0.7;
    temperatureValue.textContent = temperatureInput.value;

    if (apiKeyInput.value) {
      const availableModels = await fetchAvailableModels(apiKeyInput.value);
      updateModelSelectBox(availableModels, data.model);
    } else {
      updateModelSelectBox([], data.model);
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
    alert('Options saved');
  });
}

document.addEventListener('DOMContentLoaded', loadOptions);

temperatureInput.addEventListener('input', () => {
  temperatureValue.textContent = temperatureInput.value;
});

saveButton.addEventListener('click', saveOptions);


// Add a reference to the reset button
const resetButton = document.getElementById('reset');

// Add a function to reset the options
function resetOptions() {
  const defaultPromptTemplate =
    'Rewrite the following text, making it better as if a professional website editor did it. Preserve any HTML structure if present. If there are links in there, keep the links. You can add bullet points if it fits the topic. Respond in the same language as the original text, and return approximately the same amount of text received. If you got a short headline or sentence, don\'t turn it into a paragraph:';
  const defaultTemperature = 0.7;
  const defaultModel = 'gpt-3.5-turbo';

  chrome.storage.sync.set(
    {
      promptTemplate: defaultPromptTemplate,
      temperature: defaultTemperature,
      model: defaultModel,
    },
    function () {
      alert('Options reset to defaults');
      loadOptions(); // Reload the options after resetting
    }
  );
}

// Add an event listener for the reset button
resetButton.addEventListener('click', resetOptions);

