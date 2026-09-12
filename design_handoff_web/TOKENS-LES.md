# Tokens — lesflow

De lesschermen bestaan in **licht** en **donker**. Zelfde maten, zelfde componenten, ander palet. Bouw één set componenten en stuur ze met een thema-attribuut aan (`data-theme="dark"` op de leswrapper of `.dark` van Tailwind).

De lichte variant gebruikt de tokens uit `TOKENS.md`. Hieronder staat wat in de lesflow extra is, plus de donkere tegenhangers.

| Rol | Licht | Donker |
| --- | --- | --- |
| achtergrond | `#FFFFFF` | `#0B1E1E` |
| zijbalk | `#FFFFFF` | `#081717` |
| randen en hairlines | `#E5E7EB` | `rgba(255,255,255,.08)` |
| kaart / veld | `#F9FAFB` | `rgba(255,255,255,.04)` |
| kaartrand | `#E5E7EB` | `rgba(255,255,255,.10)` |
| primaire tekst | `#111827` | `#E9F1F0` |
| secundaire tekst | `#6B7280` | `#9BB2B0` |
| meta | `#9CA3AF` | `#8AA3A1` |
| accent (kopjes, links) | `#0F766E` | `#2DD4BF` |
| bijbeltekst | `#1F2937` | `#EAF2F1` |
| commentaartekst | `#374151` | `#C9D9D7` |
| actief zijbalkitem | `rgba(13,148,136,.10)` | `rgba(45,212,191,.12)` |
| actieve stap (vlak) | `rgba(13,148,136,.07)` | `rgba(45,212,191,.06)` |
| citaatblok | `#F0FDFA` | `rgba(13,148,136,.10)` |
| invoerveld | `#F3F4F6` | `rgba(255,255,255,.05)` |
| vinkje afgeronde stap | `#059669` | `#34D399` |
| vervaging onderaan | `linear-gradient(rgba(255,255,255,0),#FFFFFF 76%)` | `linear-gradient(rgba(11,30,30,0),#0B1E1E 76%)` |

Ongewijzigd in beide thema's: de **primaire knop** en de **AI-pil** (`#0D9488` met witte tekst), de **2 px actieve randen en onderstrepingen** (`#0D9488`), en de gouden accenten op het afrondingsscherm (`#CA9A16` met `#422E04`).

Let op het accentverschil: op wit is `#0D9488` te licht voor kleine tekst (3,1:1), dus kopjes en links in de lichte variant gebruiken `#0F766E`. Op donker is `#0F766E` juist te donker, dus daar `#2DD4BF`. Vlakken blijven in beide gevallen `#0D9488`.

```css
[data-theme="dark"]{
  --les-bg:#0B1E1E; --les-sb:#081717;
  --les-line:rgba(255,255,255,.08); --les-card:rgba(255,255,255,.04); --les-card-line:rgba(255,255,255,.10);
  --les-ink:#E9F1F0; --les-muted:#9BB2B0; --les-faint:#8AA3A1;
  --les-accent:#2DD4BF; --les-scripture:#EAF2F1; --les-body:#C9D9D7;
  --les-nav-active:rgba(45,212,191,.12); --les-step-active:rgba(45,212,191,.06);
  --les-quote:rgba(13,148,136,.10); --les-input:rgba(255,255,255,.05); --les-check:#34D399;
}
```
