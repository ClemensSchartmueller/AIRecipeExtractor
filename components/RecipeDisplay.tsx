
import React, { useState, useCallback, useMemo } from 'react';
import { RecipeData, OutputFormat } from '../types';
import { formatRecipeJsonToText, downloadDataUrl } from '../utils/recipeUtils';
import { LoadingSpinner } from './LoadingSpinner'; // For dish image loading

interface RecipeDisplayProps {
  recipeData: RecipeData;
  format: OutputFormat;
  generatedDishImageUrl?: string | null;
  isGeneratingDishImage?: boolean;
  dishImageError?: string | null;
}

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
   <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// Helper function for clipboard operations
async function copyToClipboard(textToCopy: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, trying fallback:", err);
      // Fallthrough to legacy method if modern API fails
    }
  }

  // Fallback for older browsers or when navigator.clipboard fails/is unavailable
  const textArea = document.createElement("textarea");
  textArea.value = textToCopy;
  // Make the textarea non-editable and invisible
  textArea.style.position = "fixed"; // Stay in viewport
  textArea.style.top = "-9999px"; // Move off-screen top
  textArea.style.left = "-9999px"; // Move off-screen left
  textArea.setAttribute("readonly", ""); // Prevent keyboard popup on mobile

  document.body.appendChild(textArea);
  
  let success = false;
  try {
    textArea.select();
    // For mobile devices, setSelectionRange can be crucial
    textArea.setSelectionRange(0, textToCopy.length); 
    success = document.execCommand("copy");
    if (!success) {
      console.warn("document.execCommand('copy') returned false.");
    }
  } catch (err) {
    console.error("Fallback document.execCommand('copy') failed:", err);
    success = false;
  }

  document.body.removeChild(textArea);
  return success;
}


