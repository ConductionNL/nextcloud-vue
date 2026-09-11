<!--
  CnFlowCanvasMessages — everything the flow editor has to tell the author, on
  the canvas.

  WHY ONE AREA, AND WHY HERE
  --------------------------
  Adding a step to a PUBLISHED flow is refused. The refusal used to render as a
  note card at the top of the Steps tab in the right sidebar: past the palette,
  past the search box, on the other side of the screen from the click that
  caused it. Reported 2026-09-06 by an author who added a step, saw the canvas
  do nothing, and never found the card.

  So there is ONE area, pinned to the canvas, and it carries both kinds of
  message: the action refusals and the standing conditions. Splitting them into
  transient toasts and a persistent status strip was the alternative and was
  rejected deliberately: two places to look is the defect, and a smaller version
  of it is still it.

  WHAT CARRYING BOTH KINDS COSTS, AND HOW EACH COST IS PAID
  ---------------------------------------------------------
  - A STANDING CONDITION MUST NOT FADE. Nothing here is on a timer. A message
    lives exactly as long as the parent keeps deriving it, so "no end step"
    disappears when an end step is added and not one moment sooner. Standing
    messages also carry no dismiss control: offering to hide a fact that stays
    true is worse than not offering anything.
  - A ONE-OFF REFUSAL MUST HAVE A WAY OUT. It carries a dismiss control, and
    dismissing it clears the SOURCE in the store rather than a local "hidden"
    flag, so nothing can revive a message the author already closed. The parent
    also clears the last refusal when the next edit succeeds.
  - MESSAGES MUST NOT ACCUMULATE. `id` is identity: a repeat REPLACES. Firing
    the same refusal five times leaves one card, because the author has one
    thing wrong and not five. The rendered list is capped on top of that, worst
    first, with the remainder counted out loud rather than truncated silently.
  - IT MUST NOT SWALLOW THE CANVAS. The container is `pointer-events: none` and
    each card opts back in, so the gaps between cards belong to the graph
    underneath. Asserted against the stylesheet in
    `tests/css/flowCanvasMessagesPointerEvents.spec.js` and against a real
    browser in `e2e/flow-messages.e2e.js`.

  WHY THIS IS NOT A ROW OF NcNoteCards
  ------------------------------------
  NcNoteCard sets `role="alert"` on every error card and nothing at all on the
  rest. A stack of them inside a live region announces errors twice and warnings
  never. The two hidden regions below are the whole reason for the hand-written
  markup: one assertive region for errors, one polite region for everything
  else, both mounted from the first paint so a screen reader has them in the
  accessibility tree BEFORE any text arrives. The card styling still takes
  NcNoteCard's own tokens, so it looks like the rest of Nextcloud.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-canvas-messages">
		<!--
			The two live regions, always mounted and usually empty.

			🔑 MOUNTED FROM THE FIRST PAINT, NOT CREATED WITH THE TEXT. A live
			region that appears in the same tick as its content is not announced
			by most screen readers: the region has to be in the accessibility
			tree already for the change to be a change. `v-if` on these would
			make every message silent for exactly the users who most need it.
		-->
		<div class="cn-flow-canvas-messages__live"
			data-testid="flow-messages-alert"
			role="alert"
			aria-atomic="true">
			{{ alertAnnouncement }}
		</div>
		<div class="cn-flow-canvas-messages__live"
			data-testid="flow-messages-status"
			role="status"
			aria-live="polite"
			aria-atomic="true">
			{{ statusAnnouncement }}
		</div>

		<ul v-if="visibleMessages.length"
			class="cn-flow-canvas-messages__list"
			:aria-label="t('nextcloud-vue', 'Flow editor messages')">
			<li v-for="message in visibleMessages"
				:key="message.id"
				class="cn-flow-canvas-messages__item"
				:class="`cn-flow-canvas-messages__item--${message.severity}`"
				:data-testid="`flow-message-${message.id}`"
				:data-message-id="message.id"
				:data-severity="message.severity">
				<component :is="iconFor(message.severity)"
					:size="20"
					class="cn-flow-canvas-messages__icon" />

				<div class="cn-flow-canvas-messages__body">
					<p class="cn-flow-canvas-messages__text">
						<!-- The severity in WORDS. The tint and the icon say it
						     to someone who can see them; this says it to
						     everyone else (WCAG 1.4.1). -->
						<span class="cn-flow-canvas-messages__severity">{{ severityWord(message.severity) }}</span>
						{{ message.text }}
					</p>

					<ul v-if="message.items && message.items.length"
						class="cn-flow-canvas-messages__items">
						<li v-for="(item, i) in message.items" :key="i">
							{{ item }}
						</li>
					</ul>

					<!-- The remedy, on the message that names the problem. -->
					<NcButton v-if="message.action"
						variant="primary"
						:disabled="message.action.disabled === true"
						:data-testid="`flow-message-action-${message.id}`"
						@click="$emit('action', message.id)">
						{{ message.action.label }}
					</NcButton>
				</div>

				<NcButton v-if="message.dismissible"
					variant="tertiary"
					:aria-label="t('nextcloud-vue', 'Dismiss this message')"
					:data-testid="`flow-message-dismiss-${message.id}`"
					@click="$emit('dismiss', message.id)">
					<template #icon>
						<Close :size="20" />
					</template>
				</NcButton>
			</li>
		</ul>

		<!-- Counted, never truncated in silence. -->
		<p v-if="overflowCount > 0" class="cn-flow-canvas-messages__overflow">
			{{ n('nextcloud-vue', '{count} more message', '{count} more messages', overflowCount, { count: overflowCount }) }}
		</p>
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Alert from 'vue-material-design-icons/Alert.vue'
import AlertDecagram from 'vue-material-design-icons/AlertDecagram.vue'
import CheckboxMarkedCircle from 'vue-material-design-icons/CheckboxMarkedCircle.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Information from 'vue-material-design-icons/Information.vue'

