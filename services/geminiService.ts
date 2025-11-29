
import { StoryResponse } from "../types";

// SERVICE DISABLED BY USER REQUEST (MANUAL MODE ONLY)

export const generateStoryFromImage = async (base64Image: string): Promise<StoryResponse> => {
  return {
    title: "MANUAL MODE",
    story: "AI Analysis Disabled."
  };
};

export const generateImageWithGemini = async (
  prompt: string, 
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4", 
  referenceImage: string | null
): Promise<string> => {
    throw new Error("Generator disabled.");
};
