
import React from 'react';
import { OutputFormat } from '../types';

interface OutputFormatSelectorProps {
  selectedFormat: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
}

export const OutputFormatSelector: React.FC<OutputFormatSelectorProps> = ({ selectedFormat, onFormatChange }) => {
  return (
    <div className="mb-6 p-4 bg-slate-50 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-slate-700 mb-3">Choose Output Format:</h3>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
        {(['text', 'tandoorJson'] as OutputFormat[]).map((format) => (
          <label
            key={format}
            className={`flex items-center p-3 rounded-md border-2 cursor-pointer transition-all duration-200 ease-in-out w-full sm:w-auto justify-center
                        ${selectedFormat === format 
                          ? 'bg-teal-500 border-teal-600 text-white shadow-md' 
                          : 'bg-white border-gray-300 hover:border-teal-400 hover:bg-teal-50 text-slate-700'}`}
          >
            <input
              type="radio"
              name="outputFormat"
              value={format}
              checked={selectedFormat === format}
              onChange={() => onFormatChange(format)}
              className="sr-only" // Visually hide the radio button, style the label instead
              aria-labelledby={`format-label-${format}`}
            />
            <span id={`format-label-${format}`} className="text-sm font-medium">
              {format === 'text' ? 'Plain Text' : 'Tandoor (JSON-LD)'}
            </span>
          </label>
        ))}
      </div>
      {selectedFormat === 'tandoorJson' && (
        <p className="mt-3 text-xs text-slate-500">
            This will generate a <code className="bg-slate-200 px-1 rounded">.json</code> file structured for Tandoor Recipes import.
        </p>
      )}
    </div>
  );
};
