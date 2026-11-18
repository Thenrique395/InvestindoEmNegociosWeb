export interface LegalPublisher { name: string; taxId: string; address: string; email: string; }
export function legalPublisherFromEnvironment(env: Record<string, string | undefined>): LegalPublisher;
export function validateLegalPublisher(publisher: Partial<LegalPublisher>): string[];
