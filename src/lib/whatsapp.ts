/** WhatsApp requires a full international number without punctuation. */
export function whatsappNumber(input: string): string | null {
  const value = input.trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (value.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = `44${digits.slice(1)}`;
  else if (!value.startsWith("+") && !digits.startsWith("44")) return null;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function whatsappAdvertUrl(enabled: boolean, number: string | null, title: string, advertUrl: string): string | null {
  const digits = number ? whatsappNumber(`+${number.replace(/^\+/, "")}`) : null;
  if (!enabled || !digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hi, I'm interested in ${title}. Is it still available?\n${advertUrl}`)}`;
}
