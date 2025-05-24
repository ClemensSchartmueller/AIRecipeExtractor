
import { RecipeData, HowToStep } from '../types';

export function formatRecipeJsonToText(recipeData: RecipeData): string {
  if (!recipeData) return "No recipe data available.";

  let text = "";

  if (recipeData.name && recipeData.name !== "Untitled Recipe" && recipeData.name !== "No Recipe Found") {
    text += `${recipeData.name}\n`;
  } else if (recipeData.name === "No Recipe Found") {
    return "No recipe could be identified in the image.";
  }


  if (recipeData.description) {
    text += `\nDescription: ${recipeData.description}\n`;
  }

  if (recipeData.recipeYield) {
    text += `\nYield: ${recipeData.recipeYield}\n`;
  }
  if (recipeData.prepTime) {
    text += `Prep Time: ${formatIsoDuration(recipeData.prepTime)}\n`;
  }
  if (recipeData.cookTime) {
    text += `Cook Time: ${formatIsoDuration(recipeData.cookTime)}\n`;
  }
  if (recipeData.recipeCategory) {
    text += `Category: ${recipeData.recipeCategory}\n`;
  }
  if (recipeData.recipeCuisine) {
    text += `Cuisine: ${recipeData.recipeCuisine}\n`;
  }


  if (recipeData.recipeIngredient && recipeData.recipeIngredient.length > 0) {
    text += "\nIngredients:\n";
    recipeData.recipeIngredient.forEach(ingredient => {
      text += `- ${ingredient}\n`;
    });
  } else {
     if (recipeData.name !== "No Recipe Found") text += "\nNo ingredients found.\n";
  }

  if (recipeData.recipeInstructions && recipeData.recipeInstructions.length > 0) {
    text += "\nInstructions:\n";
    recipeData.recipeInstructions.forEach((instruction, index) => {
      if (typeof instruction === 'string') {
        text += `${index + 1}. ${instruction}\n`;
      } else if (typeof instruction === 'object' && instruction.text) { // HowToStep
        text += `${index + 1}. ${instruction.text}\n`;
      }
    });
  } else {
    if (recipeData.name !== "No Recipe Found") text += "\nNo instructions found.\n";
  }
  
  if (recipeData.keywords) {
    text += `\nKeywords: ${recipeData.keywords}\n`
  }

  return text.trim();
}

// Renamed from downloadJson to be more generic, as it was downloading stringified JSON.
// However, for actual Tandoor JSON, copying to clipboard is preferred. This function might be less used now.
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const dataString = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  const link = document.createElement("a");
  link.href = dataString;
  link.download = filename;
  link.click();
  link.remove();
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
  link.remove();
}


function formatIsoDuration(isoDuration: string | null | undefined): string {
  if (!isoDuration) return "";
  // Basic parsing for PTxHxMxS format, can be expanded
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return isoDuration; // Return original if not parsable by this basic regex

  const hours = parseInt(matches[1] || "0");
  const minutes = parseInt(matches[2] || "0");
  // const seconds = parseInt(matches[3] || "0"); // Seconds not usually primary for recipes

  let formatted = "";
  if (hours > 0) formatted += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) formatted += `${minutes} minute${minutes > 1 ? 's' : ''} `;
  
  return formatted.trim() || isoDuration; // Fallback to original if parsing results in empty
}