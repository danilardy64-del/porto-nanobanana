
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
    // Dengan setting di vite.config.ts, process.env.API_KEY sekarang berisi kunci asli Anda
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("API Key is missing in the build configuration.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const systemInstruction = `
      You are an expert Prompt Engineer for High-End AI Image Generators.
      YOUR TASK: Analyze the input image and output a JSON object with 'title' and 'story'.
      
      'story': An EXTREMELY DETAILED technical prompt (1500+ chars) describing the subject's outfit, pose, lighting, and environment for FaceID reconstruction. Refer to the person as "[Subject]". Ignore the original face identity.
      'title': A short, cool industrial title.
      
      IMPORTANT: Output ONLY valid JSON. Do not include markdown formatting.
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
            text: "Output valid JSON with 'title' and 'story'."
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        safetySettings: [
           { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    return response;
  };

  try {
    const response = await retryOperation(runAnalysis);
    let jsonString = response.text || "{}";

    // CLEANUP: Robust cleaning of markdown
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
        const result = JSON.parse(jsonString);
        
        // Validation with Fallback
        return {
            title: result.title || "GENERATED PROMPT",
            story: result.story || result.description || "Prompt generation incomplete, but image was analyzed."
        };

    } catch (parseError) {
        console.warn("JSON Parse failed, using raw text fallback.", parseError);
        // Fallback: If JSON fails, just put all text in story
        return {
            title: "ANALYSIS RESULT (RAW)",
            story: response.text || "No description generated."
        };
    }

  } catch (error: any) {
    console.error("Error generating detailed prompt:", error);
    if (error.message && error.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Quota exceeded. Please wait a moment.");
    }
    // Return a dummy object instead of throwing error to keep UI alive
    return {
        title: "ANALYSIS PENDING",
        story: "System is busy. Please try editing this manually or wait a moment. Error: " + (error.message || "Unknown")
    };
  }
};

/**
 * Generates an image using Gemini Flash Image model based on user prompt and optional reference.
 */
export const generateImageWithGemini = async (
  prompt: string, 
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4", 
  referenceImage: string | null
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey: apiKey });
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
      model: 'gemini-2.5-flash-image', 
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
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

  } catch (error: any) {
    console.error("Error generating image:", error);
    const msg = error.message || "Unknown error";
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        throw new Error("Access Denied. Ensure your API Key supports image generation.");
    }
    throw new Error("Failed to generate image. " + msg);
  }
};
