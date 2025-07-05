Cyberask
Cyberask is a robust and feature-rich HTTP client designed as a powerful alternative to traditional libraries like Axios. Built on the native Fetch API, it offers advanced features like automatic request retries and intelligent network retry logic, ensuring your applications remain resilient and reliable even in challenging network conditions.

✨ Features
Automatic Request Retries: Configurable retries for failed requests (e.g., server errors).

Intelligent Network Retry Logic: Automatically retries on common network-related errors (e.g., connection issues, timeouts).

Configurable Parameters: Easily set maxRetries, retryDelay, exponentialBackoff, retryStatusCodes, and timeout.

Framework Agnostic: Works seamlessly in any JavaScript environment – Node.js, React, Angular, Vue, or plain browser JavaScript.

Lightweight & Dependency-Free: No external dependencies, keeping your bundle size minimal.

Comprehensive HTTP Methods: Supports GET, POST, PUT, DELETE, PATCH, HEAD, and OPTIONS.

Clear Error Handling: Provides detailed error objects for network issues, HTTP errors, and timeouts.

🚀 Installation
Install Cyberask using npm:

npm install cyberask

📚 Usage
Cyberask provides a straightforward API for making HTTP requests.

Basic GET Request
const Cyberask = require('cyberask'); // For Node.js (CommonJS)
// import Cyberask from 'cyberask'; // For ES Modules (with bundler)

const cyberask = new Cyberask({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 5000 // 5 seconds timeout for all requests
});

async function fetchData() {
    try {
        const response = await cyberask.get('/posts/1');
        console.log('GET Success:', response.data);
        console.log('Status:', response.status);
    } catch (error) {
        console.error('GET Error:', error.message);
        console.error('Error Type:', error.type); // e.g., 'NETWORK_ERROR', 'HTTP_ERROR'
        if (error.status) console.error('HTTP Status:', error.status);
    }
}

fetchData();

POST Request
const Cyberask = require('cyberask');
const cyberask = new Cyberask(); // No baseURL set, using full URL

async function createPost() {
    try {
        const newPost = {
            title: 'Cyberask New Post',
            body: 'This is a post created using Cyberask.',
            userId: 1,
        };
        const response = await cyberask.post('https://jsonplaceholder.typicode.com/posts', newPost);
        console.log('POST Success:', response.data);
        console.log('Status:', response.status);
    } catch (error) {
        console.error('POST Error:', error.message);
    }
}

createPost();

PUT Request
const Cyberask = require('cyberask');
const cyberask = new Cyberask();

async function updatePost() {
    try {
        const updatedData = {
            id: 1,
            title: 'Cyberask Updated Title',
            body: 'This post has been updated.',
            userId: 1,
        };
        const response = await cyberask.put('https://jsonplaceholder.typicode.com/posts/1', updatedData);
        console.log('PUT Success:', response.data);
    } catch (error) {
        console.error('PUT Error:', error.message);
    }
}

updatePost();

DELETE Request
const Cyberask = require('cyberask');
const cyberask = new Cyberask();

async function deletePost() {
    try {
        const response = await cyberask.delete('https://jsonplaceholder.typicode.com/posts/1');
        console.log('DELETE Success:', response.data); // Often returns empty object or success status
    } catch (error) {
        console.error('DELETE Error:', error.message);
    }
}

deletePost();

Advanced Configuration (Retries & Timeout)
const Cyberask = require('cyberask');

const resilientClient = new Cyberask({
    baseURL: 'https://api.example.com',
    maxRetries: 5,            // Retry up to 5 times
    retryDelay: 2000,         // Start with 2-second delay
    exponentialBackoff: true, // Double delay on each retry (2s, 4s, 8s...)
    retryStatusCodes: [500, 502, 503, 504], // Retry on these server errors
    retryOnNetworkError: true, // Retry on network issues (e.g., 'Failed to fetch')
    timeout: 15000            // 15 seconds overall timeout for each attempt
});

async function makeResilientRequest() {
    try {
        const response = await resilientClient.get('/data');
        console.log('Resilient GET Success:', response.data);
    } catch (error) {
        console.error('Resilient GET Failed:', error.message);
        console.error('Error Type:', error.type);
    }
}

makeResilientRequest();

🤝 Contributing
Contributions are welcome! If you find a bug or have a feature request, please open an issue on the GitHub repository.

📄 License
Cyberask is MIT licensed.