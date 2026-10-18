const BRAZIL_COUNTRY_CODE = '55';
const MAX_LOCAL_DIGITS = 11;

/** Formats Brazilian phone numbers while the user types or pastes a value. */
export function formatBrazilianPhone(value: string) {
  const input = String(value || '');
  const allDigits = input.replace(/\D/g, '');
  const hasExplicitCountryCode =
    input.trimStart().startsWith('+55') ||
    (allDigits.startsWith(BRAZIL_COUNTRY_CODE) && allDigits.length > MAX_LOCAL_DIGITS);
  const localDigits = (hasExplicitCountryCode ? allDigits.slice(2) : allDigits)
    .slice(0, MAX_LOCAL_DIGITS);

  if (!localDigits) return '';

  const prefix = hasExplicitCountryCode ? '+55 ' : '';
  if (localDigits.length <= 2) return `${prefix}(${localDigits}`;

  const areaCode = localDigits.slice(0, 2);
  const subscriber = localDigits.slice(2);
  if (!subscriber) return `${prefix}(${areaCode})`;
  if (subscriber.length <= 4) return `${prefix}(${areaCode}) ${subscriber}`;

  const firstBlockLength = subscriber.length > 8 ? 5 : 4;
  return `${prefix}(${areaCode}) ${subscriber.slice(0, firstBlockLength)}-${subscriber.slice(firstBlockLength)}`;
}
