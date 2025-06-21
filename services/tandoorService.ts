import { RecipeData } from '../types';

export async function exportToTandoor(
  tandoorBaseUrl: string,
  apiKey: string,
  recipeData: RecipeData
): Promise<void> {
  // Validate and sanitize the base URL
  let sanitizedUrl = tandoorBaseUrl.trim();
  if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
    throw new Error('Invalid Tandoor URL: Must start with http:// or https://');
  }
  // Remove trailing slash if present, then append the API path
  const apiUrl = `${sanitizedUrl.replace(/\/$/, '')}/api/recipe/`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(recipeData),
    });

    if (!response.ok) {
      let errorMessage = `Tandoor API request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        // Tandoor often returns error details in a 'detail' field or directly as object key-value pairs
        if (errorData.detail) {
          errorMessage += ` Details: ${errorData.detail}`;
        } else if (Object.keys(errorData).length > 0) {
           errorMessage += ` Details: ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        // If parsing error data fails, stick with the status code
         errorMessage += ` Could not parse error response body. Response text: ${await response.text().catch(() => '')}`;
      }
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication failed. Please check your Tandoor API Key.';
      } else if (response.status === 400) {
        errorMessage = `Invalid recipe data or request. Tandoor reported: ${errorMessage.substring(errorMessage.indexOf('Details:') !== -1 ? errorMessage.indexOf('Details:') : errorMessage.length)}`;
      } else if (response.status === 404) {
        errorMessage = 'Tandoor API endpoint not found. Please check the Tandoor Instance URL.';
      }
      throw new Error(errorMessage);
    }

    // Optionally, check response body for success confirmation if Tandoor API provides one
    // const responseData = await response.json();
    // console.log("Tandoor export successful:", responseData);

  } catch (error) {
    if (error instanceof TypeError) { // Network error or CORS issue usually
        throw new Error(`Network error or Tandoor instance unreachable. Check URL and CORS settings on your Tandoor instance if this is a self-hosted setup. Original: ${error.message}`);
    }
    // Re-throw if it's already a custom error, or wrap generic errors
    throw error;
  }
}