// Worst first. The cap below is only safe because of this: a truncated list
// that dropped the error and kept the hint would be worse than no cap at all.
const SEVERITY_RANK = { error: 0, warning: 1, info: 2, success: 3 }

export default {
	name: 'CnFlowCanvasMessages',

	components: {
		Alert,
		AlertDecagram,
		CheckboxMarkedCircle,
		Close,
		Information,
		NcButton,
	},

	props: {
		/**
		 * The messages to show, as `{ id, severity, text }` plus optionals.
		 *
		 * - `id` is IDENTITY. Two entries with the same id are one message, and
		 *   the later one wins. This is what stops a refusal fired five times
		 *   from becoming five cards.
		 * - `severity` is one of `error`, `warning`, `info`, `success`.
		 * - `items` is an optional list of individual findings, shown under the
		 *   text.
		 * - `action` is an optional `{ label, disabled }`; clicking it emits
		 *   `action` with the message id.
		 * - `dismissible` marks a one-off message. Leave it false for a
		 *   standing condition: there is nothing to dismiss while it is true.
		 */
		messages: {
			type: Array,
			default: () => [],
		},

		/**
		 * How many messages to draw before counting the rest.
		 *
		 * The area is pinned over the graph, so an uncapped list is a wall
		 * across the canvas. Four is what fits beside the toolbar without
		 * reaching the zoom controls.
		 */
		max: {
			type: Number,
			default: 4,
		},
	},

	emits: ['dismiss', 'action'],

	computed: {
		/**
		 * The messages, deduplicated by id and sorted worst first.
		 *
		 * @return {Array<object>} The messages to consider drawing.
		 */
		orderedMessages() {
			// A Map keyed on id: the last entry for an id replaces the earlier
			// ones, which is the behaviour a repeat should have.
			const byId = new Map()
			for (const message of this.messages) {
				byId.set(message.id, message)
			}

			return [...byId.values()]
				.map((message, index) => ({ message, index }))
				.sort((a, b) => ((SEVERITY_RANK[a.message.severity] ?? 2) - (SEVERITY_RANK[b.message.severity] ?? 2))
					|| (a.index - b.index))
				.map(({ message }) => message)
		},

		/**
		 * @return {Array<object>} The messages actually drawn.
		 */
		visibleMessages() {
			return this.orderedMessages.slice(0, this.max)
		},

		/**
		 * @return {number} How many messages the cap left undrawn.
		 */
		overflowCount() {
			return Math.max(0, this.orderedMessages.length - this.max)
		},

		/**
		 * The errors, for the assertive region.
		 *
		 * @return {string} The announcement, or an empty string.
		 */
		alertAnnouncement() {
			return this.announcementFor((message) => message.severity === 'error')
		},

		/**
		 * Everything that is not an error, for the polite region.
		 *
		 * Split from the errors so neither is announced twice: a screen reader
		 * reading one region does not also read the other.
		 *
		 * @return {string} The announcement, or an empty string.
		 */
		statusAnnouncement() {
			return this.announcementFor((message) => message.severity !== 'error')
		},
	},

	methods: {
		t,
		n,

		/**
		 * Build one region's announcement from the messages it owns.
		 *
		 * Severity word included, because a region read aloud has no colour and
		 * no icon. Built from `orderedMessages` rather than `visibleMessages`:
		 * the cap is a drawing decision, and hiding a message from a screen
		 * reader that a sighted user could scroll to would not be the same
		 * page.
		 *
		 * @param {Function} predicate Which messages belong to this region.
		 * @return {string} The announcement.
		 */
		announcementFor(predicate) {
			return this.orderedMessages
				.filter(predicate)
				.map((message) => `${this.severityWord(message.severity)}: ${message.text}`)
				.join(' ')
		},

		/**
		 * The severity as a word an assistive technology can read.
		 *
		 * @param {string} severity The severity.
		 * @return {string} The word.
		 */
		severityWord(severity) {
			const words = {
				error: t('nextcloud-vue', 'Error'),
				warning: t('nextcloud-vue', 'Warning'),
				info: t('nextcloud-vue', 'Information'),
				success: t('nextcloud-vue', 'Success'),
			}

			return words[severity] || words.info
		},

		/**
		 * The icon for a severity, matching the one NcNoteCard draws.
		 *
		 * @param {string} severity The severity.
		 * @return {string} The registered component name.
		 */
		iconFor(severity) {
			const icons = {
				error: 'AlertDecagram',
				warning: 'Alert',
				info: 'Information',
				success: 'CheckboxMarkedCircle',
			}

			return icons[severity] || icons.info
		},
	},
}
</script>

