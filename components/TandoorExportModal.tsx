import React, { useState, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface TandoorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (tandoorUrl: string, apiKey: string) => Promise<void>;
  recipeName: string;
}

export const TandoorExportModal: React.FC<TandoorExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  recipeName,
}) => {
  const [tandoorUrl, setTandoorUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTandoorUrl(e.target.value);
    setError(null);
    setSuccess(null);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tandoorUrl || !apiKey) {
      setError('Please enter both Tandoor URL and API Key.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await onExport(tandoorUrl, apiKey);
      setSuccess(`Recipe "${recipeName}" successfully exported to Tandoor!`);
      // Optionally clear fields or auto-close after a delay
      // setTandoorUrl('');
      // setApiKey('');
      // setTimeout(onClose, 3000); 
    } catch (err) {
      console.error('Tandoor export failed:', err);
      if (err instanceof Error) {
        setError(`Export failed: ${err.message}`);
      } else {
        setError('An unknown error occurred during export.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [tandoorUrl, apiKey, onExport, recipeName, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      aria-labelledby="tandoor-export-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4 transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center">
          <h2 id="tandoor-export-modal-title" className="text-xl font-semibold text-slate-800">
            Export to Tandoor
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Enter your Tandoor instance details to export the recipe: <strong className="text-teal-600">{recipeName}</strong>.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tandoorUrl" className="block text-sm font-medium text-slate-700 mb-1">
              Tandoor Instance URL
            </label>
            <input
              type="url"
              id="tandoorUrl"
              name="tandoorUrl"
              value={tandoorUrl}
              onChange={handleUrlChange}
              placeholder="e.g., https://recipes.example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              required
              aria-describedby="tandoor-url-description"
            />
            <p id="tandoor-url-description" className="mt-1 text-xs text-slate-500">
              The base URL of your Tandoor installation.
            </p>
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-1">
              Tandoor API Key (Access Token)
            </label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your Tandoor API Key"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              required
              aria-describedby="api-key-description"
            />
             <p id="api-key-description" className="mt-1 text-xs text-slate-500">
              Generate this from your Tandoor user profile (Personal Access Tokens).
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-2">
              <LoadingSpinner />
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md text-sm" role="alert">
              <p>{success}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row-reverse sm:space-x-2 sm:space-x-reverse space-y-2 sm:space-y-0 pt-2">
            <button
              type="submit"
              disabled={isLoading || !!success} // Disable if loading or already succeeded
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Exporting...' : 'Export Recipe'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
