// types.ts

export type OutputFormat = 'text' | 'tandoorJson';

// Based on schema.org/Recipe, tailored for Tandoor import and Gemini extraction
export interface RecipeData {
  '@context'?: string; // Should be "http://schema.org"
  '@type'?: string;    // Should be "Recipe"
  name?: string;
  description?: string | null;
  recipeIngredient?: string[]; // Array of ingredient strings
  recipeInstructions?: (string | HowToStep)[]; // Array of instruction strings or HowToStep objects
  prepTime?: string | null;    // ISO 8601 duration, e.g., "PT30M"
  cookTime?: string | null;    // ISO 8601 duration, e.g., "PT1H"
  recipeYield?: string | null; // e.g., "4 servings"
  recipeCategory?: string | null; // e.g., "Dessert"
  recipeCuisine?: string | null;  // e.g., "Italian"
  keywords?: string | null;       // Comma-separated string or array of strings
  image?: string | ImageObject | null; // URL or ImageObject
  dishImageDescription?: string | null; // Visual description of the dish for image generation
  // Tandoor might also use other fields, but these are primary for extraction
}

export interface HowToStep {
  '@type': 'HowToStep';
  text: string;
  // Potentially other HowToStep properties like name, url, image
}

export interface ImageObject {
  '@type': 'ImageObject';
  url?: string;
  caption?: string;
  // Other ImageObject properties
}