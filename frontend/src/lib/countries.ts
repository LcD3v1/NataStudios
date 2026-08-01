/**
 * Country dial codes offered in the contact form.
 * The United States is the default (most of the studio's audience); Brazil and
 * a few neighbours are available for the rest.
 */
export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string; // international dialling prefix, digits only
  placeholder: string;
};

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'Estados Unidos', dial: '1', placeholder: '(904) 749-1515' },
  { code: 'BR', name: 'Brasil', dial: '55', placeholder: '(11) 98888-0000' },
  { code: 'PT', name: 'Portugal', dial: '351', placeholder: '912 345 678' },
  { code: 'CA', name: 'Canadá', dial: '1', placeholder: '(416) 555-0199' },
  { code: 'GB', name: 'Reino Unido', dial: '44', placeholder: '7400 123456' },
  { code: 'ES', name: 'Espanha', dial: '34', placeholder: '612 345 678' },
  { code: 'MX', name: 'México', dial: '52', placeholder: '55 1234 5678' },
  { code: 'AR', name: 'Argentina', dial: '54', placeholder: '11 2345-6789' }
];

export const DEFAULT_COUNTRY = 'US';

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
}
