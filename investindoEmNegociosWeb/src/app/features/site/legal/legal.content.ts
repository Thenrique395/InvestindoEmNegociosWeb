/**
 * Conteúdo das páginas legais.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ ATENÇÃO — ESTE TEXTO NÃO PASSOU POR REVISÃO JURÍDICA.                │
 * │                                                                      │
 * │ Foi redigido para ser coerente com o que o produto afirma no site    │
 * │ (não pede senha de banco, não conecta open finance, dados            │
 * │ exportáveis, exclusão pela própria conta) e com a LGPD. Ainda assim, │
 * │ é peça contratual: revisar com advogado antes de publicar.           │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Os placeholders abaixo precisam dos dados reais antes de publicar:
 *   {{RAZAO_SOCIAL}}  {{CNPJ}}  {{ENDERECO}}  {{EMAIL_CONTATO}}
 */

export interface LegalSection {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface LegalDocument {
  slug: 'termos' | 'privacidade';
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: readonly LegalSection[];
}

const CONTATO = 'contato@investindoemnegocios.com.br';

export const TERMOS_DE_USO: LegalDocument = {
  slug: 'termos',
  eyebrow: 'Legal',
  title: 'Termos de uso',
  summary:
    'As regras de uso da plataforma Investindo em Negócios: o que você pode esperar de nós e o que esperamos de você.',
  updatedAt: '12 de agosto de 2026',
  sections: [
    {
      title: '1. Quem somos e o que este documento cobre',
      paragraphs: [
        'A plataforma Investindo em Negócios é operada por {{RAZAO_SOCIAL}}, inscrita no CNPJ {{CNPJ}}, com sede em {{ENDERECO}}.',
        'Estes Termos regulam o acesso e o uso do site e do aplicativo web. Ao criar uma conta ou usar a plataforma, você concorda com eles. Se não concordar, não use o serviço.',
      ],
    },
    {
      title: '2. O que a plataforma é — e o que não é',
      paragraphs: [
        'A plataforma é uma ferramenta de registro e organização financeira pessoal. Ela calcula, agrupa e apresenta informações que você mesmo cadastra.',
        'A plataforma não presta consultoria financeira, não faz recomendação de investimento e não intermedia operações. Os módulos de investimento servem para registro e acompanhamento da sua própria carteira, não para orientar decisões de compra ou venda.',
      ],
    },
    {
      title: '3. Sua conta',
      paragraphs: [
        'Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada na sua conta.',
      ],
      bullets: [
        'É necessário fornecer informações verdadeiras no cadastro.',
        'A conta é pessoal e intransferível.',
        'Avise imediatamente em caso de suspeita de acesso não autorizado.',
        'Contas de menores de 18 anos exigem consentimento do responsável legal.',
      ],
    },
    {
      title: '4. Planos, cobrança e cancelamento',
      paragraphs: [
        'O plano Essencial é gratuito e não exige cartão de crédito. Os planos pagos são cobrados de forma recorrente, mensal ou anual, conforme o ciclo escolhido no momento da contratação.',
        'A troca de plano passa a valer no ciclo seguinte. O cancelamento pode ser feito a qualquer momento pelas configurações da conta e não gera multa. Após o cancelamento, o acesso aos recursos pagos permanece até o fim do período já pago.',
        'Valores podem ser reajustados mediante aviso prévio de 30 dias. O reajuste nunca se aplica a um ciclo já pago.',
      ],
    },
    {
      title: '5. Uso aceitável',
      paragraphs: ['Ao usar a plataforma, você concorda em não:'],
      bullets: [
        'Tentar obter acesso não autorizado a contas, sistemas ou dados de terceiros.',
        'Realizar engenharia reversa, copiar ou revender o serviço.',
        'Automatizar acessos de forma que degrade o funcionamento da plataforma.',
        'Usar a plataforma para qualquer finalidade ilícita.',
      ],
    },
    {
      title: '6. Seus dados e seu conteúdo',
      paragraphs: [
        'Os dados financeiros que você cadastra são seus. Não os vendemos, não os cedemos a terceiros para fins comerciais e não os usamos para publicidade.',
        'Você pode exportar suas informações a qualquer momento e excluir sua conta pelas configurações. O tratamento de dados pessoais está descrito na Política de Privacidade.',
      ],
    },
    {
      title: '7. Disponibilidade e limitação de responsabilidade',
      paragraphs: [
        'Trabalhamos para manter o serviço disponível, mas ele é fornecido "no estado em que se encontra". Pode haver interrupções para manutenção, atualização ou por causas fora do nosso controle.',
        'Não nos responsabilizamos por decisões financeiras tomadas com base nas informações apresentadas: os cálculos derivam dos dados que você cadastra, e a conferência é sua.',
      ],
    },
    {
      title: '8. Alterações destes Termos',
      paragraphs: [
        'Podemos alterar estes Termos. Mudanças relevantes serão comunicadas por e-mail ou dentro da plataforma com pelo menos 30 dias de antecedência. Continuar usando o serviço após a vigência significa concordar com a nova versão.',
      ],
    },
    {
      title: '9. Lei aplicável e contato',
      paragraphs: [
        'Estes Termos são regidos pela lei brasileira. Fica eleito o foro da comarca de {{ENDERECO}} para dirimir controvérsias, com renúncia a qualquer outro.',
        `Dúvidas sobre este documento: ${CONTATO}.`,
      ],
    },
  ],
};

export const POLITICA_PRIVACIDADE: LegalDocument = {
  slug: 'privacidade',
  eyebrow: 'Legal',
  title: 'Política de privacidade',
  summary:
    'Quais dados coletamos, por que coletamos, com quem compartilhamos e como você exerce seus direitos sob a LGPD.',
  updatedAt: '12 de agosto de 2026',
  sections: [
    {
      title: '1. Controlador e encarregado',
      paragraphs: [
        'O controlador dos dados é {{RAZAO_SOCIAL}}, CNPJ {{CNPJ}}. Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com o encarregado pelo tratamento de dados em {{EMAIL_CONTATO}}.',
      ],
    },
    {
      title: '2. O que coletamos',
      paragraphs: ['Coletamos apenas o necessário para operar a plataforma:'],
      bullets: [
        'Dados de cadastro: nome, e-mail e senha (armazenada com hash, nunca em texto puro).',
        'Dados financeiros que você registra: receitas, despesas, contas, cartões, metas, orçamentos e investimentos.',
        'Dados de uso: páginas acessadas, ações realizadas e informações técnicas do dispositivo, para diagnóstico e melhoria.',
        'Dados de cobrança, quando você assina um plano pago — processados pelo provedor de pagamento, não armazenados por nós.',
      ],
    },
    {
      title: '3. O que não coletamos',
      paragraphs: [
        'Não pedimos e não armazenamos senhas de banco. Não há conexão automática com instituições financeiras nem leitura de extrato por open finance: todo dado financeiro entra porque você cadastrou ou importou um arquivo.',
      ],
    },
    {
      title: '4. Por que tratamos seus dados',
      paragraphs: ['Cada finalidade tem uma base legal sob a LGPD:'],
      bullets: [
        'Executar o contrato: dar acesso à plataforma e às funcionalidades do seu plano.',
        'Cumprir obrigação legal: guarda de registros fiscais e de acesso.',
        'Legítimo interesse: segurança, prevenção a fraude e melhoria do produto.',
        'Consentimento: comunicações de marketing, que você pode revogar a qualquer momento.',
      ],
    },
    {
      title: '5. Com quem compartilhamos',
      paragraphs: [
        'Não vendemos seus dados. Compartilhamos apenas com operadores necessários ao funcionamento do serviço — hospedagem, envio de e-mail, processamento de pagamento e monitoramento —, sempre sob contrato e limitados à finalidade contratada.',
        'Também podemos compartilhar quando houver ordem judicial ou obrigação legal.',
      ],
    },
    {
      title: '6. Por quanto tempo guardamos',
      paragraphs: [
        'Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os dados pessoais são eliminados em até 30 dias, exceto os que a lei obriga a reter — registros fiscais e logs de acesso, mantidos pelos prazos legais.',
      ],
    },
    {
      title: '7. Seus direitos',
      paragraphs: ['A LGPD garante a você o direito de:'],
      bullets: [
        'Confirmar a existência de tratamento e acessar seus dados.',
        'Corrigir dados incompletos, inexatos ou desatualizados.',
        'Solicitar anonimização, bloqueio ou eliminação de dados desnecessários.',
        'Solicitar a portabilidade dos dados a outro fornecedor.',
        'Revogar o consentimento e se opor a tratamentos baseados em legítimo interesse.',
      ],
    },
    {
      title: '8. Segurança',
      paragraphs: [
        'Usamos criptografia em trânsito, senhas com hash, controle de acesso por perfil e monitoramento de atividade. Nenhum sistema é imune, mas mantemos processos para detectar e responder a incidentes — e, havendo risco relevante, comunicamos você e a ANPD.',
      ],
    },
    {
      title: '9. Cookies',
      paragraphs: [
        'Usamos cookies essenciais para manter sua sessão ativa e cookies de análise para entender o uso da plataforma. Os de análise podem ser desativados no seu navegador sem prejudicar o funcionamento do serviço.',
      ],
    },
    {
      title: '10. Alterações desta Política',
      paragraphs: [
        `Podemos atualizar esta Política. Mudanças relevantes serão comunicadas com antecedência. A data da última atualização está no topo da página. Dúvidas: ${CONTATO}.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  termos: TERMOS_DE_USO,
  privacidade: POLITICA_PRIVACIDADE,
};
