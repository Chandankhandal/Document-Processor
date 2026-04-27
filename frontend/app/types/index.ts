export interface DocumentResult {
  title?: string;
  summary?: string;
  category?: string;
  // Added this to fix the "Property metadata does not exist" error
  metadata?: {
    extension: string;
    processed_at: string;
    size?: number;
  };
}

export interface DocumentJob {
  id: number;
  filename: string;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed';
  progress?: number; // Added progress here so it's easy to access
  result?: DocumentResult | null;
}

export interface ProgressUpdate {
  status: string;
  progress: number;
}