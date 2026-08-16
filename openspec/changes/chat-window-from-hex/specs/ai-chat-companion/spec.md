## ADDED Requirements

### Requirement: The companion MUST render correctly on a page it does not own

The chat surface MUST position itself without depending on the host page's layout
structure, and MUST carry its own close control.

The companion is injected on every Nextcloud page, including third-party office
editors that provide none of the app-content structure `NcAppSidebar` positions
against. Measured on the Euro-Office editor, the sidebar form docked to the LEFT edge
over the editor's own rail and rendered without a reachable close control.

#### Scenario: The window appears in the expected corner on a third-party page

- **GIVEN** the companion is loaded on a page belonging to another app
- **WHEN** the chat is opened
- **THEN** the window MUST appear anchored to the companion's configured corner
- **AND** MUST NOT dock to the opposite edge

#### Scenario: The window carries its own close control

- **GIVEN** an open chat window
- **WHEN** its titlebar is rendered
- **THEN** a close control MUST be present within the window

### Requirement: The launcher MUST remain visible while the chat is open and MUST toggle it

The hex MUST be rendered whether or not the chat is open, and activating it MUST close
an open chat and open a closed one.

The launcher is the one control guaranteed to be present regardless of what the host
page does to our markup — it is fixed-position and explicitly styled, and it has
survived every host tested. A launcher that disappears while its target is open is
also a dead end: the affordance used to summon something should dismiss it.

#### Scenario: The hex stays while the chat is open

- **GIVEN** the chat window is open
- **WHEN** the page is rendered
- **THEN** the hex MUST still be visible

#### Scenario: Clicking the hex again closes the chat

- **GIVEN** the chat window is open
- **WHEN** the hex is activated
- **THEN** the chat window MUST close

#### Scenario: The hex and the window do not overlap

- **GIVEN** the chat window is open
- **WHEN** both are rendered in the same corner
- **THEN** the hex MUST remain fully visible and clickable
- **AND** the window MUST NOT cover it

### Requirement: The window MUST be anchored to the launcher's corner

The window MUST use the same corner as the launcher, so that moving the launcher moves
the window with it.

A fixed window corner would place the window across the page from the button that
opened it whenever a consumer configures a different launcher position — which reads
as a bug rather than a limitation.

#### Scenario: A relocated launcher takes its window with it

- **GIVEN** a companion configured to a non-default corner
- **WHEN** the chat is opened
- **THEN** the window MUST appear in that same corner

### Requirement: The window MUST be titled with the agent

The titlebar MUST show the selected agent's name and an icon, not the product name.

The product name is identical on every page for every agent. What a user needs before
typing is which agent will answer.

#### Scenario: The title names the selected agent

- **GIVEN** an agent is selected
- **WHEN** the window is rendered
- **THEN** the titlebar MUST show that agent's name

#### Scenario: The title is never empty

- **GIVEN** the agent list has not loaded, or failed to load
- **WHEN** the window is rendered
- **THEN** the titlebar MUST still name something
- **AND** MUST NOT render an empty title

### Requirement: Titlebar controls MUST be icon-only with accessible labels

Close, session selection and agent selection MUST be presented as icons, each carrying
a label reachable on hover and by assistive technology.

The window is ~380px wide and must also show the agent's name; three labelled controls
do not fit. Dropping the labels entirely would make the controls unusable to screen
readers.

#### Scenario: Every titlebar control is labelled without showing text

- **GIVEN** the titlebar is rendered
- **WHEN** its controls are inspected
- **THEN** each MUST expose an accessible label
- **AND** MUST NOT render that label as visible text alongside the icon

### Requirement: Session and agent selection MUST be menus, not inline controls

The agent picker and the recent-session list MUST be reached from titlebar menus
rather than occupying the conversation area.

Inline, they consumed most of the first screen before a single message was visible.

#### Scenario: The conversation area is not occupied by selectors

- **GIVEN** a newly opened chat with no messages
- **WHEN** the window is rendered
- **THEN** the agent picker MUST NOT be rendered inline in the conversation area
- **AND** the recent-session list MUST NOT be rendered inline in the conversation area

### Requirement: The hexagon MUST remain equilateral at any size

The launcher's width and height MUST hold the ratio √3:2.

The hexagon is a `clip-path` polygon whose six sides are equal only at that ratio.
Changing one dimension alone silently yields a squashed hexagon that still renders, so
nothing fails — it just stops being the brand mark.

#### Scenario: The launcher keeps its ratio

- **GIVEN** the launcher at its configured size
- **WHEN** its dimensions are inspected
- **THEN** width:height MUST be √3:2 within rounding
