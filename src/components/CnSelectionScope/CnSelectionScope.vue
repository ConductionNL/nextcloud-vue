<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-selection-scope" data-testid="bulk-selection-scope">
		<p class="cn-selection-scope__sentence" data-testid="bulk-selection-sentence">
			{{ sentence }}
		</p>

		<NcButton
			v-if="offersWholeResult"
			variant="tertiary"
			data-testid="bulk-selection-widen"
			@click="setScope('result')">
			{{ widenText }}
		</NcButton>

		<NcButton
			v-if="isWholeResult"
			variant="tertiary"
			data-testid="bulk-selection-narrow"
			@click="setScope('page')">
			{{ narrowText }}
		</NcButton>
	</div>
</template>

<script>
import { translatePlural as n } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'

/**
 * Whether the whole result can honestly be offered: only when its size is
 * known and larger than what is ticked. Offering "select all 400" without
 * knowing there are 400 is the surprise this exists to prevent.
 *
 * @param {object} state What is known.
 * @param {number} state.pageCount How many rows are ticked.
 * @param {number} [state.total] How many rows match the search, when known.
 * @return {boolean} True when the whole result is a real, countable thing.
 */
export function canOfferWholeResult({ pageCount, total }) {
	const matching = Number(total)
	return Number.isFinite(matching) && matching > 0 && matching > Number(pageCount || 0)
}

/**
 * CnSelectionScope — says in words which "all" a bulk act will take: the
 * rows ticked on this page, or every row matching the search. Widening to
 * the whole result and going back are two explicit buttons, never a side
 * effect of the header checkbox.
 *
 * The whole-result offer is withheld when `total` is unknown (0, null or not
 * a number), or when it is no larger than the ticked rows.
 *
 * Strings are pluralised library defaults ("items"); a host passes its own
 * noun through `labels` (`page`, `result`, `widen`, `narrow`, templates with
 * `{count}` and `{total}`).
 *
 * ```vue
 * <CnSelectionScope
 *   :selected-ids="selectedIds"
 *   :total="matchingTotal"
 *   :scope="scope"
 *   @update:scope="scope = $event" />
 * ```
 *
 * @spec openspec/changes/dq-abstract-forms/specs/bulk-job-progress/spec.md
 */
export default {
	name: 'CnSelectionScope',

	components: { NcButton },

	props: {
		/** The ticked rows. */
		selectedIds: { type: Array, default: () => [] },

		/** How many rows match the current search, 0 or null when unknown. */
		total: { type: Number, default: 0 },

		/** The scope in force: `'page'` or `'result'`. */
		scope: {
			type: String,
			default: 'page',
			validator: (value) => ['page', 'result'].includes(value),
		},

		/** Templates replacing the library wording: `page`, `result`, `widen`, `narrow`. */
		labels: { type: Object, default: () => ({}) },
	},

	emits: ['update:scope'],

	computed: {
		/** @return {number} How many rows are ticked. */
		pageCount() {
			return this.selectedIds.length
		},

		/** @return {number} How many rows match, 0 when unknown. */
		matching() {
			return Number(this.total || 0)
		},

		/** @return {boolean} Whether the whole result is what is selected. */
		isWholeResult() {
			return this.scope === 'result'
		},

		/** @return {boolean} Whether widening can honestly be offered. */
		offersWholeResult() {
			return !this.isWholeResult && canOfferWholeResult({ pageCount: this.pageCount, total: this.total })
		},

		/** @return {string} What is selected, in words: the number first, then the scope. */
		sentence() {
			if (this.isWholeResult) {
				return this.fill('result', n('nextcloud-vue', 'The %n item matching this search is selected.', 'All %n items matching this search are selected.', this.matching))
			}
			return this.fill('page', n('nextcloud-vue', '%n item on this page is selected.', '%n items on this page are selected.', this.pageCount))
		},

		/** @return {string} The label on the widening button. */
		widenText() {
			return this.fill('widen', n('nextcloud-vue', 'Select the %n item matching this search', 'Select all %n items matching this search', this.matching))
		},

		/** @return {string} The label on the narrowing button. */
		narrowText() {
			return this.fill('narrow', n('nextcloud-vue', 'Go back to the %n on this page', 'Go back to the %n on this page', this.pageCount))
		},
	},

	methods: {
		/**
		 * Ask the host to change the selection scope.
		 *
		 * @param {'page'|'result'} scope The scope to switch to.
		 */
		setScope(scope) {
			/** @event update:scope The scope the user picked: `page` or `result`. */
			this.$emit('update:scope', scope)
		},

		/**
		 * The host's template for `key`, filled, or the library's sentence.
		 *
		 * @param {string} key The label key.
		 * @param {string} fallback The library's sentence.
		 * @return {string} The text.
		 */
		fill(key, fallback) {
			const own = this.labels && this.labels[key]
			if (typeof own !== 'string' || own === '') {
				return fallback
			}
			const vars = { count: this.pageCount, total: this.matching }
			return own.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
		},
	},
}
</script>

<style scoped>
.cn-selection-scope {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
}

.cn-selection-scope__sentence {
	color: var(--color-text-maxcontrast);
}
</style>
