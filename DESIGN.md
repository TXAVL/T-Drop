---
name: T-Drop
description: A near-black glass shelf that slides out from the screen edge, quiet until needed.
colors:
  void: "#000000"
  glass-ink: "#0a0a0d"
  glass-frost: "rgba(12, 12, 16, 0.72)"
  surface: "#141414"
  surface-hover: "#1c1c1c"
  chip-idle: "#27272a"
  hairline: "rgba(255, 255, 255, 0.06)"
  hairline-strong: "rgba(255, 255, 255, 0.12)"
  divider: "rgba(255, 255, 255, 0.08)"
  text-primary: "#ffffff"
  text-secondary: "rgba(255, 255, 255, 0.78)"
  text-tertiary: "rgba(255, 255, 255, 0.48)"
  accent-violet: "#8b5cf6"
  accent-violet-glow: "rgba(139, 92, 246, 0.55)"
  danger: "#ff453a"
  ocr-cyan: "#06b6d4"
typography:
  body:
    fontFamily: "Inter, Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
  caption:
    fontFamily: "Inter, Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "10px"
    fontWeight: 500
  mono:
    fontFamily: "JetBrains Mono, Cascadia Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  blade: "24px"
  card: "18px"
  control: "10px"
  pill: "999px"
spacing:
  gap: "12px"
  pad: "14px"
  card-y: "12px"
  card-gap: "8px"
components:
  pill-idle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 2px"
  pill-active:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    padding: "6px 2px"
  item-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
  setting-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    size: "30px"
---

# Design System: T-Drop

## Overview

**Creative North Star: "The Sliding Black Glass"**

T-Drop's shelf is a sheet of near-black glass that slides in from the screen edge over whatever the user is doing. It is silent at rest and instant when called. The system is an Operate surface: scanability, speed and consistency come first, and expression lives in precise detail, not decoration.

Depth comes from stacked blacks and soft frosting, not from boxes and shadows. Large radii, pill controls and short motion make it feel soft yet exact. The accent is rare; the working palette is black, white and grey, so any colour that appears means something.

**Key Characteristics:**
- Near-black layered surfaces, text is white at three opacities.
- Big radii (24 / 18 / pill), almost no borders, almost no card shadows.
- One theme-swappable accent used only for active, focus and glow.
- Short, precise motion (140ms / 240ms, ease-out); spring only for small tactile moments.
- Built for any language: long strings and RTL must not break a layout.

## Colors

Strictly neutral black and white with one rare violet accent that the user can retheme at runtime.

