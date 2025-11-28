import { GoogleGenAI, Type } from "@google/genai";
import { StoryResponse } from "../types";

/**
 * Generates an extremely detailed technical prompt based on the provided image.
 * Tailored for FaceID/ControlNet reconstruction workflows.
 */
export const generateStoryFromImage = async (base64Image: string): Promise<StoryResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

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
      
      Output strictly JSON.
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
            text: "Deconstruct this image into a massive, highly detailed JSON prompt as instructed."
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
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

    const result = JSON.parse(response.text || "{}");
    
    if (!result.title || !result.story) {
        throw new Error("Incomplete response from AI");
    }

    return result as StoryResponse;

  } catch (error) {
    console.error("Error generating detailed prompt:", error);
    throw new Error("Failed to analyze image. Please try again.");
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [{ text: prompt }];

    // Add reference image if provided (for image-to-image or style transfer context)
    if (referenceImage) {
      const cleanRef = referenceImage.split(',')[1] || referenceImage;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanRef
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Using Pro for high quality generation
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