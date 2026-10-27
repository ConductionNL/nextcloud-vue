<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnExpandableRow — one index row that opens to a sub-table.

  Closed, the row shows the object's title, an optional badge, its
  description, a list field as chips joined by a separator, and a meta line.
  Open, the chips give way to the same list as a table, with an optional note
  and a footer action under it. Header buttons and the footer action emit
  `action` with their id; the host runs them (CnIndexPage `expandableRows`).
-->
<template>
	<section class="cn-expandable-row" :class="{ 'cn-expandable-row--open': isOpen }" data-testid="cn-expandable-row">
		<div class="cn-expandable-row__head">
			<button
				type="button"
				class="cn-expandable-row__toggle"
				:aria-expanded="isOpen ? 'true' : 'false'"
				:aria-label="toggleLabel"
				data-testid="cn-expandable-row-toggle"
				@click="isOpen = !isOpen">
				<ChevronDown :size="20" class="cn-expandable-row__chevron" />
			</button>
			<div class="cn-expandable-row__main">
				<div class="cn-expandable-row__title-line">
					<h3 class="cn-expandable-row__title" data-testid="cn-expandable-row-title">
						{{ title }}
					</h3>
					<CnStatusBadge
						v-if="badge"
						class="cn-expandable-row__badge"
						:label="badge"
						variant="primary"
						data-testid="cn-expandable-row-badge" />
				</div>
				<p v-if="description" class="cn-expandable-row__description" data-testid="cn-expandable-row-description">
					{{ description }}
				</p>
				<div v-if="!isOpen && chips.length > 0" class="cn-expandable-row__chips" data-testid="cn-expandable-row-chips">
					<template v-for="(chip, index) in chips" :key="chip.key">
						<span v-if="index > 0" class="cn-expandable-row__separator" aria-hidden="true">
							<ChevronRight :size="16" />
						</span>
						<CnStatusBadge class="cn-expandable-row__chip" :label="chip.label" :variant="chip.variant" />
					</template>
				</div>
				<p v-if="meta" class="cn-expandable-row__meta" data-testid="cn-expandable-row-meta">
					{{ meta }}
				</p>
			</div>
			<div class="cn-expandable-row__actions">
				<NcButton
					v-for="button in buttons"
					:key="button.action"
					variant="secondary"
					:data-testid="`cn-expandable-row-button-${button.action}`"
					@click="emitAction(button.action)">
					{{ tr(button.label || button.action) }}
				</NcButton>
				<slot name="actions" :row="object" />
			</div>
		</div>
		<div v-if="isOpen && table" class="cn-expandable-row__body">
			<table class="cn-expandable-row__table" data-testid="cn-expandable-row-table">
				<thead>
					<tr>
						<th v-for="(column, c) in table.columns" :key="c" scope="col">
							{{ tr(column.label || '') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(entry, r) in tableRows" :key="r">
						<td v-for="(column, c) in table.columns" :key="c" :class="`cn-expandable-row__cell--${column.as || 'text'}`">
							<span v-if="column.as === 'order'" class="cn-expandable-row__order">{{ r + 1 }}</span>
							<span v-else-if="column.as === 'bar'" class="cn-expandable-row__bar">
								<span class="cn-expandable-row__bar-track">
									<span class="cn-expandable-row__bar-fill" :style="{ width: percent(entry, column) + '%' }" />
								</span>
								<span class="cn-expandable-row__bar-value">{{ percent(entry, column) }}%</span>
							</span>
							<span v-else-if="column.as === 'check'" class="cn-expandable-row__check">
								<template v-if="readPath(entry, column.key)">
									<Check :size="16" />
									{{ tr(column.text || '') }}
								</template>
							</span>
							<template v-else-if="column.as === 'yesNo'">
								{{ readPath(entry, column.key) ? t('nextcloud-vue', 'Yes') : t('nextcloud-vue', 'No') }}
							</template>
							<CnStatusBadge
								v-else-if="column.as === 'pill' && pillOf(entry, column)"
								:label="pillOf(entry, column).label"
								:variant="pillOf(entry, column).variant" />
							<strong v-else-if="column.strong">{{ cellText(entry, column) }}</strong>
							<template v-else-if="column.as !== 'pill'">
								{{ cellText(entry, column) }}
							</template>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="table.note || table.action" class="cn-expandable-row__foot">
				<p v-if="table.note" class="cn-expandable-row__note" data-testid="cn-expandable-row-note">
					{{ tr(table.note) }}
				</p>
				<NcButton
					v-if="table.action"
					variant="secondary"
					class="cn-expandable-row__foot-action"
					data-testid="cn-expandable-row-footer-action"
					@click="emitAction(table.action.id)">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ tr(table.action.label || table.action.id) }}
				</NcButton>
			</div>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * The first tone whose condition the entry meets.
 *
 * @param {Array<object>|undefined} tones `[{ when, variant, text? }]`.
 * @param {object} entry The list entry.
 * @return {object|undefined} The tone.
 */
function toneOf(tones, entry) {
	return Array.isArray(tones)
		? tones.find((tone) => tone && tone.when && evaluateVisibleWhenLocal(tone.when, entry || {}))
		: undefined
}

