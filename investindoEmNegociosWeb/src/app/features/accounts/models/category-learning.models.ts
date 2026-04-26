export type CategoryLearningSource = 'OFX' | 'CSV' | 'Manual';
export type CategoryLearningStrategy = 'ExactMatch' | 'FuzzyMatch' | 'EmbeddingSimilarity' | 'ClusterFallback' | 'None';

export interface CategoryLearningCandidate {
  description: string;
  amount: number;
  kind: 'Credit' | 'Debit';
  previousCategoryId?: string | null;
  selectedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  confidence?: number | null;
  source: CategoryLearningSource;
}

export interface LearnCategoryRequest {
  description: string;
  transactionKind: 'Credit' | 'Debit';
  amount: number;
  selectedCategoryId: string;
  suggestedCategoryId?: string | null;
  source: CategoryLearningSource;
}

export interface LearnCategoryResponse {
  learned: boolean;
  ruleId?: string | null;
}

export interface PredictCategoryRequest {
  description: string;
  transactionKind: 'Credit' | 'Debit';
  amount?: number | null;
}

export interface PredictCategoryResponse {
  categoryId?: string | null;
  categoryName?: string | null;
  confidence?: number | null;
  strategy: CategoryLearningStrategy;
  reasonCode?: string | null;
}
