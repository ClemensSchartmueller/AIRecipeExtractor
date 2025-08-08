import { describe, it, expect, vi } from 'vitest';
import { extractRecipeFromImage } from './geminiService';
import { GoogleGenAI } from '@google/genai';

// Mock the @google/genai library
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateImages = vi.fn();
  const GoogleGenAI = vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateImages: mockGenerateImages,
    },
  }));
  return { GoogleGenAI, mockGenerateContent, mockGenerateImages };
});

describe('geminiService', () => {
  it('should call generateContent with the correct model name', async () => {
    const { mockGenerateContent } = await import('@google/genai');
    // Set up the mock response
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        '@context': 'http://schema.org',
        '@type': 'Recipe',
        name: 'Test Recipe',
        recipeIngredient: [],
        recipeInstructions: [],
      }),
    });

    await extractRecipeFromImage('test-base64', 'image/png');

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
      })
    );
  });
});
