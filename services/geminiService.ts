import { GoogleGenAI, Type } from "@google/genai";
import { StoryResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a creative story based on the provided base64 image.
 */
export const generateStoryFromImage = async (base64Image: string): Promise<StoryResponse> => {
  try {
    // Remove the data URL prefix if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using flash for fast multimodal analysis
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG/PNG for simplicity, the API is flexible
              data: cleanBase64,
            },
          },
          {
            text: "Analyze this image. Write a creative, artistic, and engaging short story (approx 100-150 words) inspired by the visuals. Also provide a catchy title. Return the result in JSON format."
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A creative title for the image story" },
            story: { type: Type.STRING, description: "The short story generated from the image" },
          },
          required: ["title", "story"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    if (!result.title || !result.story) {
        throw new Error("Incomplete response from AI");
    }

    return result as StoryResponse;

  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error("Failed to generate a story. Please try again.");
  }
};