
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:image/png;base64,actual_base64_string"
      // We need to strip the "data:image/png;base64," part for Gemini API
      const base64String = result.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert file to base64: The resulting string was empty or invalid."));
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Failed to read the file for base64 conversion."));
    };
  });
};
