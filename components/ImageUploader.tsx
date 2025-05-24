
// FIX: Corrected import syntax. "_from_react" should be "from 'react'".
import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  disabled: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, disabled }) => {
  const [dragging, setDragging] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }, []);
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // You can add visual cues for drag over if needed
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  }, [onImageUpload]);


  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <label
        htmlFor="recipe-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full flex flex-col items-center px-6 py-12 bg-white rounded-lg shadow-md tracking-wide uppercase border-2 border-dashed cursor-pointer hover:bg-teal-50 hover:border-teal-500 transition-all duration-300 ease-in-out
                    ${dragging ? 'border-teal-600 bg-teal-100' : 'border-gray-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg className="w-16 h-16 text-teal-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
        <span className="text-lg font-medium text-teal-600">
          {dragging ? "Drop image here" : "Upload a recipe screenshot"}
        </span>
        <span className="mt-1 text-sm text-gray-500">or drag and drop</span>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
      </label>
      <input
        id="recipe-upload"
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/gif"
        onChange={handleFileChange}
        disabled={disabled}
      />
       <p className="text-sm text-gray-600 text-center">
        Ensure your screenshot clearly shows the recipe ingredients and instructions for best results.
      </p>
    </div>
  );
};