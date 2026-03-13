# UI Design Principles

## 1. Purpose

This document defines the UI design principles for AI Phone Assistant so future interface changes stay consistent with the product's supervision workflow.

The product is not a generic chatbot. It is a realtime operator console for monitoring and steering a live AI voice call.

## 2. Primary UI Goal

The UI should help the supervisor do three things quickly:

- understand what is happening right now
- change the AI's behavior with minimal friction
- stay oriented during a live call without visual clutter

## 3. Information Hierarchy

The UI should prioritize information in this order:

1. connection state and current model
2. live transcript and system events
3. rapid whisper intervention
4. core configuration
5. advanced diagnostics

Implication:

- transcript and whisper controls are primary
- advanced context diagnostics are secondary and should remain collapsible

## 4. Control Placement

### 4.1 Whisper First

The whisper command bar is a core supervision control, not a secondary action.

Therefore it should:

- remain fixed or sticky near the bottom of the viewport
- stay usable while the supervisor scrolls through transcript history
- support rapid repeated input

### 4.2 Settings Separate From Monitoring

Settings should be grouped away from the transcript stream and framed as configuration rather than live conversation content.

Configuration sections should be visually aligned and easy to scan.

## 5. Language Design

The UI must clearly distinguish two different language concepts:

- interface language: the language used by the software UI
- AI spoken language: the language the model should use in voice output

These must never be conflated in labels or layout.

## 6. Monitoring Design

Voice input and voice output cards exist to answer:

- is audio activity present?
- is the system currently listening or speaking?

They should not duplicate large transcript content if the transcript stream already shows that information.

Therefore the preferred design is:

- compact cards
- clear labels
- level meters
- simple state badges

## 7. Transcript Design

The transcript area is the main historical record of the call.

It should contain:

- finalized user speech
- finalized assistant speech
- supervisor whisper messages
- system events
- live preview text when useful for monitoring

The transcript should feel readable before it feels decorative.

## 8. Visual Contrast

Readable contrast is mandatory in both light and dark themes.

This especially applies to:

- transcript bubbles
- timestamps and role labels
- muted helper text
- cards that use tinted backgrounds

Decorative softness must never reduce legibility of core conversation content.

## 9. Progressive Disclosure

Advanced information should be available without overwhelming the default view.

Examples:

- session context
- model-specific diagnostics
- advanced transport details

These should be hidden behind expand/collapse affordances unless they are urgently actionable.

## 10. Responsiveness

The layout should work across wide desktop supervision and narrower windows.

On smaller widths:

- controls should stack naturally
- transcript must remain readable
- the sticky whisper bar must remain usable
- settings should reflow without causing awkward alignment

## 11. Design Biases To Preserve

When there is a tradeoff, prefer:

- clarity over density
- speed over ornamental layout
- alignment over decorative asymmetry
- supervision workflow over “dashboard look”
- collapsible complexity over always-visible diagnostics

## 12. Practical Rule Of Thumb

Before adding any new UI block, ask:

- does this help the operator act faster?
- does it belong in the always-visible layer?
- is it duplicating information already visible elsewhere?
- will it still read clearly in both light and dark themes?

If the answer to the second or third question is unfavorable, the new UI should probably be collapsed, simplified, or moved.
