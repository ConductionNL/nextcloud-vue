<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-journey-review-list" data-testid="cn-journey-review-list">
		<p v-if="items.length === 0" class="cn-journey-review-list__empty">
			{{ t('nextcloud-vue', 'Nothing chosen.') }}
		</p>
		<template v-else>
			<p class="cn-journey-review-list__count" data-testid="cn-journey-review-count">
				{{ countText }}
			</p>
			<p v-if="repeating" class="cn-journey-review-list__sentence" data-testid="cn-journey-review-sentence">
				{{ sentenceText }}
			</p>
			<ol class="cn-journey-review-list__items">
				<li
					v-for="(item, index) in items"
					:key="index"
					class="cn-journey-review-list__block"
					:data-index="index">
					<component :is="headingTag" class="cn-journey-review-list__heading">
						{{ headingFor(item) }}
					</component>
					<dl class="cn-journey-review-list__details">
						<template v-for="col in detailColumns" :key="col.key">
							<dt>{{ col.label }}</dt>
							<dd>{{ valueFor(item, col.key) }}</dd>
						</template>
					</dl>
					<p v-if="repeating && targetInfo[index] && targetInfo[index].fileable" class="cn-journey-review-list__filed">
						{{ t('nextcloud-vue', 'Filed as {type}', { type: targetInfo[index].typeValue }) }}
					</p>
					<p v-else-if="repeating" class="cn-journey-review-list__unfileable" role="alert">
						{{ t('nextcloud-vue', 'This product cannot be filed.') }}
					</p>
					<NcButton
						variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Change {name}', { name: headingFor(item) })"
						@click="onChange(index, item)">
						{{ t('nextcloud-vue', 'Change') }}
					</NcButton>
				</li>
			</ol>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { journeyItemTargets } from '../../utils/journeyRepeatingWrite.js'

/**
 * CnJourneyReviewList — the review step's view of a list answer: an ordered
 * list with the item count, one block per item (heading and labelled
 * details), and, when the journey repeats a write over the list, what each
 * item will be filed as.
 *
 * Pass the repeating write (`{ targetBy, targets }`, see
 * `findRepeatingWrite`) to show "Filed as" per item; an item whose value has
 * no target is marked and listed in the `unfileable` event so the host can
 * disable Submit. Change emits the item's index for the host to return to the
 * list step with focus on that row.
 *
 * Example:
 * ```vue
 * <CnJourneyReviewList :items="answers.producten" :columns="columns"
 *   :write="write" @change="goToStep" @unfileable="blocked = $event.length > 0" />
 * ```
 */
export default {
	name: 'CnJourneyReviewList',

	components: { NcButton },

	props: {
		/** The list answer: an array of objects. */
		items: {
			type: Array,
			default: () => [],
		},

		/**
		 * The details to show, from the list field's `items.properties`.
		 * Empty: the keys of the first item.
		 *
		 * @type {Array<{key: string, label: string}>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},

		/** Item field used as the block heading. Empty: the repeating write's `targetBy`, else the first column. */
		headingField: {
			type: String,
			default: '',
		},

		/**
		 * Option labels for the heading field, so a stored value shows by its label.
		 *
		 * @type {Array<{value: string, label: string}>}
		 */
		headingOptions: {
			type: Array,
			default: () => [],
		},

		/**
		 * The write that repeats over this list, or null for items only.
		 *
		 * @type {{targetBy: string, targets: object}|null}
		 */
		write: {
			type: Object,
			default: null,
		},

		/** Singular noun for the count and the sentence. */
		itemNoun: {
			type: String,
			default: () => t('nextcloud-vue', 'product'),
		},

		/** Plural noun for the count. */
		itemNounPlural: {
			type: String,
			default: () => t('nextcloud-vue', 'products'),
		},

		/** Heading level of the item headings (one below the step heading). */
		headingLevel: {
			type: Number,
			default: 3,
		},
	},

	emits: ['change', 'unfileable'],

	computed: {
		repeating() {
			return this.write !== null && this.write !== undefined
		},

		targetInfo() {
			return journeyItemTargets(this.items, this.write)
		},

		allColumns() {
			if (this.columns.length > 0) {
				return this.columns
			}
			const first = this.items.find((i) => i && typeof i === 'object')
			return first ? Object.keys(first).map((key) => ({ key, label: key })) : []
		},

		headingKey() {
			return this.headingField || (this.write && this.write.targetBy) || (this.allColumns[0] && this.allColumns[0].key) || ''
		},

		detailColumns() {
			return this.allColumns.filter((c) => c.key !== this.headingKey)
		},

		headingTag() {
			return `h${Math.min(6, Math.max(2, this.headingLevel))}`
		},

		countText() {
			const n = this.items.length
			return `${n} ${n === 1 ? this.itemNoun : this.itemNounPlural}`
		},

		sentenceText() {
			return t('nextcloud-vue', 'Each {noun} becomes its own request.', { noun: this.itemNoun })
		},

		unfileableIndexes() {
			return this.repeating ? this.targetInfo.map((x, i) => (x.fileable ? -1 : i)).filter((i) => i >= 0) : []
		},
	},

	watch: {
		unfileableIndexes: {
			immediate: true,
			handler(indexes) {
				/**
				 * @event unfileable Emitted when the set of items with no target changes. Submit should stay disabled while it is not empty.
				 * @type {number[]}
				 */
				this.$emit('unfileable', indexes)
			},
		},
	},

	methods: {
		valueFor(item, key) {
			const v = item ? item[key] : undefined
			if (v === undefined || v === null || v === '') {
				return '—'
			}
			return typeof v === 'object' ? JSON.stringify(v) : String(v)
		},

		headingFor(item) {
			const raw = item ? item[this.headingKey] : undefined
			const option = this.headingOptions.find((o) => String(o.value) === String(raw))
			if (option) {
				return option.label
			}
			return raw === undefined || raw === null || raw === '' ? '—' : String(raw)
		},

		onChange(index, item) {
			/**
			 * @event change Emitted when the person chooses Change on an item; the host returns to the list step with focus on that row.
			 * @type {{index: number, item: object}}
			 */
			this.$emit('change', { index, item })
		},
	},
}
</script>

<style scoped>
.cn-journey-review-list__items {
	list-style: none;
	margin: 8px 0 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-journey-review-list__block {
	padding: 12px;
	background: var(--color-background-hover);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
}

.cn-journey-review-list__heading {
	margin: 0 0 4px;
	font-size: 1.1em;
}

.cn-journey-review-list__details {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 2px 12px;
	margin: 0;
}

.cn-journey-review-list__details dt {
	color: var(--color-text-maxcontrast);
}

.cn-journey-review-list__details dd {
	margin: 0;
}

.cn-journey-review-list__unfileable {
	margin: 8px 0 0;
	color: var(--color-error-text);
	font-weight: bold;
}

.cn-journey-review-list__filed {
	margin: 8px 0 0;
}
</style>
