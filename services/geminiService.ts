import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { RecipeData } from "../types"; // Assuming RecipeData type

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const TEXT_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const IMAGE_MODEL_NAME = 'imagen-3.0-generate-002';

function ensureApiKey() {
  if (!process.env.API_KEY) {
    console.error("Gemini API Key is not configured.");
    throw new Error("Gemini API Error: API Key is not configured. Please ensure process.env.API_KEY is set in the environment.");
  }
}

export async function extractRecipeFromImage(imageBase64: string, mimeType: string): Promise<RecipeData> {
  ensureApiKey();

  try {
    const imagePart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };

    const textPart: Part = {
      text: `Analyze the provided image, which contains a cooking recipe. Extract the recipe details and structure them as a JSON object adhering to the schema.org/Recipe format.
The JSON object MUST include '@context': 'http://schema.org' and '@type': 'Recipe'.

Essential fields to extract:
- name: The title of the recipe. If not found, use "Untitled Recipe".
- recipeIngredient: An array of strings, where each string is a single ingredient with its quantity and unit. If none found, use an empty array.
- recipeInstructions: An array of strings, where each string is a distinct step in the cooking process. If none found, use an empty array. Consider that instructions might be presented as a list of HowToStep objects (e.g. { "@type": "HowToStep", "text": "Instruction text" }); if so, extract the 'text' property of each step into the array.

Optional fields to extract if clearly identifiable from the image:
- description: A brief summary of the recipe.
- prepTime: Preparation time in ISO 8601 duration format (e.g., 'PT30M' for 30 minutes).
- cookTime: Cooking time in ISO 8601 duration format (e.g., 'PT1H' for 1 hour).
- recipeYield: Number of servings (e.g., '4 servings').
- recipeCategory: Category (e.g., 'Dessert', 'Main Course').
- recipeCuisine: Cuisine type (e.g., 'Italian', 'Mexican').
- keywords: A string of comma-separated keywords.
- dishImageDescription: If the screenshot contains a clear visual of the final prepared dish itself, provide a concise visual description of this dish suitable for an image generation model (e.g., "A stack of fluffy pancakes with syrup and berries", "A close-up of a rich chocolate lava cake with oozing center"). If no clear dish image is present or identifiable, set this field to null.

If any optional fields cannot be reliably extracted, omit them or set their value to null.
Ensure the output is ONLY a single, valid JSON object. Do not include any explanatory text or markdown formatting outside of the JSON structure itself.
If no discernible recipe is found, return a JSON object with name "No Recipe Found", empty arrays for recipeIngredient and recipeInstructions, and null for dishImageDescription.
Example for instructions: if image has "1. Preheat oven. 2. Mix ingredients.", output should be: "recipeInstructions": ["Preheat oven.", "Mix ingredients."]`
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
      }
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    try {
      const parsedData: RecipeData = JSON.parse(jsonStr);
      // Basic validation for core fields
      if (!parsedData['@context']) parsedData['@context'] = 'http://schema.org';
      if (!parsedData['@type']) parsedData['@type'] = 'Recipe';
      if (!parsedData.name) parsedData.name = "Untitled Recipe";
      if (!Array.isArray(parsedData.recipeIngredient)) parsedData.recipeIngredient = [];
      if (!Array.isArray(parsedData.recipeInstructions)) parsedData.recipeInstructions = [];
      if (parsedData.dishImageDescription === undefined) parsedData.dishImageDescription = null; // Ensure it's null if missing
      
      return parsedData;
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e, "Raw response:", jsonStr);
      throw new Error("The AI returned an invalid JSON format. The recipe might be too complex or the image unclear.");
    }

  } catch (error) {
    console.error("Error extracting recipe from image using Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes("api key") || error.message.toLowerCase().includes("api_key") || error.message.includes("quota")) {
             throw new Error(`Gemini API Error: ${error.message}. Please check your API key (process.env.API_KEY) and quota.`);
        }
         throw new Error(`Failed to extract recipe via AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI recipe extraction service.");
  }
}

export async function generateDishImage(description: string): Promise<{ base64Data: string; mimeType: string } | null> {
  ensureApiKey();
  if (!description || description.trim() === "") {
    return null;
  }

  try {
    const response = await ai.models.generateImages({
        model: IMAGE_MODEL_NAME,
        prompt: description + ", food photography, delicious, high quality, vibrant colors", // Enhance prompt for better results
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }, // Output JPEG for smaller size
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      return {
        base64Data: response.generatedImages[0].image.imageBytes,
        mimeType: response.generatedImages[0].image.mimeType || 'image/jpeg',
      };
    }
    console.warn("Image generation did not return any images for description:", description);
    return null;
  } catch (error) {
    console.error("Error generating dish image using Imagen API:", error);
    if (error instanceof Error) {
      // Avoid throwing and stopping the whole process, just return null
      // Or, rethrow a more specific error if needed for UI. For now, logging and returning null.
      // throw new Error(`Imagen API Error: ${error.message}. Please check your API key and quota.`);
       console.error(`Imagen API Error: ${error.message}. Image generation failed.`);
    } else {
       console.error("An unknown error occurred during image generation.");
    }
    return null; // Return null on error so the app can proceed without the image
  }
}