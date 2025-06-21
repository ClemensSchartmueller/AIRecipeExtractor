import React, { useState, useCallback, useMemo } from 'react';
import { RecipeData, OutputFormat } from '../types';
import { formatRecipeJsonToText, downloadDataUrl } from '../utils/recipeUtils';
import { LoadingSpinner } from './LoadingSpinner'; // For dish image loading
import { TandoorExportModal } from './TandoorExportModal'; // New Modal
import { exportToTandoor } from '../services/tandoorService'; // New Service

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

const ExportIcon: React.FC<{ className?: string }> = ({ className }) => ( // New Icon for Export
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
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
  const [isTandoorModalOpen, setIsTandoorModalOpen] = useState(false);

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

  const handleOpenTandoorModal = () => {
    setIsTandoorModalOpen(true);
  };

  const handleExportToTandoor = async (tandoorUrl: string, apiKey: string) => {
    if (!recipeData) {
      throw new Error("No recipe data available to export.");
    }
    await exportToTandoor(tandoorUrl, apiKey, recipeData);
    // On success, the modal will show a message and can be closed by the user or auto-close.
  };


  const recipeName = recipeData.name || "Extracted Recipe";

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-2xl font-semibold text-slate-800">
              {format === 'text' ? 'Extracted Recipe (Text):' : `Recipe: ${recipeName}`}
            </h2>
            <div className="flex space-x-2">
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
                <>
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
                  <button
                    onClick={handleOpenTandoorModal}
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 bg-purple-500 text-white hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
                    title="Export to Tandoor instance"
                    aria-label="Export to Tandoor instance"
                  >
                    <ExportIcon className="w-5 h-5 mr-2" />
                    Export to Tandoor
                  </button>
                </>
              )}
            </div>
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
                The recipe <strong className="text-teal-700">{recipeName}</strong> has been structured for Tandoor. You can copy the JSON-LD data or export it directly to your Tandoor instance.
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

        {/* Corrected conditional rendering for the entire dish image section */}
        {(isGeneratingDishImage || generatedDishImageUrl || dishImageError) && (
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Illustrative Dish Image</h3>
            {isGeneratingDishImage && (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg shadow-sm">
                <LoadingSpinner />
                <p className="mt-3 text-sm text-slate-600">Generating dish image based on description...</p>
                {/* Display description only if an attempt is being made and description exists */}
                {recipeData.dishImageDescription && <p className="mt-1 text-xs text-slate-500 italic">"{recipeData.dishImageDescription}"</p>}
              </div>
            )}
            {/* This error message is set in App.tsx if generation was attempted and failed/returned null/no description */}
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
            {/* The following two paragraphs were causing confusion and are effectively replaced by the dishImageError handling from App.tsx */}
            {/* when an actual attempt to generate an image was made. If no attempt was made (checkbox unchecked), this whole section is hidden. */}
            {/*
            {!isGeneratingDishImage && !generatedDishImageUrl && !dishImageError && recipeData.dishImageDescription && (
              <p className="text-sm text-slate-500">Could not generate an image for "{recipeData.dishImageDescription}".</p>
            )}
            {!isGeneratingDishImage && !generatedDishImageUrl && !dishImageError && !recipeData.dishImageDescription && (
              <p className="text-sm text-slate-500">No specific dish image description was found in the recipe to generate an image from.</p>
            )}
            */}
          </div>
        )}
      </div>
      {isTandoorModalOpen && recipeData && (
        <TandoorExportModal
          isOpen={isTandoorModalOpen}
          onClose={() => setIsTandoorModalOpen(false)}
          onExport={handleExportToTandoor}
          recipeName={recipeName}
        />
      )}
    </>
  );
};