# Componenten

Bouw deze in fase 2, vóór de routes. Elke pagina gebruikt ze; geen pagina schrijft zijn eigen variant.

| Component | Props | Spec |
| --- | --- | --- |
| `AppShell` | `title`, `active`, `children`, `padded?` | Zijbalk + kopbalk + body. `padded={false}` voor `/lezen` en `/profiel/boom`: die vullen de body zonder padding. |
| `Card` | `children`, `className` | wit, rand 1 px `line`, radius 16. Geen schaduw. |
| `StatCard` | `label`, `value`, `delta?`, `deltaNegative?`, `icon?` | padding 15 17. Label Inter 400 · 12 px `ink-muted`; waarde Inter 700 · 24–26 px ls −0.5; delta Inter 600 · 11.5 px `success` (of `danger`). |
| `Chip` | `label`, `active` | radius 9999, padding 8 15, Inter 13. Actief: `teal` vlak, witte tekst, 600. Inactief: wit, rand 1 px `line`, `ink-body`, 500. |
| `Pill` | `label`, `tone` (`neutral`/`gold`/`warn`) | radius 9999, padding 6 12, Inter 700 · 12.5 px. Gold gebruikt `--grad-pro-pill` met rand `#E6D2A0` en ink `#4A3506`. |
| `ProgressBar` | `value`, `height?` (4/6/8), `done?` | spoor `line`, vulling `teal` (of `success-fill` bij 100 %), radius 9999. |
| `SectionHeading` | `title`, `meta?`, `action?` | Titel Inter 700 · 16 px; meta Inter 400 · 12.5 px `ink-faint`; actie rechts Inter 600 · 13 px `teal` met `ChevronRight` 14. |
| `ListRow` | `thumb`, `title`, `meta`, `progress?`, `action` | padding 12–13 18, bovenrand 1 px `line-soft`, gap 14. Thumb 44–46 radius 10 met bannergradiënt. |
| `StudyCard` | `title`, `meta`, `gradient`, `badge?`, `progress?` | `Card` met `overflow:hidden`: bovenin een vlak van 88–108 px met de bannergradiënt, daaronder padding 12 14: titel Inter 700 · 14 px, meta Inter 400 · 11.5 px `ink-faint`. |
| `TreeAvatar` | `size`, `ring?`, `level?` | Ronde avatar met `--grad-sky`, `overflow:hidden`. In het prototype met gradiënten benaderd; in de app rendert de bestaande boomcomponent hierin. `ring` = 3–4 px `gold`. |
| `IconButton` | `icon`, `active?` | 34–38 px vierkant, radius 8–10. Actief: `teal-wash` met `teal` glyph. |
| `HeatGrid` | `levels: number[]`, `columns` | Raster met `gap:5`, vierkante tegels (`padding-top:100%`), radius 4, kleur uit de vijf heat-stappen. |
| `WeekBars` | `values: number[]`, `todayIndex` | Staven `flex-1`, radius `7px 7px 0 0`, hoogte max 76 px, kleuren `--bar-*`. Labels Zo–Za Inter 11.5; vandaag 600 `teal-dark`. |
| `Tabs` | `items`, `value`, `onChange`, `variant` | `underline` (actief `teal` + 2 px onderstreping) of `segmented` (actief `teal` vlak, radius 9). |
| `FadeBottom` | — | `absolute inset-x-0 bottom-0 h-24` met `linear-gradient(rgba(255,255,255,0),#fff 78%)`, `pointer-events-none`. Alleen in de leespanelen. |
