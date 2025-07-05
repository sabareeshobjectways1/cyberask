/**
 * @file index.js
 * @description The main entry point for the Cyberask NPM package.
 * A robust HTTP client alternative to Axios with advanced retry features.
 * @version 1.0.0
 * @author Your Name (replace with your name/team)
 * @license MIT
 */

/**
 * @typedef {Object} CyberaskConfig
 * @property {string} [baseURL=''] - The base URL for requests.
 * @property {Object.<string, string>} [headers={}] - Custom headers to be sent with requests.
 * @property {number} [timeout=0] - Request timeout in milliseconds. 0 means no timeout.
 * @property {number} [maxRetries=3] - Maximum number of retries for failed requests.
 * @property {number} [retryDelay=1000] - Initial delay in milliseconds between retries.
 * @property {boolean} [exponentialBackoff=true] - Whether to use exponential backoff for retry delays.
 * @property {number[]} [retryStatusCodes=[500, 502, 503, 504]] - HTTP status codes that trigger a retry.
 * @property {boolean} [retryOnNetworkError=true] - Whether to retry on network-related errors (e.g., connection issues).
 */

/**
 * @typedef {Object} CyberaskResponse
 * @property {*} data - The response body parsed as JSON or text.
 * @property {number} status - The HTTP status code of the response.
 * @property {string} statusText - The HTTP status message of the response.
 * @property {Headers} headers - The response headers.
 * @property {Request} request - The original Request object.
 * @property {Response} rawResponse - The raw Fetch API Response object.
 */

/**
 * @typedef {Object} CyberaskError
 * @property {string} message - A descriptive error message.
 * @property {number} [status] - The HTTP status code if available.
 * @property {*} [data] - The response data if available (e.g., error message from server).
 * @property {string} [type] - The type of error (e.g., 'NETWORK_ERROR', 'HTTP_ERROR', 'TIMEOUT_ERROR').
 * @property {Error} [originalError] - The original error object, if any.
 */

class Cyberask {
    /**
     * Creates an instance of Cyberask.
     * @param {CyberaskConfig} [defaultConfig={}] - Default configuration for all requests made by this instance.
     */
    constructor(defaultConfig = {}) {
        /** @type {CyberaskConfig} */
        this.defaults = {
            baseURL: '',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 0, // No timeout by default
            maxRetries: 3,
            retryDelay: 1000, // 1 second
            exponentialBackoff: true,
            retryStatusCodes: [500, 502, 503, 504], // Common server errors
            retryOnNetworkError: true,
            ...defaultConfig
        };
    }

    /**
     * Merges the default configuration with the provided request-specific configuration.
     * @param {RequestInit} [config={}] - Request-specific configuration.
     * @returns {RequestInit & CyberaskConfig} The merged configuration.
     * @private
     */
    _mergeConfig(config) {
        return {
            ...this.defaults,
            ...config,
            headers: {
                ...this.defaults.headers,
                ...(config.headers || {})
            }
        };
    }

