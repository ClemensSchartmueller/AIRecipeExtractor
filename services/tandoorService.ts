
import { RecipeData, HowToStep } from '../types';

// Helper function to convert ISO 8601 duration to minutes
function isoDurationToMinutes(durationStr: string | null | undefined): number | null {
  if (!durationStr) return null;

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);

  if (!matches) return null;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  let totalMinutes = hours * 60 + minutes;
  if (seconds > 0) { // Consider seconds for rounding or if they constitute a significant portion
      totalMinutes += Math.round(seconds / 60);
  }
  return totalMinutes > 0 ? totalMinutes : null; // Return null if total minutes is 0 and no time was specified
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

  const servingsText = defaultServingsText.length > 32 ? defaultServingsText.substring(0, 32) : defaultServingsText;

  return { servings: num, servings_text: servingsText };
}


export async function exportToTandoor(
  tandoorBaseUrl: string,
  apiKey: string,
  recipeData: RecipeData
): Promise<void> {
  let sanitizedUrl = tandoorBaseUrl.trim();
  if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
    throw new Error('Invalid Tandoor URL: Must start with http:// or https://');
  }
  const apiUrl = `${sanitizedUrl.replace(/\/$/, '')}/api/recipe/`;

  // Base payload structure
  const tandoorPayload: { [key: string]: any } = {
    name: (recipeData.name || "Untitled Recipe").substring(0, 128),
    description: recipeData.description ? recipeData.description.substring(0, 512) : null,
    keywords: [],
    steps: [],
    source_url: null, 
    internal: false,
    show_ingredient_overview: false, // Default from Tandoor empty example
    nutrition: { // Default numeric values, aligning with Tandoor example for numbers
        carbohydrates: 0,
        fats: 0,
        proteins: 0,
        calories: 0,
        source: ""
    },
    properties: [],
    file_path: "", // Default from Tandoor empty example
    private: false, // Default from Tandoor empty example
    shared: [] // Default from Tandoor empty example
  };

  const workingTime = isoDurationToMinutes(recipeData.prepTime);
  if (workingTime !== null) {
    tandoorPayload.working_time = workingTime;
  }

  const waitingTime = isoDurationToMinutes(recipeData.cookTime);
  if (waitingTime !== null) {
    tandoorPayload.waiting_time = waitingTime;
  }
  
  if (recipeData.recipeInstructions && Array.isArray(recipeData.recipeInstructions)) {
    tandoorPayload.steps = recipeData.recipeInstructions.map((instructionItem: string | HowToStep, index: number) => {
      let instructionText = "";
      if (typeof instructionItem === 'string') {
        instructionText = instructionItem;
      } else if (typeof instructionItem === 'object' && instructionItem.text) {
        instructionText = instructionItem.text;
      } else {
        instructionText = String(instructionItem); 
      }
      
      const stepObject: { [key: string]: any } = {
        name: "", 
        type: "TEXT", // Added based on Tandoor "Beef Madras Tostadas" example
        instruction: instructionText,
        ingredients: [], 
        time: 0, // Added based on Tandoor "Beef Madras Tostadas" example (integer)
        order: index,    
        show_as_header: false, // Default, not in "Beef Madras Tostadas" step items but common
        // show_ingredients_table: false, // Removed as it's not in the "Beef Madras Tostadas" step example
      };
      return stepObject;
    }).filter(step => step.instruction.trim() !== "");
  }

  if (!tandoorPayload.steps || tandoorPayload.steps.length === 0) {
     tandoorPayload.steps = [{ 
        name: "",
        type: "TEXT",
        instruction: "No instructions provided.",
        ingredients: [],
        time: 0,
        order: 0,
        show_as_header: false,
     }];
  }

  // Add all ingredients to the first step, matching "Beef Madras Tostadas" example structure for ingredients
  if (tandoorPayload.steps.length > 0 && recipeData.recipeIngredient && Array.isArray(recipeData.recipeIngredient)) {
    recipeData.recipeIngredient.forEach((ingredientString, index) => {
        // Basic heuristic for potential headers (e.g., "For the sauce:")
        // This is very simple; more robust parsing would be needed for complex cases.
        const isLikelyHeader = /^(For the .*?:|Sauce:|Marinade:|Dressing:)/i.test(ingredientString.trim()) || ingredientString.trim().endsWith(':');

        let tandoorIngredient;
        if (isLikelyHeader) {
            tandoorIngredient = {
                food: null, // As per Tandoor example for headers
                unit: { name: "g", description: null }, // Example default unit for headers
                amount: "0", // Example default amount for headers
                note: ingredientString.trim(), // Header text goes into note
                order: index,
                is_header: true,
                no_amount: false, // Example headers had no_amount: false
            };
        } else {
            tandoorIngredient = {
                food: { 
                    name: ingredientString.substring(0, 128).trim(),
                    ignore_shopping: false, // Default from Tandoor "Beef Madras Tostadas" example
                    supermarket_category: null // Default from Tandoor "Beef Madras Tostadas" example
                },
                unit: { 
                    name: "g", // Placeholder unit name from example
                    description: null 
                },
                amount: "0", // String "0" as per Tandoor example for listed items
                note: "", 
                order: index, 
                is_header: false, 
                no_amount: true, // Since amount "0" is a placeholder for an unparsed amount
            };
        }
        tandoorPayload.steps[0].ingredients.push(tandoorIngredient);
    });
  }


  const parsedServingsData = parseServings(recipeData.recipeYield);
  if (parsedServingsData.servings !== null) {
    tandoorPayload.servings = parsedServingsData.servings;
  }
  tandoorPayload.servings_text = parsedServingsData.servings_text;


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
  tandoorPayload.keywords = Array.from(keywordsSet).map(kw => ({ name: kw.substring(0, 128), description: "" }));
  
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
            .map(([field, errors]) => {
                if (typeof errors === 'object' && !Array.isArray(errors)) { 
                    return `${field}: { ${Object.entries(errors).map(([k,v]) => `${k}: ${v}`).join(', ')} }`;
                }
                return `${field}: ${(Array.isArray(errors) ? errors.join(', ') : String(errors))}`;
            })
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