<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section
		v-if="normalisedItems.length > 0"
		class="cn-next-step-card"
		data-testid="cn-next-step-card"
		:aria-labelledby="title ? titleId : null"
		:aria-label="title ? null : fallbackLabel">
		<div class="cn-next-step-card__main">
			<component
				:is="titleTag"
				v-if="title"
				:id="titleId"
				class="cn-next-step-card__title">
				{{ title }}
			</component>
			<ul class="cn-next-step-card__list">
				<li
					v-for="(item, index) in normalisedItems"
					:key="`${index}-${item.label}`"
					class="cn-next-step-card__item"
					:class="{
						'cn-next-step-card__item--done': item.done,
						'cn-next-step-card__item--current': index === currentIndex,
					}"
					data-testid="cn-next-step-item">
					<span class="cn-next-step-card__marker" aria-hidden="true">
						<Check v-if="item.done" :size="14" />
					</span>
					<span class="cn-next-step-card__label">{{ item.label }}</span>
					<span v-if="item.hint" class="cn-next-step-card__hint">{{ item.hint }}</span>
					<!-- The state in words. The marker is a shape and a colour, and
					     neither reaches a screen reader or a reader who cannot tell
					     the two colours apart. -->
					<span class="cn-next-step-card__state">{{ item.done ? doneLabel : todoLabel }}</span>
				</li>
			</ul>
		</div>
		<div v-if="actionLabel || $slots.action || after" class="cn-next-step-card__side">
			<!-- @slot action Replace the primary button, for a host that renders its own control. -->
			<slot name="action">
				<NcButton
					v-if="actionLabel"
					:id="actionId || null"
					variant="primary"
					:disabled="actionDisabled"
					data-testid="cn-next-step-action"
					@click="$emit('action')">
					{{ actionLabel }}
				</NcButton>
			</slot>
			<span v-if="after" class="cn-next-step-card__after">{{ after }}</span>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'

let nextStepCardUid = 0

/**
 * CnNextStepCard: what this record needs now, next to the button that does it.
 *
 * A short checklist for the current step and one primary action. It answers
 * "what do I do next?" on a record whose menu would otherwise make the handler
 * guess. Renders nothing when there is no checklist, so a step that needs no
 * explaining shows no empty card.
 *
 * ```vue
 * <CnNextStepCard
 *   title="What now? Step 2: handling"
 *   :items="[
 *     { label: 'Receipt confirmed', done: true },
 *     { label: 'Review the open documents', hint: '2 of 5 done' },
 *     { label: 'Draft the decision' },
 *   ]"
 *   action-label="Continue reviewing"
 *   after="Then: step 3, decision"
 *   @action="onContinue" />
 * ```
 *
 * CnDetailPage renders this card from its `nextStep` config, and the
 * `next-step` detail widget type renders it inside a grid.
 */
export default {
	name: 'CnNextStepCard',

	components: {
		Check,
		NcButton,
	},

	props: {
		/** Heading of the card, for example "What now? Step 2: handling". */
		title: {
			type: String,
			default: '',
		},

		/** Element the heading renders as. Pick the level that fits the page outline. */
		titleTag: {
			type: String,
			default: 'h3',
		},

		/**
		 * The checklist: `{ label, done?, hint? }` per item. The first item
		 * that is not done is emphasised as the one to pick up now.
		 */
		items: {
			type: Array,
			default: () => [],
		},

		/** Label of the primary button. Empty renders no button. */
		actionLabel: {
			type: String,
			default: '',
		},

		/** DOM id for the primary button, so a skip link can land on it. */
		actionId: {
			type: String,
			default: '',
		},

		/** Disable the primary button, for example while its request is in flight. */
		actionDisabled: {
			type: Boolean,
			default: false,
		},

		/** One line under the button saying what follows, for example "Then: step 3, decision". */
		after: {
			type: String,
			default: '',
		},

		/** Text state of a done item, read by screen readers. */
		doneLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Done'),
		},

		/** Text state of an open item, read by screen readers. */
		todoLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'To do'),
		},
	},

	emits: [
		/** The primary button was pressed. */
		'action',
	],

	data() {
		nextStepCardUid += 1
		return {
			titleId: `cn-next-step-title-${nextStepCardUid}`,
		}
	},

	computed: {
		/**
		 * The items that can render: an object with a label.
		 *
		 * @return {Array<{label: string, done: boolean, hint: string}>} The checklist.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
		 */
		normalisedItems() {
			return (Array.isArray(this.items) ? this.items : [])
				.filter((item) => item && typeof item.label === 'string' && item.label !== '')
				.map((item) => ({
					label: item.label,
					done: item.done === true,
					hint: typeof item.hint === 'string' ? item.hint : '',
				}))
		},

		/**
		 * Index of the first open item, the one to pick up now.
		 *
		 * @return {number} The index, or -1 when everything is done.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
		 */
		currentIndex() {
			return this.normalisedItems.findIndex((item) => !item.done)
		},

		/**
		 * Accessible name for a card without a title.
		 *
		 * @return {string} The label.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
		 */
		fallbackLabel() {
			return t('nextcloud-vue', 'Next step')
		},
	},
}
</script>

<style scoped>
.cn-next-step-card {
	align-items: center;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	/* The edge says "this is the thing to act on". An inset shadow, so it
	   follows the card's rounded corners instead of squaring them off. */
	box-shadow: inset 4px 0 0 var(--color-primary-element);
	display: flex;
	flex-wrap: wrap;
	gap: calc(4 * var(--default-grid-baseline)) calc(8 * var(--default-grid-baseline));
	padding: calc(5 * var(--default-grid-baseline)) calc(6 * var(--default-grid-baseline));
	padding-inline-start: calc(7 * var(--default-grid-baseline));
}

.cn-next-step-card__main {
	display: flex;
	flex: 1 1 420px;
	flex-direction: column;
	gap: calc(2.5 * var(--default-grid-baseline));
	min-width: 0;
}

.cn-next-step-card__title {
	color: var(--color-main-text);
	font-size: 0.85em;
	font-weight: 700;
	letter-spacing: 0.06em;
	margin: 0;
	text-transform: uppercase;
}

.cn-next-step-card__list {
	display: grid;
	gap: calc(2 * var(--default-grid-baseline));
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-next-step-card__item {
	align-items: center;
	color: var(--color-text-maxcontrast);
	display: flex;
	flex-wrap: wrap;
	gap: calc(2.5 * var(--default-grid-baseline));
}

.cn-next-step-card__item--current {
	color: var(--color-main-text);
}

.cn-next-step-card__item--current .cn-next-step-card__label {
	font-weight: 700;
}

.cn-next-step-card__marker {
	align-items: center;
	border: 2px solid var(--color-border-maxcontrast);
	border-radius: 50%;
	box-sizing: border-box;
	display: inline-flex;
	flex: none;
	height: 20px;
	justify-content: center;
	width: 20px;
}

.cn-next-step-card__item--current .cn-next-step-card__marker {
	border-color: var(--color-primary-element);
}

.cn-next-step-card__item--done .cn-next-step-card__marker {
	background: var(--color-primary-element);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-next-step-card__hint {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
}

/* Read, not seen. */
.cn-next-step-card__state {
	border: 0;
	clip-path: inset(50%);
	height: 1px;
	margin: -1px;
	overflow: hidden;
	padding: 0;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}

.cn-next-step-card__side {
	align-items: flex-start;
	display: flex;
	flex-direction: column;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-next-step-card__after {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}
</style>
