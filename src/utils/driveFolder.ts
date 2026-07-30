/** Converte nome da empresa em slug seguro para pasta do Drive */
export function slugifyCompanyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** Padrão fechado: NomeEmpresa_YYYY-MM-DD */
export function buildDriveFolderName(companyName: string, date: string): string {
  const slug = slugifyCompanyName(companyName) || 'Cliente'
  const day = date.slice(0, 10)
  return `${slug}_${day}`
}
