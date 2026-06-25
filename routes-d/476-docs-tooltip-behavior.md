---
title: Docs Tooltip Behavior
description: How tooltips work in the Nextellar documentation site, including trigger behavior and keyboard accessibility
---

# Docs Tooltip Behavior

Some terms and UI elements in the Nextellar docs include hover tooltips that surface brief definitions or contextual notes without requiring navigation away from the current page.

---

## How Tooltips Trigger

Tooltips appear when you hover over an underlined or highlighted term. On touch devices, a tap toggles the tooltip open and closed.

---

## Keyboard Accessibility

Tooltips are fully keyboard accessible:

- **Tab** to focus the element carrying the tooltip.
- **Enter** or **Space** to open the tooltip if it does not open on focus automatically.
- **Escape** to dismiss an open tooltip.
- Screen readers announce the tooltip content via `aria-describedby` when the trigger element receives focus.

---

## Notes

- Tooltips are intentionally brief — one or two sentences. For full definitions, follow the linked term to the glossary.
- If a tooltip appears clipped near the edge of the viewport, scroll slightly or resize the window; the tooltip repositions automatically where space allows.

**Related:** [Glossary](/docs/guides/glossary)
