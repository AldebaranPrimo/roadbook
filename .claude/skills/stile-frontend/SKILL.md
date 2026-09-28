---
name: stile-frontend
description: Named list of default visual patterns to avoid when producing frontend work without a design brief - a page, a view, a layout, a mockup, a dashboard, a landing, a form screen, a custom component - in HTML/CSS, Vue, Tailwind or plain CSS. Use it on your own before writing any UI markup or styles, even if the user only says "fammi una pagina", "una schermata", "un mockup", "una dashboard", "rendila più bella", "un layout per...", and never says "stile" or "design". Not for backend-only slices, not for changes inside an existing screen that only touch logic, not where a component library (Vuetify, PrimeVue) already provides the component: there the library's component wins and is not restyled.
---

# stile-frontend

Asked for frontend work without design direction, the model falls back on a few recognisable default styles, and a general instruction such as "avoid a generic look" only swaps one default for another. What works is naming the specific patterns to avoid, then checking which ones the first result used and extending the list (official guide *Prompting Claude Opus 5.5*, section *Frontend design defaults*, read on 2026-09-28).

## Flow

1. **Scope.** Does the task produce new markup or styles (page, view, layout, mockup, custom component)? If it only changes logic inside an existing screen, stop here. Where a component library governs (Vuetify, PrimeVue: buttons, inputs, tables, dialogs, menus), use the library's component as is: this list applies to the custom layout around it, to mockups and to plain HTML/CSS work.
2. **Design brief.** If the user or the project gives a direction (per-repo `CLAUDE.md`, a design system, a mockup, the `frontend-design` agent), follow it: this skill only says what not to do by default.
3. **Produce the UI avoiding every pattern in the list below.**
4. **Check the result** against the list before showing it. A pattern found is fixed before the stop point of `chiusura-slice` (Standard axis).
5. **Maintenance.** When a result shows an undesired default style that is not in the list yet, Claudio reports it and proposes the addition; Marco decides. The list lives in the master kit and propagates identical to the satellites (M-04); a project's own preferences (a client who wants pill buttons) go in its per-repo `CLAUDE.md`, never here.

## Patterns to avoid (by name)

Initial list, from the official guide (2026-09-28):

1. Cream or off-white page background.
2. Italic accent words in headlines.
3. Numbered section labels ("01 / 02 / 03").
4. Labels or eyebrows set in a monospace font.
5. Pill-shaped buttons (fully rounded ends).

Additions (date, project, who asked): none yet.

## Principles

- Naming beats adjectives: "no pill buttons" works, "not generic" does not.
- The list grows from observed results, one pattern at a time, never from taste in the abstract.
- The component library wins inside its components; the list governs what is built around them.
- Exceptions belong to the per-repo, not to this list.

## Honesty

If a pattern is required by the brief or by the library, say so instead of silently keeping it. If the check in step 4 was not done, say it.
