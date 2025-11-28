export interface PortfolioItem {
  id: number;
  imageData: string | null; // Base64 string
  story: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface StoryResponse {
  story: string;
  title: string;
}

export interface GeneratorState {
  prompt: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  referenceImage: string | null;
  isGenerating: boolean;
  resultImage: string | null;
  error: string | null;
}