export default {
	name: 'CnExpandableRow',

	components: { Check, ChevronDown, ChevronRight, CnStatusBadge, NcButton, Plus },

	inject: {
		cnTranslate: { default: null },
	},

	props: {
		/** The row's object. */
		object: {
			type: Object,
			required: true,
		},

		/**
		 * What the row draws: `{ title, badge?: { when, label }, description?,
		 * chips?: { field, each, tones? }, meta?: Array<string>, table?: { field,
		 * columns, note?, action?: { id, label } }, buttons?: Array<{ action, label? }> }`.
		 * A table column is `{ key?, label, as?, template?, strong?, text?, tones? }`,
		 * `as` one of `text` (default), `order`, `bar`, `check`, `yesNo`, `pill`.
		 */
		layout: {
			type: Object,
			required: true,
		},

		/** Whether the row starts open. */
		open: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['action'],

	data() {
		return { isOpen: this.open }
	},

	computed: {
		title() {
			return String(readPath(this.object, this.layout.title || 'title') ?? '')
		},

		badge() {
			const badge = this.layout.badge
			if (!badge || !badge.label) {
				return ''
			}
			return !badge.when || evaluateVisibleWhenLocal(badge.when, this.object) ? this.tr(badge.label) : ''
		},

		description() {
			return this.layout.description ? String(readPath(this.object, this.layout.description) ?? '') : ''
		},

		chips() {
			const def = this.layout.chips
			if (!def || !def.field) {
				return []
			}
			const items = readPath(this.object, def.field)
			if (!Array.isArray(items)) {
				return []
			}
			return items
				.map((item, index) => {
					const label = def.each && def.each.includes('{')
						? fillTemplate(this.tr(def.each), item || {})
						: String(readPath(item || {}, def.each || 'name') ?? '')
					const tone = toneOf(def.tones, item)
					const variant = tone ? tone.variant : def.variant
					return { key: def.field + '.' + index, label, variant: isBadgeVariant(variant) ? variant : 'default' }
				})
				.filter((chip) => chip.label !== '')
		},

		meta() {
			const parts = Array.isArray(this.layout.meta) ? this.layout.meta : []
			return parts
				.map((part) => fillTemplate(this.tr(part), this.object))
				.filter((text) => text !== '')
				.join(' · ')
		},

		table() {
			const table = this.layout.table
			return table && table.field && Array.isArray(table.columns) ? table : null
		},

		tableRows() {
			const rows = this.table ? readPath(this.object, this.table.field) : null
			return Array.isArray(rows) ? rows : []
		},

		buttons() {
			return Array.isArray(this.layout.buttons) ? this.layout.buttons.filter((b) => b && b.action) : []
		},

		toggleLabel() {
			return this.isOpen
				? t('nextcloud-vue', 'Close {name}', { name: this.title })
				: t('nextcloud-vue', 'Open {name}', { name: this.title })
		},
	},

	watch: {
		open(value) {
			this.isOpen = value
		},
	},

	methods: {
		t,
		readPath,

		/**
		 * @param {string} text Text in the host's source language.
		 * @return {string} The text in the user's language.
		 */
		tr(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * @param {string} id The action id.
		 * @return {void}
		 */
		emitAction(id) {
			/**
			 * @event action A header button or the footer action. Payload: `{ id, row }`.
			 */
			this.$emit('action', { id, row: this.object })
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {string} The cell's text.
		 */
		cellText(entry, column) {
			if (column.template) {
				return fillTemplate(this.tr(column.template), entry || {})
			}
			const value = column.key ? readPath(entry || {}, column.key) : ''
			return value === null || value === undefined ? '' : String(value)
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {number} The value as a whole percentage from 0 to 100.
		 */
		percent(entry, column) {
			const value = Number(readPath(entry || {}, column.key))
			return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {{label: string, variant: string}|null} The pill, or null.
		 */
		pillOf(entry, column) {
			const tone = toneOf(column.tones, entry)
			if (!tone || !tone.text) {
				return null
			}
			return { label: this.tr(tone.text), variant: isBadgeVariant(tone.variant) ? tone.variant : 'default' }
		},
	},
}
</script>

<style scoped>
.cn-expandable-row {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
}

.cn-expandable-row__head {
	display: flex;
	gap: 16px;
	align-items: flex-start;
	padding: 18px 18px 18px 18px;
}

.cn-expandable-row__toggle {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: 1px solid var(--color-border-dark);
	border-radius: 50%;
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-expandable-row--open .cn-expandable-row__toggle {
	border-color: transparent;
	background: var(--color-primary-element-light);
}

.cn-expandable-row--open .cn-expandable-row__chevron {
	transform: rotate(180deg);
}

.cn-expandable-row__main {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.cn-expandable-row__title-line {
	display: flex;
	gap: 10px;
	align-items: center;
}

.cn-expandable-row__title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-expandable-row__description {
	margin: 0;
}

.cn-expandable-row__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}

.cn-expandable-row__separator {
	display: inline-flex;
	color: var(--color-text-maxcontrast);
}

.cn-expandable-row__meta {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-expandable-row__actions {
	display: flex;
	flex: none;
	gap: 8px;
	align-items: center;
}

.cn-expandable-row__body {
	border-top: 1px solid var(--color-border);
}

.cn-expandable-row__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-expandable-row__table th,
.cn-expandable-row__table td {
	padding: 12px 18px;
	border-bottom: 1px solid var(--color-border);
	text-align: start;
}

.cn-expandable-row__table th {
	color: var(--color-text-maxcontrast);
	font-weight: 600;
}

.cn-expandable-row__order {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: var(--color-background-dark);
	font-size: 13px;
	font-weight: 600;
}

.cn-expandable-row__bar {
	display: flex;
	gap: 12px;
	align-items: center;
}

.cn-expandable-row__bar-track {
	flex: 1;
	min-width: 120px;
	height: 6px;
	border-radius: 3px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-expandable-row__bar-fill {
	display: block;
	height: 100%;
	background: var(--color-primary-element);
}

.cn-expandable-row__bar-value {
	font-weight: 600;
}

.cn-expandable-row__check {
	display: inline-flex;
	gap: 6px;
	align-items: center;
	color: var(--color-primary-element);
	font-weight: 600;
}

.cn-expandable-row__foot {
	display: flex;
	gap: 16px;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
}

.cn-expandable-row__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
