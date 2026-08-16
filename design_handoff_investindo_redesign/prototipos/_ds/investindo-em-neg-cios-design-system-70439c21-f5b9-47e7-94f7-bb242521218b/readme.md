# Investindo em Negócios — Design System

**Investindo em Negócios (IN)** is a Brazilian personal-finance education brand by **Henrique Santos**. It lives primarily on YouTube ("Novos vídeos toda semana") and social channels, with a marketing website offering an investment simulator ("Simulador de Investimentos") and a community sign-up ("Quero fazer parte"). Mission copy: *"Aprenda, invista, conquiste a liberdade financeira."*

Brand identity by Claudiney Sandro (logo presentation, 15 pages).

## Sources
- `uploads/Apresentação Marca - Henrique.pdf` — brand/logo presentation (pages extracted to `extract/brand-p01..15.png`)
- `uploads/Logo IN.pdf` — logo file (same deck)
- `uploads/Capa YT.jpg` — YouTube channel banner (2048×1152)
- `uploads/Foto Perfil.jpg` — profile avatar (monogram on navy)
- `uploads/Wallpaper.jpg` — candlestick pattern background
- `uploads/In Azul.jpg / In Branco.jpg / IN Preto.jpg / In Verde.jpg` — flat color swatches

No codebase or Figma was provided; the website UI kit is a faithful recreation of the site mockup on page 13 of the brand presentation.

## The mark
The IN monogram = letter **I** + **candlestick chart bars** + letter **N** (page 3 of the deck shows the construction). The I is a green candlestick with wicks; the N sits tight against it. Lockups: horizontal (mark + "Investindo em Negócios" two-line wordmark), stacked, and monogram alone. In the wordmark, "Investindo" and "Negócios" are off-white ("Negócios" heavier weight), "em" is green.

## CONTENT FUNDAMENTALS
- **Language:** Brazilian Portuguese.
- **Voice:** direct, aspirational, imperative — speaks to "você" (implied), never formal "o senhor". Verbs lead: *"Aprenda, invista, conquiste a liberdade financeira"*, *"Quero fazer parte"* (CTA voiced as the user's own words), *"Siga nossas redes sociais"*.
- **Themes:** financial freedom (*liberdade financeira*), prosperity, journey/transformation (*"Seu caminho para a liberdade financeira começa aqui"*, *"jornada transformadora"*).
- **Casing:** sentence case for headlines and body; UPPERCASE reserved for primary CTA buttons ("QUERO FAZER PARTE").
- **Emoji:** none observed. Don't use.
- **Vibe:** trustworthy market-professional, but warm and accessible — lifestyle photography of relaxed, smiling people, not suits.

## VISUAL FOUNDATIONS
- **Colors:** navy `#002E3E` (dominant background), off-white `#EDEBEC`, green `#349063` (accent, CTAs, highlights), black `#262626`. Dark-first: nearly every surface is navy; light surfaces are secondary. One accent only (green) — no other hues.
- **Type:** **Visby CF** (Thin→Heavy). Binaries NOT provided — **Poppins substitutes** (closest Google Fonts geometric). Headlines demi-bold→heavy, tight leading; body regular. Green used to highlight a word inside headlines (like "em" in the wordmark).
- **Backgrounds:** flat navy, subtle navy gradients (lighter top-right), and the tone-on-tone **candlestick pattern** (`assets/backgrounds/wallpaper-pattern.jpg`) — outlined candlesticks slightly lighter than the navy field, often with vignette. Photography splashes: warm lifestyle photos.
- **Motifs:** candlestick bars everywhere — in the logo, patterns, thin-line chart overlays with node dots. Green "capsule" highlight behind text ("Novos vídeos" tag on the YT banner).
- **Buttons/CTAs:** green fill, white uppercase label with wide tracking, pill/rounded corners; hover darkens green.
- **Radii:** modest — pills for CTAs/tags, ~10–16px for cards.
- **Shadows:** soft, large, dark-tinted; used sparingly on cards/mockups.
- **Borders:** hairline, low-opacity off-white on dark.
- **Animation:** none specified in sources — keep to quick fades/eases (fast, understated); no bounces.
- **Imagery:** warm-lit lifestyle photography (people smiling, phones/laptops); device mockups on navy or gray; grain-free.
- **Iconography:** see below.

## ICONOGRAPHY
- Sources show only **social glyphs** (WhatsApp, Instagram, YouTube) rendered as simple line icons in green or off-white, plus QR codes on posters. No proprietary icon set, no icon font, no emoji.
- Approach: use a clean geometric line icon set at 1.5–2px stroke. **Lucide (CDN) is the flagged substitute** — matches the geometric, rounded feel. No brand icon files existed to copy.
- The candlestick motif may be used decoratively (pattern backgrounds, thin chart lines) — always tone-on-tone, never noisy.

## Fonts — substitution flag
⚠️ **Visby CF is the true brand font but no font files were provided.** Poppins (Google Fonts) is loaded as the nearest match. If you have Visby CF licenses/files, add the `@font-face` rules in `tokens/fonts.css` and drop the binaries in `assets/fonts/`.

## Index
- `styles.css` — global entry (imports everything under `tokens/`)
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`
- `assets/logo/` — `lockup-horizontal-light.png`, `lockup-stacked-light.png`, `monogram-light.png` (for dark bg), `monogram-dark.png` (for light bg)
- `assets/backgrounds/` — `wallpaper-pattern.jpg` (candlestick pattern), `capa-youtube.jpg`, `gradient-hero.png`
- `assets/brand/` — `foto-perfil.jpg` (avatar), `logo-construction.png`
- `components/` — forms (`Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`), display (`Card`, `Badge`, `Tag`), navigation (`Tabs`), feedback (`Dialog`, `Toast`, `Tooltip`)
- `ui_kits/website/` — marketing-site recreation (hero, simulator, nav) from brand-deck p13
- `guidelines/` — foundation specimen cards (Design System tab)
- `extract/` — brand-deck page renders (reference)

### Intentional additions
No component inventory existed in the sources (brand-guidelines-only run), so a standard primitive set was authored against the visual foundations above.
