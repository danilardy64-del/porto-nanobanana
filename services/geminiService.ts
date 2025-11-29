import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryResponse } from "../types";

// Helper function for Retry logic
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for Rate Limit / Quota Exceeded (429) or Server Errors (500, 503)
    const status = error?.status || error?.response?.status;
    const isQuotaError = status === 429 || (error.message && error.message.includes("429")) || (error.message && error.message.includes("RESOURCE_EXHAUSTED"));
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

/**
 * Generates an extremely detailed technical prompt based on the provided image.
 * Tailored for FaceID/ControlNet reconstruction workflows.
 */
export const generateStoryFromImage = async (base64Image: string): Promise<StoryResponse> => {
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const runAnalysis = async () => {
    // Use process.env.API_KEY exclusively
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `
      You are an expert Prompt Engineer for High-End AI Image Generators (Midjourney v6, Stable Diffusion XL, Flux).
      
      YOUR TASK: 
      Analyze the input image and deconstruct it into an EXTREMELY DETAILED text prompt (target 1500-2000 characters).
      
      SCENARIO:
      The user wants to recreate this EXACT image structure, outfit, and vibe, but will swap the face with their own using a FaceID adapter.
      Therefore, you must describe the subject's body, outfit, pose, and environment with 100% accuracy, but refer to the person simply as "[Subject]".
      
      REQUIREMENTS:
      1. IGNORE the original face's identity. Focus on the OUTFIT, POSE, and LIGHTING.
      2. DO NOT use phrases like "similar to the image", "atmosphere like this". Write a standalone, objective description.
      3. BREAKDOWN:
         - **Subject & Outfit:** Texture of fabric, specific clothing items, fit, accessories, jewelry, hairstyle (excluding face).
         - **Pose & Angle:** Exact camera angle (e.g., low-angle, dutch angle, from below), lens type (e.g., 35mm, 85mm portrait), depth of field.
         - **Lighting:** Direction (key light, rim light), color temperature, shadows, volumetric fog, studio vs natural.
         - **Environment:** Background details, architecture, props, time of day.
         - **Technical keywords:** 8k, photorealistic, octane render, ray tracing, etc.
      
      OUTPUT FORMAT:
      Return strictly JSON with 'title' and 'story' keys. Do NOT wrap in markdown code blocks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: "Deconstruct this image into a massive, highly detailed JSON prompt."
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 8192, // Increased max tokens to ensure JSON isn't cut off
        responseMimeType: "application/json",
        safetySettings: [
           { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, catchy, industrial-style title for this prompt setup." },
            story: { type: Type.STRING, description: "The massive, 2000-character detailed prompt description." },
          },
          required: ["title", "story"],
        },
      },
    });

    return response;
  };

  try {
    const response = await retryOperation(runAnalysis);
    let jsonString = response.text || "{}";

    // CLEANUP: Remove Markdown code blocks if the model includes them despite instructions
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const result = JSON.parse(jsonString);
        
        if (!result.title || !result.story) {
            throw new Error("Incomplete JSON structure");
        }
        return result as StoryResponse;

    } catch (parseError) {
        console.warn("JSON Parse failed, attempting fallback.", parseError);
        return {
            title: "GENERATED PROMPT (RAW)",
            story: response.text || "No text generated."
        };
    }

  } catch (error: any) {
    console.error("Error generating detailed prompt:", error);
    // Propagate user friendly message
    if (error.message && error.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Quota exceeded (429). Please wait a moment and try again.");
    }
    throw new Error("Failed to analyze image. " + (error.message || "Unknown error"));
  }
};

/**
 * Generates an image using Gemini Pro Image model based on user prompt and optional reference.
 */
export const generateImageWithGemini = async (
  prompt: string, 
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4", 
  referenceImage: string | null
): Promise<string> => {
  try {
    // Use process.env.API_KEY exclusively
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [{ text: prompt }];

    // Add reference image if provided
    if (referenceImage) {
      const cleanRef = referenceImage.includes(',') ? referenceImage.split(',')[1] : referenceImage;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanRef
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data returned from API");

  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Try adjusting the prompt.");
  }
};