# Accessibility

VocabSprite uses native buttons, labels, inputs, selects, headings, details, status
and alert regions. The main navigation and compact-card window actions have accessible
names. Feedback includes text/symbols rather than color alone. `:focus-visible` uses
a high-contrast ring, and source order follows the visual flow.

Expanded and onboarding views use the standard Windows title bar so moving, minimizing,
maximizing, closing, and resizing follow familiar operating-system interactions. Short
windows keep the navigation rail independently scrollable.

Compact cards do not autofocus an input when they appear. The named gear button opens
an in-flow, keyboard-operable quick-settings region instead of a clipped floating
popover; size and color choices expose pressed state, and every slider, select, and
switch has an accessible name. On short work areas the native card scrolls while its
title bar remains available. After the learner deliberately clicks the card, keyboard
shortcuts 1–4 select feedback; Escape closes the detail dialog. All onboarding and
Settings controls are keyboard operable.
The high-volume study controls expose named custom buttons, labelled number inputs,
integer ranges, invalid-state semantics, and a one-click return to the common slider.

Themes include light, dark/system, and high contrast. Motion can be Off, Low, or
Standard, while `prefers-reduced-motion` always wins. Every motion recipe becomes a
static semantic presentation when motion is disabled; no meaning depends only on
animation. Images have local alt text and a textual scene fallback. Pronunciation
has a named button, selectable system voice/rate, and a visible no-voice fallback.
The optional hint control defaults off; when enabled, the learner must explicitly ask
for a non-answer cue, which is announced through a polite status region.

Automated component/E2E checks cover focus, reduced motion, labelled controls, and
mode journeys. They do not replace manual Windows checks with Narrator, keyboard-only
navigation, 200% scaling, high contrast, and a real reduced-motion setting. Those
manual checks remain a release checklist item in the audit report.