export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ 
    recipeData, 
    format, 
    generatedDishImageUrl, 
    isGeneratingDishImage,
    dishImageError
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const recipeTextForDisplay = useMemo(() => {
    if (format === 'text') {
      return formatRecipeJsonToText(recipeData);
    }
    return ''; 
  }, [recipeData, format]);

  const handleCopyText = useCallback(async () => {
    if (format === 'text' && recipeTextForDisplay) {
      const success = await copyToClipboard(recipeTextForDisplay);
      if (success) {
        setCopiedText(true);
        setCopiedJson(false); 
        setTimeout(() => setCopiedText(false), 2000);
      } else {
        alert("Failed to copy recipe text automatically. Please select the text and copy it manually.");
      }
    }
  }, [recipeTextForDisplay, format]);

  const handleCopyJson = useCallback(async () => {
    if (format === 'tandoorJson') {
      const jsonString = JSON.stringify(recipeData, null, 2);
      const success = await copyToClipboard(jsonString);
      if (success) {
        setCopiedJson(true);
        setCopiedText(false); 
        setTimeout(() => setCopiedJson(false), 2000);
      } else {
        alert("Failed to copy Tandoor JSON automatically. Please try selecting the text manually, or use the 'Show Raw JSON Data' option to select and copy.");
      }
    }
  }, [recipeData, format]);
  
  const handleDownloadDishImage = useCallback(() => {
    if (generatedDishImageUrl && recipeData.name) {
      const filename = `${recipeData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dish_image.jpeg`;
      downloadDataUrl(generatedDishImageUrl, filename);
    } else if (generatedDishImageUrl) {
        downloadDataUrl(generatedDishImageUrl, "generated_dish_image.jpeg");
    }
  }, [generatedDishImageUrl, recipeData.name]);

  const recipeName = recipeData.name || "Extracted Recipe";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-slate-800">
            {format === 'text' ? 'Extracted Recipe (Text):' : `Recipe: ${recipeName}`}
          </h2>
          {format === 'text' && (
            <button
              onClick={handleCopyText}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-50
                          ${copiedText 
                            ? 'bg-green-500 text-white focus:ring-green-400' 
                            : 'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-400'}`}
              disabled={!recipeTextForDisplay}
              aria-live="polite"
            >
              {copiedText ? <CheckIcon className="w-5 h-5 mr-2" /> : <CopyIcon className="w-5 h-5 mr-2" />}
              {copiedText ? 'Copied Text!' : 'Copy Text'}
            </button>
          )}
          {format === 'tandoorJson' && (
            <button
              onClick={handleCopyJson}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-50
                          ${copiedJson 
                            ? 'bg-green-500 text-white focus:ring-green-400' 
                            : 'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400'}`}
              aria-live="polite"
            >
              {copiedJson ? <CheckIcon className="w-5 h-5 mr-2" /> : <CopyIcon className="w-5 h-5 mr-2" />}
              {copiedJson ? 'Copied JSON!' : 'Copy Tandoor JSON'}
            </button>
          )}
        </div>

        {format === 'text' && recipeTextForDisplay && (
          <div className="bg-slate-50 p-4 sm:p-6 border border-slate-200 rounded-lg shadow-inner max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-sans">
              {recipeTextForDisplay}
            </pre>
          </div>
        )}

        {format === 'tandoorJson' && (
          <div className="space-y-4">
            <p className="text-slate-700">
              The recipe <strong className="text-teal-700">{recipeName}</strong> has been structured for Tandoor. Click the copy button to get the JSON-LD data for import.
            </p>
            <p className="text-sm text-slate-600">
              Ingredients found: {recipeData.recipeIngredient?.length || 0}. Steps found: {recipeData.recipeInstructions?.length || 0}.
            </p>
            {recipeData.description && <p className="text-sm text-slate-600">Description: {recipeData.description}</p>}
            
            <div>
              <button 
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-sm text-teal-600 hover:text-teal-700 underline focus:outline-none"
                aria-expanded={showRawJson}
              >
                {showRawJson ? 'Hide' : 'Show'} Raw JSON Data
              </button>
              {showRawJson && (
                <div className="mt-2 bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-inner max-h-[40vh] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-slate-700 text-xs font-mono" aria-label="Raw Tandoor JSON data">
                    {JSON.stringify(recipeData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(recipeData.dishImageDescription || isGeneratingDishImage || generatedDishImageUrl || dishImageError) && (
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-3">Illustrative Dish Image</h3>
          {isGeneratingDishImage && (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg shadow-sm">
              <LoadingSpinner />
              <p className="mt-3 text-sm text-slate-600">Generating dish image based on description...</p>
              {recipeData.dishImageDescription && <p className="mt-1 text-xs text-slate-500 italic">"{recipeData.dishImageDescription}"</p>}
            </div>
          )}
          {dishImageError && !isGeneratingDishImage && (
            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 rounded-md text-sm" role="alert">
                <p><strong className="font-semibold">Image Generation Note:</strong> {dishImageError}</p>
            </div>
          )}
          {generatedDishImageUrl && !isGeneratingDishImage && (
            <div className="space-y-3">
              <img 
                src={generatedDishImageUrl} 
                alt={recipeData.dishImageDescription || 'Generated dish image'} 
                className="rounded-lg shadow-lg w-full max-w-md mx-auto object-contain max-h-96" 
              />
              <button
                onClick={handleDownloadDishImage}
                className="flex items-center justify-center w-full sm:w-auto mx-auto px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 bg-indigo-500 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download Dish Image
              </button>
            </div>
          )}
          {!isGeneratingDishImage && !generatedDishImageUrl && !dishImageError && recipeData.dishImageDescription && (
             <p className="text-sm text-slate-500">Could not generate an image for "{recipeData.dishImageDescription}".</p>
          )}
           {!isGeneratingDishImage && !generatedDishImageUrl && !dishImageError && !recipeData.dishImageDescription && (
             <p className="text-sm text-slate-500">No specific dish image description was found in the recipe to generate an image from.</p>
          )}
        </div>
      )}
    </div>
  );
};
