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