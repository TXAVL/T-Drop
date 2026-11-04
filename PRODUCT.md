# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Electron desktop app for Windows; the UI is a React renderer, so web design rules apply.)

## Users

Windows users in general: office workers, students, developers. They copy and paste all day and want a fast clipboard history they can summon instantly (hover trigger or Alt+C hotkey), plus quick image and text tools. Audience is Vietnamese-first but international, with the UI available in 31 languages including RTL (Arabic, Persian, Hebrew).

## Product Purpose

T-Drop is a clipboard shelf: it keeps clipboard history, lets users pin items and drag content out, and bundles Image Studio (convert, compress) and OCR text extraction. Success is the shelf opening instantly and the user finishing their paste or conversion task without leaving what they were doing.

## Positioning

- Instant shelf: opens on hover or hotkey, content can be dragged straight out.
- OCR (Vietnamese and English) and Image Studio run locally on the machine, so content stays private.
- Free and open-source core. VIP (30 days) and PREMIUM (60 days) licenses unlock more features.
- Bought via VietQR bank transfer and activated automatically, with a receipt issued.

## Operating Context

Runs in the Windows tray and appears over whatever the user is working in. License purchase and renewal go through VietQR, a SePay webhook, and Supabase; receipts are PDFs. Updates ship through GitHub Releases with an in-app updater. A separate admin site (outside this repo) manages licenses.

## Capabilities and Constraints

- Clipboard history, pinning, search, emoji picker, QR sharing, text case tools, backup (.txa), system logs.
- Image Studio: convert, compress, OCR (OCR gated to VIP/PREMIUM).
- Licensing: machine-code bound keys, renewal stacks days, receipts with hand-drawn signature.
- All strings go through the i18n layer (`t()` in the renderer, `mt()` in the main process). Vietnamese must not be hardcoded outside the documented exceptions (dev logs, VND receipt, VND formatting).
- Clipboard data stays on the machine; only license and payment calls reach Supabase.

## Brand Commitments

- Name "T-Drop" and the existing app logo stay as they are.
- Every surface must tolerate long translations and right-to-left layout.
- Low latency is part of the brand: the shelf must feel instant.

## Evidence on Hand

- Changelog and download pages (docs in this repo).
- Translations in `t-drop-translations/` (31 languages).
- No testimonials, user counts or benchmarks are recorded; do not invent them.

## Product Principles

1. Instant beats impressive: speed and low friction come before decoration.
2. Private by default: user content stays local.
3. Free core, honest upgrade: paid features are clearly marked and never block basic use.
4. Works in every language: no UI that only fits Vietnamese or English.
5. Quiet presence: it appears over the user's work and gets out of the way.