    /**
     * Handles parsing the response body based on content type.
     * @param {Response} response - The Fetch API Response object.
     * @returns {Promise<*>} The parsed response data.
     * @private
     */
    async _parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (e) {
                // If JSON parsing fails, return as text
                return await response.text();
            }
        }
        return await response.text();
    }

    /**
     * Creates a CyberaskError object.
     * @param {string} message - The error message.
     * @param {string} type - The type of error.
     * @param {number} [status] - The HTTP status code.
     * @param {*} [data] - The response data if available.
     * @param {Error} [originalError] - The original error object.
     * @returns {CyberaskError}
     * @private
     */
    _createError(message, type, status, data, originalError) {
        const error = new Error(message);
        error.status = status;
        error.data = data;
        error.type = type;
        error.originalError = originalError;
        return /** @type {CyberaskError} */ (error);
    }

    /**
     * Performs an HTTP request with retry logic.
     * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
     * @param {string} url - The URL for the request.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>} A promise that resolves with the response data or rejects with an error.
     */
    async request(method, url, config = {}) {
        const mergedConfig = this._mergeConfig(config);
        const fullUrl = mergedConfig.baseURL ? `${mergedConfig.baseURL}${url}` : url;
        let retriesLeft = mergedConfig.maxRetries;
        let currentRetryDelay = mergedConfig.retryDelay;

        while (retriesLeft >= 0) {
            try {
                const controller = new AbortController();
                const timeoutId = mergedConfig.timeout > 0 ? setTimeout(() => controller.abort(), mergedConfig.timeout) : null;

                const fetchOptions = {
                    method,
                    headers: mergedConfig.headers,
                    body: mergedConfig.body,
                    signal: controller.signal,
                    ...config // Allow overriding other fetch options
                };

                // For GET and HEAD requests, body should not be set
                if (method === 'GET' || method === 'HEAD') {
                    delete fetchOptions.body;
                } else if (fetchOptions.body && typeof fetchOptions.body !== 'string' && !(fetchOptions.body instanceof FormData)) {
                    // Automatically stringify JSON body if not already a string or FormData
                    fetchOptions.body = JSON.stringify(fetchOptions.body);
                }

                const response = await fetch(fullUrl, fetchOptions);

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                const responseData = await this._parseResponse(response);

                if (!response.ok) {
                    // HTTP error (4xx, 5xx)
                    const error = this._createError(
                        `Request failed with status ${response.status}`,
                        'HTTP_ERROR',
                        response.status,
                        responseData,
                        null
                    );

                    // Check if status code is in retry list
                    if (mergedConfig.retryStatusCodes.includes(response.status) && retriesLeft > 0) {
                        console.warn(`Cyberask: Retrying request to ${fullUrl} (status: ${response.status}). Retries left: ${retriesLeft}`);
                        await new Promise(resolve => setTimeout(resolve, currentRetryDelay));
                        if (mergedConfig.exponentialBackoff) {
                            currentRetryDelay *= 2;
                        }
                        retriesLeft--;
                        continue; // Try again
                    } else {
                        throw error; // No more retries or not a retryable status
                    }
                }

                return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    request: fetchOptions,
                    rawResponse: response
                };

            } catch (error) {
                // Network error, timeout, or other unexpected errors
                let cyberaskError;
                if (error.name === 'AbortError') {
                    cyberaskError = this._createError(
                        `Request timed out after ${mergedConfig.timeout}ms`,
                        'TIMEOUT_ERROR',
                        null,
                        null,
                        error
                    );
                } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                    // Common network error in browsers
                    cyberaskError = this._createError(
                        `Network error: ${error.message}`,
                        'NETWORK_ERROR',
                        null,
                        null,
                        error
                    );
                } else if (error.message && error.message.includes('Network request failed')) {
                    // Common network error in Node.js (if using a fetch polyfill)
                    cyberaskError = this._createError(
                        `Network error: ${error.message}`,
                        'NETWORK_ERROR',
                        null,
                        null,
                        error
                    );
                } else if (error.type) {
                    // This is already a CyberaskError from a non-retryable HTTP status
                    throw error;
                } else {
                    // Other unexpected errors
                    cyberaskError = this._createError(
                        `An unexpected error occurred: ${error.message}`,
                        'UNKNOWN_ERROR',
                        null,
                        null,
                        error
                    );
                }

                // Check if it's a network error and retries are allowed
                if (mergedConfig.retryOnNetworkError && cyberaskError.type === 'NETWORK_ERROR' && retriesLeft > 0) {
                    console.warn(`Cyberask: Retrying request to ${fullUrl} (network error). Retries left: ${retriesLeft}`);
                    await new Promise(resolve => setTimeout(resolve, currentRetryDelay));
                    if (mergedConfig.exponentialBackoff) {
                        currentRetryDelay *= 2;
                    }
                    retriesLeft--;
                    continue; // Try again
                } else {
                    throw cyberaskError; // No more retries or not a retryable error type
                }
            }
        }
        // Should not reach here if maxRetries is non-negative, but as a fallback
        throw this._createError('Max retries exhausted without success.', 'MAX_RETRIES_EXHAUSTED');
    }

    /**
     * Performs a GET request.
     * @param {string} url - The URL for the request.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    get(url, config = {}) {
        return this.request('GET', url, config);
    }

    /**
     * Performs a POST request.
     * @param {string} url - The URL for the request.
     * @param {*} [data] - The data to be sent in the request body.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    post(url, data, config = {}) {
        return this.request('POST', url, { ...config, body: data });
    }

    /**
     * Performs a PUT request.
     * @param {string} url - The URL for the request.
     * @param {*} [data] - The data to be sent in the request body.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    put(url, data, config = {}) {
        return this.request('PUT', url, { ...config, body: data });
    }

    /**
     * Performs a DELETE request.
     * @param {string} url - The URL for the request.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    delete(url, config = {}) {
        return this.request('DELETE', url, config);
    }

    /**
     * Performs a PATCH request.
     * @param {string} url - The URL for the request.
     * @param {*} [data] - The data to be sent in the request body.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    patch(url, data, config = {}) {
        return this.request('PATCH', url, { ...config, body: data });
    }

    /**
     * Performs a HEAD request.
     * @param {string} url - The URL for the request.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    head(url, config = {}) {
        return this.request('HEAD', url, config);
    }

    /**
     * Performs an OPTIONS request.
     * @param {string} url - The URL for the request.
     * @param {RequestInit} [config={}] - Request configuration.
     * @returns {Promise<CyberaskResponse>}
     */
    options(url, config = {}) {
        return this.request('OPTIONS', url, config);
    }

    /**
     * Creates a new Cyberask instance with a custom configuration that extends the current instance's defaults.
     * Useful for creating instances with specific base URLs or headers.
     * @param {CyberaskConfig} config - The configuration for the new instance.
     * @returns {Cyberask} A new Cyberask instance.
     */
    create(config) {
        return new Cyberask({ ...this.defaults, ...config });
    }
}

// Export the Cyberask class for use as an NPM package.
// This makes it easy to import/require in other JavaScript files.
module.exports = Cyberask;
