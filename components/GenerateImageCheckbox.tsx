
import React from 'react';

interface GenerateImageCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const GenerateImageCheckbox: React.FC<GenerateImageCheckboxProps> = ({ checked, onChange, disabled }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <div className="my-6 p-4 bg-slate-50 rounded-lg shadow">
      <label 
        htmlFor="generateImageCheckbox" 
        className={`flex items-center select-none ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <input
          id="generateImageCheckbox"
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="form-checkbox h-5 w-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 transition duration-150 ease-in-out"
          aria-describedby="generateImageCheckboxDescription"
        />
        <span id="generateImageCheckboxDescription" className="ml-3 text-sm font-medium text-slate-700">
          Generate illustrative dish image?
        </span>
      </label>
      <p className="mt-1 ml-8 text-xs text-slate-500">
        If checked, an AI-generated image representing the dish will be created alongside the recipe details.
      </p>
    </div>
  );
};
