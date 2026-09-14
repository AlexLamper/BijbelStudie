/**
 * Text tidying for anything the site did not author itself.
 *
 * House rule: the em dash (U+2014) is never shown. The repo no longer carries
 * the character, but runtime text still can: AI answers, and hand-edited
 * content ranges. Fold it to a plain hyphen at the point the text enters.
 *
 * Built from the code point so the character itself never appears in source.
 * Not for Bible verse text or licensed commentary bodies, which stay verbatim.
 */
const EM_DASH = new RegExp(String.fromCharCode(0x2014), 'g');

export function normaliseDashes(input: string): string {
  return input.replace(EM_DASH, '-');
}
