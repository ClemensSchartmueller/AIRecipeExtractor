
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { RecipeDisplay } from './components/RecipeDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { OutputFormatSelector } from './components/OutputFormatSelector';
import { GenerateImageCheckbox } from './components/GenerateImageCheckbox';
import { extractRecipeFromImage, generateDishImage } from './services/geminiService';
import { fileToBase64 } from './utils/imageUtils';
import { RecipeData, OutputFormat } from './types';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('text');
  const [shouldGenerateDishImage, setShouldGenerateDishImage] = useState<boolean>(true);

  const [generatedDishImageUrl, setGeneratedDishImageUrl] = useState<string | null>(null);
  const [isGeneratingDishImage, setIsGeneratingDishImage] = useState<boolean>(false);
  const [dishImageError, setDishImageError] = useState<string | null>(null);


  const handleImageUpload = useCallback(async (file: File) => {
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setRecipeData(null);
    setError(null);
    
    // Reset image generation states for every new upload
    setGeneratedDishImageUrl(null);
    setDishImageError(null);
    setIsGeneratingDishImage(false);
    
    setIsLoading(true);

    try {
      const imageBase64 = await fileToBase64(file);
      const extractedData = await extractRecipeFromImage(imageBase64, file.type);
      setRecipeData(extractedData);
      setError(null); 

      // Image Generation Logic
      if (shouldGenerateDishImage) {
        if (extractedData && extractedData.dishImageDescription) {
          setIsGeneratingDishImage(true);
          // dishImageError is already null from the reset above
          try {
            const dishImageResult = await generateDishImage(extractedData.dishImageDescription);
            if (dishImageResult) {
              setGeneratedDishImageUrl(`data:${dishImageResult.mimeType};base64,${dishImageResult.base64Data}`);
              // dishImageError remains null (success)
            } else {
              // API returned null, but no error thrown
              setDishImageError("An image could not be generated based on the description (the AI did not return an image).");
            }
          } catch (imgErr) {
            console.error("Error generating dish image:", imgErr);
            setDishImageError(imgErr instanceof Error ? imgErr.message : "Failed to generate dish image.");
          } finally {
            setIsGeneratingDishImage(false);
          }
        } else { // shouldGenerateDishImage is true, but no description from recipe
          setDishImageError("No dish image description was found in the recipe to generate an image from.");
          // isGeneratingDishImage remains false as no API call is made
        }
      }
      // If shouldGenerateDishImage is false, image states (URL, error, loading) remain at their reset values (null/false)

    } catch (err) {
      console.error("Error in handleImageUpload:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during recipe extraction.";
      setError(errorMessage.startsWith("Gemini API Error:") || errorMessage.startsWith("Failed to extract recipe via AI:") ? errorMessage : `Failed to process recipe: ${errorMessage}`);
      setRecipeData(null); 
    } finally {
      setIsLoading(false); 
    }
  }, [shouldGenerateDishImage]);

  const clearSelection = () => {
    setSelectedFile(null);
    setRecipeData(null);
    setError(null);
    setIsLoading(false);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setGeneratedDishImageUrl(null);
    setIsGeneratingDishImage(false);
    setDishImageError(null);
    // setShouldGenerateDishImage(true); // Optionally reset this to default
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-teal-500 to-blue-600 py-8 px-4 flex flex-col items-center">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          AI Recipe Extractor
        </h1>
        <p className="text-lg text-green-100 mt-2">
          Upload a recipe screenshot, get text, and an illustrative dish image!
        </p>
      </header>

      <main className="w-full max-w-2xl bg-white/90 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 space-y-8">
        {!selectedFile && !isLoading && (
          <>
            <OutputFormatSelector selectedFormat={outputFormat} onFormatChange={setOutputFormat} />
            <GenerateImageCheckbox 
              checked={shouldGenerateDishImage} 
              onChange={setShouldGenerateDishImage}
              disabled={isLoading}
            />
            <ImageUploader onImageUpload={handleImageUpload} disabled={isLoading} />
          </>
        )}

        {isLoading && !recipeData && ( 
          <div className="text-center py-10">
            <LoadingSpinner />
            <p className="mt-4 text-lg font-medium text-slate-700">Extracting recipe, please hold on...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Oops! Something went wrong.</p>
            <p>{error}</p>
            <button
              onClick={clearSelection}
              className="mt-3 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {imagePreviewUrl && !recipeData && !isLoading && !error && (
           <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-800">Your Uploaded Image:</h2>
            <div className="relative group">
              <img 
                src={imagePreviewUrl} 
                alt="Recipe screenshot preview" 
                className="rounded-lg shadow-lg max-h-96 w-full object-contain" 
              />
               <button
                onClick={clearSelection}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Remove image and start over"
              >
                X
              </button>
            </div>
          </div>
        )}
        
        {recipeData && !isLoading && ( 
          <>
            {imagePreviewUrl && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-semibold text-slate-800">Your Uploaded Image:</h2>
                   <button
                    onClick={clearSelection}
                    className="bg-slate-200 text-slate-700 px-3 py-1 rounded hover:bg-slate-300 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    aria-label="Clear image and results"
                  >
                    Start Over
                  </button>
                </div>
                <img 
                  src={imagePreviewUrl} 
                  alt="Recipe screenshot preview" 
                  className="rounded-lg shadow-lg max-h-80 w-full object-contain" 
                />
              </div>
            )}
            <RecipeDisplay 
              recipeData={recipeData} 
              format={outputFormat}
              generatedDishImageUrl={generatedDishImageUrl}
              isGeneratingDishImage={isGeneratingDishImage}
              dishImageError={dishImageError}
            />
          </>
        )}
        
        {selectedFile && !isLoading && !recipeData && !error && ( 
           <div className="text-center py-6">
             <p className="text-slate-600">Image loaded. Processing recipe text...</p>
           </div>
        )}
      </main>

      <footer className="mt-12 text-center text-sm text-white/80">
        <p>&copy; {new Date().getFullYear()} AI Recipe Extractor. Powered by Gemini & Imagen.</p>
      </footer>
    </div>
  );
};

export default App;
