export function legalPublisherFromEnvironment(env) {
  return {
    name: (env.LEGAL_NAME || '').trim(),
    taxId: (env.LEGAL_TAX_ID || '').trim(),
    address: (env.LEGAL_ADDRESS || '').trim(),
    email: (env.LEGAL_CONTACT_EMAIL || '').trim(),
  };
}

function validTaxId(value) {
  const id = value.replace(/[.\s/\-]/g, '').toUpperCase();
  if (/^(.)\1+$/.test(id)) return false;
  if (/^\d{11}$/.test(id)) {
    for (const size of [9, 10]) {
      let sum = 0;
      for (let i = 0; i < size; i++) sum += Number(id[i]) * (size + 1 - i);
      const digit = (sum * 10) % 11 % 10;
      if (digit !== Number(id[size])) return false;
    }
    return true;
  }
  if (!/^[A-Z\d]{12}\d{2}$/.test(id)) return false;
  for (const size of [12, 13]) {
    let sum = 0;
    for (let i = 0; i < size; i++) sum += (id.charCodeAt(i) - 48) * (2 + (size - 1 - i) % 8);
    const remainder = sum % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(id[size])) return false;
  }
  return true;
}

export function validateLegalPublisher(publisher) {
  const missing = [];
  if (!publisher.name || publisher.name.length < 3 || /\{\{|CHANGE_ME|exemplo|placeholder/i.test(publisher.name)) missing.push('LEGAL_NAME');
  if (!validTaxId(publisher.taxId || '')) missing.push('LEGAL_TAX_ID (CPF/CNPJ válido)');
  if (!publisher.address || publisher.address.length < 10 || /\{\{|CHANGE_ME|placeholder/i.test(publisher.address)) missing.push('LEGAL_ADDRESS');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publisher.email || '') || /example\.(com|invalid)|CHANGE_ME|\{\{/i.test(publisher.email)) missing.push('LEGAL_CONTACT_EMAIL');
  return missing;
}
