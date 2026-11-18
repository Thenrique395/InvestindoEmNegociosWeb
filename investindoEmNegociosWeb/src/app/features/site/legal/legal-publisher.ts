import { legalPublisherFromEnvironment, validateLegalPublisher, type LegalPublisher } from '../../../../legal-publisher.mjs';
import type { LegalDocument } from './legal.content';

declare global {
  interface Window { __LEGAL_PUBLISHER__?: LegalPublisher; }
}

export function readLegalPublisher(): LegalPublisher {
  if (typeof window !== 'undefined' && window.__LEGAL_PUBLISHER__) return window.__LEGAL_PUBLISHER__;
  return legalPublisherFromEnvironment(typeof process !== 'undefined' ? process.env : {});
}

export function legalPublicationReady(): boolean {
  return validateLegalPublisher(readLegalPublisher()).length === 0;
}

export function resolveLegalDocument(document: LegalDocument, publisher = readLegalPublisher()): LegalDocument {
  const fields: Record<string, string> = {
    RAZAO_SOCIAL: publisher.name, DOCUMENTO: publisher.taxId, ENDERECO: publisher.address, EMAIL_CONTATO: publisher.email,
  };
  const text = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_match, field: string) => fields[field] || '[dados do responsável ainda não informados]');
  return {
    ...document,
    sections: document.sections.map(section => ({
      ...section, paragraphs: section.paragraphs.map(text), bullets: section.bullets?.map(text),
    })),
  };
}