<style scoped>
/*
	Pinned under the editor toolbar, on the same edge.

	The toolbar sits top inline-end and the canvas zoom controls sit bottom
	inline-start, so this edge is free. It also puts the messages beside the
	controls that cause most of them (Save / Run / Check) and directly under the
	sidebar header that carries Publish, so the three read as one band rather
	than as three unrelated panels.
*/
.cn-flow-canvas-messages {
	position: absolute;
	inset-block-start: 64px;
	inset-inline-end: 12px;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-inline-size: 380px;
	/* 🔴 THE GAPS BELONG TO THE GRAPH. Without this the container's whole box
	   eats pan, node selection and drag-to-connect in a rectangle the user
	   cannot see, and nothing errors while it happens. */
	pointer-events: none;
}

/* Visually hidden, still in the accessibility tree. `display: none` and
   `visibility: hidden` both remove the node from that tree, which would make
   these regions announce nothing at all. */
.cn-flow-canvas-messages__live {
	position: absolute;
	inline-size: 1px;
	block-size: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

.cn-flow-canvas-messages__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-flow-canvas-messages__item {
	/* The half of the pointer contract that gives it back. */
	pointer-events: auto;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 8px;
	padding: calc(2 * var(--default-grid-baseline, 4px));
	/* NcNoteCard's own severity tokens, so a canvas message and a sidebar note
	   card are plainly the same object, and both follow the theme.

	   🔑 THE TINT IS MIXED HERE RATHER THAN TAKEN AS-IS. NcNoteCard paints
	   `background-color: var(--color-warning)` and assumes that token is a pale
	   background — true on Nextcloud 30 and later, and NOT true of the token
	   sets several installed themes still ship, where `--color-warning` is a
	   saturated gold. Taking it literally put `--color-main-text` on #A37200 and
	   axe reported a SERIOUS color-contrast violation in both light and dark
	   (caught by `flow-ports-and-lines.e2e.js`, not by any unit test). Mixing a
	   little of the severity colour into the main background derives a pale tint
	   from any token set, in either theme, and keeps the body text legible. */
	border-inline-start: var(--default-grid-baseline, 4px) solid var(--note-theme);
	border-radius: var(--border-radius-small, 4px);
	background-color: var(--color-main-background);
	background-color: color-mix(in srgb, var(--note-theme) 12%, var(--color-main-background));
	color: var(--color-main-text);
	box-shadow: 0 2px 8px var(--color-box-shadow);
	animation: cn-flow-canvas-messages-in 150ms ease-out;
}

/* An animation is a nice-to-have; motion sickness is not. */
@media (prefers-reduced-motion: reduce) {
	.cn-flow-canvas-messages__item {
		animation: none;
	}
}

@keyframes cn-flow-canvas-messages-in {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}

	to {
		opacity: 1;
		transform: none;
	}
}

.cn-flow-canvas-messages__item--error {
	--note-theme: var(--color-error-text);
}

.cn-flow-canvas-messages__item--warning {
	--note-theme: var(--color-warning-text);
}

.cn-flow-canvas-messages__item--info {
	--note-theme: var(--color-info-text);
}

.cn-flow-canvas-messages__item--success {
	--note-theme: var(--color-success-text);
}

.cn-flow-canvas-messages__icon {
	flex: 0 0 auto;
	color: var(--note-theme);
}

.cn-flow-canvas-messages__body {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-inline-size: 0;
}

.cn-flow-canvas-messages__text {
	margin: 0;
	/* A node id or a cron line has no spaces and would otherwise push the card
	   wider than the canvas. */
	overflow-wrap: anywhere;
}

/* The severity word: read aloud, never drawn. The icon and the tint are what a
   sighted reader gets, and repeating the word beside them would be noise. */
.cn-flow-canvas-messages__severity {
	position: absolute;
	inline-size: 1px;
	block-size: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

.cn-flow-canvas-messages__items {
	margin: 0;
	padding-inline-start: 20px;
	list-style: disc;
	font-size: 0.9em;
}

.cn-flow-canvas-messages__overflow {
	pointer-events: auto;
	align-self: flex-end;
	margin: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
