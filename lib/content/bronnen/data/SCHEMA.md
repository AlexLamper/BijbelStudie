# Bronnen data schema

One JSON file per work: `lib/content/bronnen/data/<slug>.json` (UTF-8, 2-space indent).
Only public-domain text lives here (this repo is public). Provenance is mandatory.

```jsonc
{
  "slug": "heidelbergse-catechismus",      // kebab-case, stable forever (URLs + app cache keys)
  "title": "Heidelbergse Catechismus",
  "author": "Zacharias Ursinus en Caspar Olevianus", // null when anonymous / synodal
  "year": "1563",                           // string, may be a range: "1618-1619"
  "sectionNoun": "Zondag",                  // what one section is called (Zondag, Artikel, Hoofdstuk, Formulier, Deel)
  "source": {
    "name": "Human-readable source (site or printed edition)",
    "url": "https://… exact page/file downloaded",
    "edition": "Which printed text this follows, e.g. 'tekst zoals afgedrukt in psalmboekuitgaven, spelling 1954'",
    "retrieved": "2026-09-26",
    "note": "Anything a reviewer must know: second source used to cross-check, known deviations"
  },
  "rights": "One Dutch sentence why this is public domain, e.g. 'Tekst uit 1563 in de Nederlandse vertaling van Petrus Datheen (1566); publiek domein.'",
  "sections": [
    {
      "id": "zondag-1",                     // kebab-case, unique within the work, stable forever
      "number": 1,                          // integer or null
      "label": "Zondag 1",                  // short label shown in the table of contents
      "title": "Van de enige troost",       // optional heading (null if the source has none)
      "blocks": [
        { "type": "heading",   "text": "Verwerping der dwalingen" },
        { "type": "paragraph", "number": 1, "text": "…", "refs": ["Rom. 14:7, 8"] },
        { "type": "qa", "number": 1, "question": "…", "answer": "…", "refs": ["Rom. 14:7, 8", "1 Kor. 6:19"] }
      ]
    }
  ]
}
```

Rules
- `text`/`question`/`answer`: plain text, exactly as the source prints it (same wording, same spelling). No HTML, no markdown. Paragraph breaks inside one answer/paragraph: `\n\n`. Numbered sub-items stay inline as printed.
- `number` on a paragraph = article/verse number printed in the source (DL artikel 1, Verwerping 1 …); omit when unnumbered.
- `refs`: Scripture references exactly as printed (e.g. "Rom. 14:7, 8", "1 Kor. 6:19", "Joh. 3:16-18"). Omit the key when there are none. Do not put reference text into `text` when the source prints it as a margin/footnote reference; do keep it inline when it is part of the sentence.
- Footnote markers (a, b, 1) are removed from the text; the references they pointed to go into `refs` of that block.
- Never paraphrase, modernise or "correct" wording. Fix only obvious OCR/scan errors, and only when a second source confirms the reading.