### Primary
- **Rare Violet** (#8b5cf6): the default accent. Appears on active state, focus and a soft glow (rgba(139, 92, 246, 0.55)). `theme.ts` can swap it at runtime, so never hard-code it in a component; read `--accent`.

### Secondary
- **OCR Cyan** (#06b6d4, ink #a5f3fc): the signature of the OCR / Image Studio tools. Not for general UI.

### Neutral
- **Void Black** (#000000): the deepest core and the segment-control track base.
- **Glass Ink** (#0a0a0d): the shelf body (blade).
- **Frosted Glass** (rgba(12, 12, 16, 0.72)): translucent backdrop behind blurred layers.
- **Raised Charcoal** (#141414): cards, chips, pill rest state.
- **Lifted Charcoal** (#1c1c1c): hover for cards and pills.
- **Chip Slate** (#27272a): idle chip in the filter segment.
- **Whisper Hairline** (rgba(255, 255, 255, 0.06)) and **Strong Hairline** (0.12), **Divider** (0.08): used only where a divider is truly needed.
- **Text**: pure white (#ffffff), secondary 78%, tertiary 48%.
- **Danger Red** (#ff453a): destructive and failure only.

### Named Rules
**The Rare Accent Rule.** The accent covers only active, focus and glow states, on roughly 10% of any screen. Its rarity is how the user reads state.
**The No Flat #000 Body Rule.** The shelf body is glass ink (#0a0a0d), stacked on raised charcoal; avoid one flat black plane.

## Typography

**Display / Body Font:** Inter (fallback Plus Jakarta Sans, system UI)
**Mono Font:** JetBrains Mono (fallback Cascadia Mono)

**Character:** A crisp, neutral UI sans chosen for clean Vietnamese and Latin glyphs. No display face: the product is a tool, hierarchy comes from weight and opacity. All sizes scale through `--font-scale`.

### Hierarchy
- **Body** (400, 14px × font-scale, 1.45): clipboard text, descriptions.
- **Label** (500–600, 12px, 1.2): pills, setting names, buttons. Active labels go to 600.
- **Caption** (500, 10–11.5px): resolutions, meta tags, counters.
- **Mono** (400, 12px): keys, machine codes, shortcuts, logs.

### Named Rules
**The Scaled Type Rule.** Every font size is `calc(Npx * var(--font-scale, 1))`. Never fix a size in px alone.
**The Long-String Rule.** Labels must wrap or ellipsize; any translation may be 40% longer than English.

## Layout

A single vertical shelf, 320px wide (`--panel-width`), docked to the left, right or top edge. Internal rhythm is a 12px gap and 14px padding; cards are separated by 8px. Cards stack in one column and are scanned top to bottom. The settings sheet reuses the same card stack. There are no breakpoints: the window is fixed-width and adapts by edge placement (the radius flips to the free side). RTL languages mirror the shelf layout.

## Elevation & Depth

Tonal layering. The shelf body is the darkest plane, cards sit one step lighter, hover lifts one more step. Card shadows are off by default (`--shadow-card: none`); the shelf has one structural shadow to separate it from the desktop behind it. Frosted blur (10–28px backdrop-filter) is used on overlays and flyouts only.

### Shadow Vocabulary
- **Blade edge** (`box-shadow: 14px 0 40px rgba(0,0,0,.75), 0 0 1px 1px rgba(255,255,255,.08)`): separates the shelf from the screen behind it.
- **Item whisper** (`0 2px 8px rgba(0,0,0,.22)`): a barely-there lift on clipboard cards.

### Named Rules
**The Tonal-First Rule.** Raise a surface by making it lighter, not by adding a shadow. Shadows exist only on the shelf edge and on cards that need to float over content.

## Shapes

Big, soft, consistent. The shelf corners 24px on its free edge, cards 18px, interactive controls are full pills (999px) and small controls 10px. Borders are avoided; a 1px whisper hairline is allowed on cards. Icon buttons are 30px circles.

## Components

### Pills / Segmented control
- **Shape:** full pill (999px), 6px 2px padding, 12px label.
- **Idle:** raised charcoal (#141414) with 72% white text.
- **Hover:** lifted charcoal (#1c1c1c), text to full white.
- **Active:** inverts to a solid white pill with black text and weight 600. This is the primary "selected" signal, not the accent.

### Clipboard item card
- **Shape:** 18px radius, raised charcoal, 1px whisper hairline, 8px bottom margin.
- **Behavior:** the whole card is draggable out of the shelf; click copies. Hover lifts to #1c1c1c with a 160ms ease.

### Setting card
- **Shape:** 18px radius, #141414, 12px 14px padding, 8px gap, no border.

### Icon button
- **Shape:** 30px circle, transparent at rest, 78% white icon; hover fills with the chip colour and the icon goes full white (140ms).

### Flyouts and overlays
- Frosted glass (blur 10–28px) over the shelf for preview, the settings sheet and tooltips.

## Do's and Don'ts

### Do:
- **Do** read colour, radius and motion from the CSS custom properties in `src/styles/tokens.css`.
- **Do** use the white-on-black inverted pill for "selected".
- **Do** scale all type with `--font-scale` and test each screen with long strings and an RTL language.
- **Do** keep motion between 140ms and 240ms with `--ease-out`.

### Don't:
- **Don't** hard-code `#8b5cf6`; the user can change the accent.
- **Don't** use accent colour for decoration or large fills.
- **Don't** add heavy borders or drop shadows to cards; layer tone instead.
- **Don't** hard-code Vietnamese or English text; all strings go through `t()`.
- **Don't** slow the shelf open: no animation or effect that delays the first paint.
