
import { RecipeData, HowToStep } from '../types';

// Helper function to convert ISO 8601 duration to minutes
function isoDurationToMinutes(durationStr: string | null | undefined): number | null {
  if (!durationStr) return null;

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);

  if (!matches) return null;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10); // Seconds can be included for precision

  return hours * 60 + minutes + Math.round(seconds / 60); // Round seconds to nearest minute or just add if needed
}

// Helper function to parse servings string
interface ParsedServings {
  servings: number | null;
  servings_text: string;
}

function parseServings(yieldStr: string | null | undefined): ParsedServings {
  const defaultServingsText = yieldStr || "";
  if (!yieldStr) return { servings: null, servings_text: defaultServingsText };

  const match = yieldStr.match(/(\d+)/);
  const num = match ? parseInt(match[0], 10) : null;

  // Ensure servings_text does not exceed 32 characters
  const servingsText = yieldStr.length > 32 ? yieldStr.substring(0, 32) : yieldStr;

  return { servings: num, servings_text: servingsText };
}


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
  const apiUrl = `${sanitizedUrl.replace(/\/$/, '')}/api/recipe/`;

  // Initialize with Tandoor's default structure and map RecipeData
  const tandoorPayload: any = {
    name: recipeData.name || "Untitled Recipe",
    description: recipeData.description || null, // Per schema: string or null
    keywords: [], // Initialize as empty array, to be populated with objects
    steps: [],    // Initialize as empty array
    working_time: isoDurationToMinutes(recipeData.prepTime),
    waiting_time: isoDurationToMinutes(recipeData.cookTime),
    source_url: null, // Per schema: string or null
    internal: false,
    show_ingredient_overview: false,
    nutrition: { // Per schema: object or null. Sending object with nulls.
        carbohydrates: null,
        fats: null,
        proteins: null,
        calories: null,
        source: "" // Assuming empty string is fine for source if null
    },
    properties: [], // Per schema: Array of objects
    servings: null, 
    file_path: "", // Per schema: string. Max 512. Empty string is fine.
    servings_text: "", 
    private: false,
    shared: [] // Per schema: Array of objects
  };
   // Ensure name does not exceed 128 characters
  if (tandoorPayload.name.length > 128) {
    tandoorPayload.name = tandoorPayload.name.substring(0, 128);
  }
   // Ensure description does not exceed 512 characters
  if (tandoorPayload.description && tandoorPayload.description.length > 512) {
    tandoorPayload.description = tandoorPayload.description.substring(0, 512);
  }

  // Populate steps
  if (recipeData.recipeInstructions && Array.isArray(recipeData.recipeInstructions)) {
    tandoorPayload.steps = recipeData.recipeInstructions.map((instruction: string | HowToStep) => {
      let text = "";
      if (typeof instruction === 'string') {
        text = instruction;
      } else if (typeof instruction === 'object' && instruction.text) { // HowToStep
        text = instruction.text;
      } else {
        text = String(instruction);
      }
      return { text: text }; // Tandoor expects objects for steps like { "text": "Instruction text" }
    }).filter(step => step.text.trim() !== "");
  }
  // Ensure steps is present as an empty array if no instructions
  if (!tandoorPayload.steps || tandoorPayload.steps.length === 0) {
     tandoorPayload.steps = [];
  }


  // Populate servings
  const parsedServingsData = parseServings(recipeData.recipeYield);
  tandoorPayload.servings = parsedServingsData.servings;
  tandoorPayload.servings_text = parsedServingsData.servings_text;

  // Populate keywords - Tandoor expects an array of objects: { "name": "keyword_name" }
  const keywordsSet = new Set<string>();
  if (recipeData.keywords && typeof recipeData.keywords === 'string') {
    recipeData.keywords.split(',').forEach(kw => {
      const trimmedKw = kw.trim();
      if (trimmedKw) keywordsSet.add(trimmedKw);
    });
  }
  if (recipeData.recipeCategory) {
     const trimmedCat = recipeData.recipeCategory.trim();
     if (trimmedCat) keywordsSet.add(trimmedCat);
  }
  if (recipeData.recipeCuisine) {
    const trimmedCui = recipeData.recipeCuisine.trim();
    if (trimmedCui) keywordsSet.add(trimmedCui);
  }
  tandoorPayload.keywords = Array.from(keywordsSet).map(kw => ({ name: kw }));
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(tandoorPayload),
    });

    if (!response.ok) {
      let errorMessage = `Tandoor API request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${(Array.isArray(errors) ? errors.join(', ') : String(errors))}`)
            .join('; ');
          if (fieldErrors) {
            errorMessage += ` Details: {${fieldErrors}}`;
          } else if (errorData.detail) { 
             errorMessage += ` Details: ${errorData.detail}`;
          } else { 
             errorMessage += ` Details: ${JSON.stringify(errorData)}`;
          }
        } else { 
          errorMessage += ` Details: ${String(errorData)}`;
        }
      } catch (e) {
         const responseText = await response.text().catch(() => '');
         errorMessage += ` Could not parse error response body. Response: ${responseText || '(empty response)'}`;
      }
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication failed. Please check your Tandoor API Key.';
      } else if (response.status === 400) {
        // errorMessage is already constructed with details for 400 errors.
      } else if (response.status === 404) {
        errorMessage = 'Tandoor API endpoint not found. Please check the Tandoor Instance URL.';
      }
      throw new Error(errorMessage);
    }

  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) { 
        throw new Error(`Network error or Tandoor instance unreachable. Check URL and CORS settings on your Tandoor instance if this is a self-hosted setup. Original: ${error.message}`);
    }
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(`An unexpected error occurred during Tandoor export: ${String(error)}`);
  }
}
