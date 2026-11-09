/**
 * The win-back mails: after 3, 7 and 14 days without reading (lib/winback.ts).
 *
 * Engagement mail, so it carries the unsubscribe footer and the cron adds the
 * one-click `List-Unsubscribe` header. Every mail is about this reader: where
 * they left off, their tree, their streak or level, and the verse of the day.
 *
 * Copy rules, as in lib/notificationCopy.ts and the push copy: Dutch, warm, no
 * guilt and no deadline, no exclamation marks, plain hyphens only. The tree
 * may droop but is never "dying" - it floors at 0.3 and comes back with one
 * read (lib/progressTree/health.ts) - and a level is never at stake. The third
 * mail says it is the last one.
 */

import { button, escapeHtml, paragraph, render, type FooterLinks, type RenderedEmail } from './layout';

export type WinbackStage = 3 | 7 | 14;

export type WinbackResume =
  | { kind: 'study'; title: string; lessonDay: number }
  | { kind: 'chapter'; book: string; chapter: number };

export type WinbackEmailInput = {
  stage: WinbackStage;
  firstName: string | null;
  resume: WinbackResume | null;
  /** Null when the reader switched the tree off. */
  tree: { thirsty: boolean } | null;
  level: number;
  /** The run that ended while they were away, when it was worth naming (3+ days). */
  lostStreak: number | null;
  goalMinutes: number;
  verse: { text: string; reference: string } | null;
  /** The button's (tracked) link. */
  ctaUrl: string;
  footer: FooterLinks;
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** "Johannes 4" or "les 3 van Wie is Jezus?". */
export function resumePlace(resume: WinbackResume): string {
  return resume.kind === 'chapter'
    ? `${resume.book} ${resume.chapter}`
    : `les ${resume.lessonDay} van ${resume.title}`;
}

function verseBlock(verse: { text: string; reference: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;">
  <tr>
    <td style="border-left:3px solid #0D9488;padding:4px 0 4px 16px;">
      <p style="margin:0 0 6px;font-family:Georgia, 'Times New Roman', serif;font-size:16px;line-height:1.6;color:#0F172A;">“${escapeHtml(verse.text)}”</p>
      <p style="margin:0;font-family:${FONT};font-size:13px;font-weight:600;color:#475569;">${escapeHtml(verse.reference)}</p>
    </td>
  </tr>
</table>`;
}

type Copy = {
  subject: string;
  preheader: string;
  heading: string;
  lines: string[];
  cta: string;
};

function copyFor(input: WinbackEmailInput): Copy {
  const place = input.resume ? resumePlace(input.resume) : null;
  const goal = input.goalMinutes;
  const level = input.level;
  const thirsty = input.tree?.thirsty ?? false;

  if (input.stage === 3) {
    const lines = [
      place
        ? input.resume!.kind === 'chapter'
          ? `Je was gebleven bij ${place}. Het hoofdstuk ligt nog voor je klaar.`
          : `Je was gebleven bij ${place}. Je gaat verder precies waar je stopte.`
        : 'Je hebt een paar dagen niet gelezen. Geen probleem: je pakt het op wanneer het jou uitkomt.',
    ];
    if (thirsty) {
      lines.push(
        `Je boom heeft een beetje dorst: hij laat zijn blaadjes hangen sinds je weg bent. Eén keer lezen en hij staat weer recht. Je niveau ${level} blijft gewoon van jou.`,
      );
    }
    lines.push(`Je dagdoel is ${goal} minuten. Meer hoeft niet.`);
    return {
      subject: thirsty ? 'Je boom heeft dorst' : place ? `Verder in ${place}?` : 'Even tijd voor het Woord?',
      preheader: place ? `Je was gebleven bij ${place}. ${goal} minuten is genoeg.` : `${goal} minuten is genoeg om weer te beginnen.`,
      heading: place ? `Verder in ${place}?` : 'Zin in een korte lezing?',
      lines,
      cta: place ? 'Verder lezen' : 'Begin met lezen',
    };
  }

  if (input.stage === 7) {
    const lines = [
      input.lostStreak && input.lostStreak >= 3
        ? `Het is een week geleden dat je las. Je reeks van ${input.lostStreak} dagen is gestopt, maar alles wat je hebt opgebouwd blijft staan: je bent nog steeds niveau ${level}.`
        : `Het is een week geleden dat je las. Je bent nog steeds niveau ${level}, en dat blijft zo.`,
    ];
    if (input.tree) {
      lines.push(
        thirsty
          ? `Je boom laat zijn blaadjes hangen, maar hij is er nog. Lees ${goal} minuten en hij knapt meteen weer op.`
          : `Je boom staat op je te wachten. ${goal} minuten lezen is genoeg.`,
      );
    }
    if (place) lines.push(`Je kunt gewoon verder bij ${place}.`);
    return {
      subject: input.tree ? 'Je boom mist je' : place ? `Even terug naar ${place}?` : 'Een week stil. Even lezen?',
      preheader: place ? `Verder bij ${place}, ${goal} minuten is genoeg.` : `${goal} minuten is genoeg.`,
      heading: input.tree ? 'Je boom mist je' : 'Even terug?',
      lines,
      cta: place ? 'Verder lezen' : 'Open BijbelStudie',
    };
  }

  const lines = [
    place
      ? `Twee weken is lang, maar er is geen achterstand om in te halen. Je kunt verder bij ${place}, of je leest alleen de tekst van vandaag.`
      : 'Twee weken is lang, maar er is geen achterstand om in te halen. Lees gewoon de tekst van vandaag, en kijk dan verder.',
    goal > 5
      ? 'Tip: zet je dagdoel een tijdje op 5 minuten. Klein beginnen werkt het best.'
      : 'Vijf minuten per dag is genoeg.',
    input.tree
      ? `Je boom staat nog op niveau ${level} en wacht rustig op je.`
      : `Je staat nog op niveau ${level}, dat blijft van jou.`,
    'Dit is de laatste mail hierover. Daarna laten we je met rust tot je zelf weer langskomt.',
  ];
  return {
    subject: 'Nog steeds welkom bij BijbelStudie',
    preheader: 'Geen achterstand, gewoon opnieuw beginnen.',
    heading: 'Begin gewoon opnieuw, op je eigen tempo',
    lines,
    cta: 'Terug naar BijbelStudie',
  };
}

export function winbackSubject(input: WinbackEmailInput): string {
  return copyFor(input).subject;
}

export function renderWinbackEmail(input: WinbackEmailInput): RenderedEmail {
  const copy = copyFor(input);
  const hello = input.firstName ? `Hoi ${input.firstName},` : 'Hoi,';

  // The verse sits after the first line: it is the reason to open the app,
  // not a closing ornament.
  const [first, ...rest] = copy.lines;
  const bodyHtml = [
    paragraph(escapeHtml(hello)),
    paragraph(escapeHtml(first)),
    input.verse ? verseBlock(input.verse) : '',
    ...rest.map((line) => paragraph(escapeHtml(line))),
    button(copy.cta, input.ctaUrl),
  ]
    .filter(Boolean)
    .join('\n');

  const text = [
    hello,
    '',
    first,
    '',
    ...(input.verse ? [`"${input.verse.text}" ${input.verse.reference}`, ''] : []),
    ...rest.flatMap((line) => [line, '']),
    `${copy.cta}: ${input.ctaUrl}`,
    '',
    'BijbelStudie',
    '',
    `Deze mails uitzetten: ${input.footer.unsubscribeTypeUrl}`,
    `Alle e-mails uitzetten: ${input.footer.unsubscribeAllUrl}`,
  ].join('\n');

  return render({
    subject: copy.subject,
    preheader: copy.preheader,
    heading: copy.heading,
    bodyHtml,
    text,
    footerLinks: input.footer,
  });
}
