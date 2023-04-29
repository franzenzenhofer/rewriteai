addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {

const apiKey = API_KEY; // get the value of the API_KEY key


  const url = new URL(request.url)

  // Construct the URL for the OpenAI chat completions API
  const apiUrl = 'https://api.openai.com/v1/chat/completions'

  // Extract the request body and parse it as JSON
  const requestBody = await request.json()

  // Add the API key to the request headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }

  // Create a new request to the OpenAI API with the modified headers and body
  const apiRequest = new Request(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  })

  // Fetch the response from the OpenAI API
  const response = await fetch(apiRequest)

  return response
}
