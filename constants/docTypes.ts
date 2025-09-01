export const DOCUMENTE_TYPES = [
  'GDPR','CONTRACT','AVIZ','AVIZ PSIHOLOGIC','AVIZ MEDICAL','CAZIER','CAZIER AUTO',
  'ADEVERINTA MEDICALA','LIVRET','EXTRAS DE CONT','ADEVERINTA PRIMARIE','DECLARATIE ANAF',
  'DECIZIE','DECIZIE INCETARE','ADEVERINTA CIM','CARTE DE MUNCA','DECLARATIE','DIVERSE'
] as const;

export const IMAGINI_TYPES = [
  'CI','Poza','Calificare','CertificatNastere','CertificatNastereCopil','CertificatNastereIntretinut',
  'CI_Sotie','CI_Sot','CI_Copil','CI_Intretinut','AdeverintaANAF','AdeverintaVechime','CertificatCasatorie',
  'ActeStudii','Adeverinta scoala copil','Permis','Atestat','Card Tahograf','Atestat Auto','Declaratie','CI VECHI'
] as const;

export type DocCategory = 'document' | 'image';
export type DocType = typeof DOCUMENTE_TYPES[number] | typeof IMAGINI_TYPES[number];

export const isImageType = (t: string) => IMAGINI_TYPES.includes(t as any);
export const isDocumentType = (t: string) => DOCUMENTE_TYPES.includes(t as any);
