<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-status-list" data-testid="cn-status-list">
		<ul
			v-if="shownCounts.length > 0"
			class="cn-status-list__counts"
			:aria-label="countsLabel"
			data-testid="cn-status-list-counts">
			<li
				v-for="entry in shownCounts"
				:key="entry.key"
				class="cn-status-list__count"
				:data-testid="`cn-status-list-count-${entry.key}`">
				<CnStatusBadge :label="entry.label" :variant="variantOf(entry.variant)" size="small" />
				<span class="cn-status-list__count-number">{{ entry.count }}</span>
			</li>
		</ul>

		<div v-if="loading && items.length === 0" class="cn-status-list__state">
			<NcLoadingIcon :size="20" :name="t('nextcloud-vue', 'Loading…')" />
		</div>
		<p v-else-if="error"
			class="cn-status-list__state cn-status-list__state--error"
			role="alert"
			data-testid="cn-status-list-error">
			{{ error }}
		</p>
		<p v-else-if="items.length === 0" class="cn-status-list__state" data-testid="cn-status-list-empty">
			{{ emptyLabel || t('nextcloud-vue', 'Nothing to show') }}
		</p>
		<ul v-else class="cn-status-list__items">
			<li
				v-for="item in shownItems"
				:key="item.id"
				class="cn-status-list__item"
				data-testid="cn-status-list-item">
				<div class="cn-status-list__main">
					<a
						v-if="item.href"
						:href="item.href"
						class="cn-status-list__title"
						:target="item.external ? '_blank' : undefined"
						:rel="item.external ? 'noopener noreferrer' : undefined">{{ item.title }}</a>
					<span v-else class="cn-status-list__title">{{ item.title }}</span>
					<span v-if="item.meta || item.dueText" class="cn-status-list__meta">
						<span v-if="item.meta">{{ item.meta }}</span>
						<span
							v-if="item.dueText"
							class="cn-status-list__due"
							:class="{ 'cn-status-list__due--overdue': item.overdue }"
							data-testid="cn-status-list-due">{{ item.dueText }}</span>
					</span>
				</div>
				<CnStatusBadge
					v-if="item.status && item.status.label"
					class="cn-status-list__badge"
					:label="item.status.label"
					:variant="variantOf(item.status.variant)"
					size="small" />
				<!-- @slot actions Controls at the end of a row, such as a favourite toggle. Gets `{ item }`. -->
				<slot name="actions" :item="item" />
			</li>
		</ul>
	</div>
</template>

<script>
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'

/**
 * CnStatusList: a short list of items, each a link with a line of detail, an
 * optional due date and a status pill, with an optional row of counts per
 * status above it. It draws what it is given and fetches nothing, so a
 * widget for work packages, cases or wiki pages brings the data and this
 * draws it the same way.
 *
 * An item is `{ id, title, href?, external?, meta?, due?, done?, status?: { label, variant? } }`.
 * `due` is an ISO date; a due date before today on an item that is not
 * `done` reads as overdue. A count is `{ key, label, count, variant? }`.
 *
 * @spec openspec/changes/status-list/specs/status-list/spec.md
 */
export default {
	name: 'CnStatusList',

	components: { CnStatusBadge, NcLoadingIcon },

	props: {
		/** The items, in the order they show. */
		items: {
			type: Array,
			default: () => [],
		},

		/** The counts per status, drawn above the items; empty draws none. */
		counts: {
			type: Array,
			default: () => [],
		},

		/** Whether the items are being read. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** A message that replaces the items when the read failed. */
		error: {
			type: String,
			default: '',
		},

		/** What an empty list says. */
		emptyLabel: {
			type: String,
			default: '',
		},

		/** The day overdue is measured against, `YYYY-MM-DD`; empty is today. */
		today: {
			type: String,
			default: '',
		},
	},

	computed: {
		/** @return {string} The counts' accessible name. */
		countsLabel() {
			return t('nextcloud-vue', 'Number per status')
		},

		/** @return {Array<object>} The counts with a label. */
		shownCounts() {
			return (Array.isArray(this.counts) ? this.counts : [])
				.filter((entry) => entry && entry.label && Number.isFinite(entry.count))
				.map((entry) => ({ ...entry, key: String(entry.key ?? entry.label) }))
		},

		/** @return {Array<object>} The items with their due text. */
		shownItems() {
			const today = this.today || isoToday()
			return this.items
				.filter((item) => item && item.title)
				.map((item, index) => {
					const due = typeof item.due === 'string' ? item.due.slice(0, 10) : ''
					const overdue = due !== '' && item.done !== true && due < today
					return {
						...item,
						id: String(item.id ?? index),
						overdue,
						dueText: due === '' ? '' : dueText(due, overdue),
					}
				})
		},
	},

	methods: {
		t,

		/**
		 * A badge variant, `default` for anything else.
		 *
		 * @param {string} variant The candidate.
		 * @return {string}
		 */
		variantOf(variant) {
			return isBadgeVariant(variant) ? variant : 'default'
		},
	},
}

/**
 * Today as `YYYY-MM-DD` in the reader's time zone.
 *
 * @return {string}
 */
function isoToday() {
	const now = new Date()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	return `${now.getFullYear()}-${month}-${day}`
}

/**
 * The due date as the reader reads it.
 *
 * @param {string} due The date, `YYYY-MM-DD`.
 * @param {boolean} overdue Whether it has passed.
 * @return {string}
 */
function dueText(due, overdue) {
	const [year, month, day] = due.split('-').map(Number)
	let date = due
	try {
		date = new Date(year, month - 1, day).toLocaleDateString(getLanguage(), { day: 'numeric', month: 'short' })
	} catch {
		// An unknown language keeps the ISO date.
	}
	return overdue
		? t('nextcloud-vue', 'Overdue since {date}', { date })
		: t('nextcloud-vue', 'Due {date}', { date })
}
</script>

<style scoped>
.cn-status-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 0;
}

.cn-status-list__counts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-status-list__count {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.cn-status-list__count-number {
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}

.cn-status-list__items {
	margin: 0;
	padding: 0;
	list-style: none;
	overflow-y: auto;
}

.cn-status-list__item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-status-list__item:last-child {
	border-bottom: 0;
}

.cn-status-list__main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.cn-status-list__title {
	overflow: hidden;
	color: var(--color-main-text);
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-status-list__title:hover,
a.cn-status-list__title:focus-visible {
	text-decoration: underline;
}

.cn-status-list__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 0 8px;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}

.cn-status-list__due--overdue {
	color: var(--color-error-text, var(--color-error));
	font-weight: 600;
}

.cn-status-list__badge {
	flex-shrink: 0;
}

.cn-status-list__state {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-status-list__state--error {
	color: var(--color-error-text, var(--color-error));
}
</style>
