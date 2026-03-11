const requiredProfiles = [
  {
    name: 'Intermediate',
    env: ['LIVE_INTERMEDIATE_EMAIL', 'LIVE_INTERMEDIATE_PASSWORD']
  },
  {
    name: 'Advanced',
    env: ['LIVE_ADVANCED_EMAIL', 'LIVE_ADVANCED_PASSWORD']
  },
  {
    name: 'Admin',
    env: ['LIVE_ADMIN_EMAIL', 'LIVE_ADMIN_PASSWORD']
  }
];

const missingByProfile = requiredProfiles
  .map((profile) => ({
    ...profile,
    missing: profile.env.filter((envName) => !process.env[envName])
  }))
  .filter((profile) => profile.missing.length > 0);

if (missingByProfile.length === 0) {
  console.log('[live-e2e] Credenciais elevadas detectadas: a suíte live completa pode rodar.');
  process.exit(0);
}

console.warn('[live-e2e] Credenciais elevadas ausentes: parte da suíte live será ignorada.');
for (const profile of missingByProfile) {
  console.warn(`[live-e2e] ${profile.name}: faltando ${profile.missing.join(', ')}`);
}
console.warn('[live-e2e] Os fluxos Basic continuam executando normalmente.');
