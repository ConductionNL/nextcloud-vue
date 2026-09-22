<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -
  - CnCapabilityTable — the capability comparison, searchable and grouped.
  -
  - Two readers arrive at this table. One is shopping for a FEATURE, the
  - sellable bundle they can name in a tender. The other is checking one
  - CAPABILITY, a behaviour they know they need. The grouping toggle serves the
  - first and the search box serves the second, over the same rows.
  -
  - The provided-by column answers the question a Nextcloud buyer asks next:
  - does this app do the work itself, does a sibling app do it, or does the
  - platform already do it? A capability that Nextcloud provides is not a gap,
  - and a table that cannot say so understates the product.
  -
  - EVERYTHING HERE IS DRIVEN BY THE DOCUMENT, and no row is ever dropped. An
  - unknown provider key renders as the raw key. An area or feature the
  - document never declared gets a group of its own. A row that names no
  - feature lands under a heading that says so. See utils/capabilityComparison.js.
-->

<template>
	<div class="cn-capability-table">
		<div class="cn-capability-table__controls">
			<div v-if="searchable" class="cn-capability-table__search">
				<NcTextField
					:modelValue="rawQuery"
					:label="searchLabel"
					:placeholder="searchPlaceholder"
					trailingButtonIcon="close"
					:showTrailingButton="rawQuery !== ''"
					:trailingButtonLabel="clearLabel"
					@update:modelValue="onQueryInput"
					@trailingButtonClick="clearQuery">
					<template #icon>
						<Magnify :size="20" />
					</template>
				</NcTextField>
			</div>

			<!-- A toggle group, deliberately not an ARIA tab widget: a tab role
			     promises the arrow-key roving focus the ARIA practices describe,
			     and two plain buttons carrying aria-pressed keep the native
			     button semantics that already work for everyone. -->
			<div
				v-if="groupingAvailable"
				class="cn-capability-table__grouping"
				role="group"
				:aria-label="groupingGroupLabel">
				<NcButton
					class="cn-capability-table__group-button"
					:aria-pressed="String(groupMode === 'feature')"
					:variant="groupMode === 'feature' ? 'primary' : 'tertiary'"
					@click="setGroupMode('feature')">
					{{ byFeatureLabel }}
				</NcButton>
				<NcButton
					class="cn-capability-table__group-button"
					:aria-pressed="String(groupMode === 'area')"
					:variant="groupMode === 'area' ? 'primary' : 'tertiary'"
					@click="setGroupMode('area')">
					{{ byAreaLabel }}
				</NcButton>
			</div>
		</div>

		<!-- role="status" is an implicit polite live region, so a reader on a
		     screen reader hears the new count after each keystroke settles. -->
		<p class="cn-capability-table__count" role="status">
			{{ resultCountText }}
		</p>

		<div v-if="groups.length === 0" class="cn-capability-table__empty">
			<NcEmptyContent :name="emptyName" :description="emptyDescription">
				<template #icon>
					<Magnify :size="48" />
				</template>
			</NcEmptyContent>
		</div>

		<section
			v-for="group in groups"
			:key="group.key"
			class="cn-capability-table__group">
			<h3 class="cn-capability-table__group-title">
				{{ group.label }}
				<span class="cn-capability-table__group-count">{{ group.capabilities.length }}</span>
			</h3>
			<div class="cn-capability-table__scroller">
				<table class="cn-capability-table__table">
					<caption class="cn-capability-table__caption">
						{{ captionFor(group) }}
					</caption>
					<thead>
						<tr>
							<th scope="col" class="cn-capability-table__num">
								{{ numberHeader }}
							</th>
							<th scope="col">
								{{ capabilityHeader }}
							</th>
							<th v-if="showProviderColumn" scope="col">
								{{ providerHeader }}
							</th>
							<th
								v-for="system in systems"
								:key="system.key"
								scope="col"
								:class="{ 'cn-capability-table__col--self': system.isSelf }">
								{{ system.name }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in group.capabilities" :key="row.id">
							<td class="cn-capability-table__num">
								{{ row.id }}
							</td>
							<th scope="row" class="cn-capability-table__cap">
								{{ row.label }}
								<span
									v-if="isLowConfidence(row)"
									class="cn-capability-table__confidence"
									:title="lowConfidenceHint">
									<span aria-hidden="true">?</span>
									<span class="cn-capability-table__sr-only">{{ lowConfidenceHint }}</span>
								</span>
							</th>
							<td v-if="showProviderColumn" class="cn-capability-table__provider-cell">
								<span
									v-if="providerOf(row)"
									class="cn-capability-table__provider"
									:class="'cn-capability-table__provider--' + providerOf(row).kind">
									<span class="cn-capability-table__provider-name">{{ providerOf(row).name }}</span>
									<span
										v-if="providerKindLabel(providerOf(row).kind)"
										class="cn-capability-table__provider-kind">
										{{ providerKindLabel(providerOf(row).kind) }}
									</span>
								</span>
							</td>
							<td
								v-for="system in systems"
								:key="system.key"
								:class="{ 'cn-capability-table__col--self': system.isSelf }">
								<span
									class="cn-capability-table__chip"
									:class="'cn-capability-table__chip--' + ratingOf(row, system.key)">
									{{ ratingLabel(ratingOf(row, system.key)) }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCapabilityTable — a searchable, groupable capability comparison.
 *
 * Spec: features-roadmap-component — Requirement "CnCapabilityTable".
 */
import { getLanguage, translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcTextField } from '@nextcloud/vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import {
	defaultGroupMode,
	groupCapabilities,
	hasProviders,
	RATINGS,
	resolveProvider,
} from '../../utils/capabilityComparison.js'

/**
 * How long the table waits after the last keystroke before it filters.
 *
 * 200 ms is the shortest pause that stops a 371-row regroup running on every
 * character while still feeling immediate to a touch typist.
 *
 * @type {number}
 */
const SEARCH_DEBOUNCE_MS = 200

export default {
	name: 'CnCapabilityTable',

	components: { NcButton, NcEmptyContent, NcTextField, Magnify },

	props: {
		/**
		 * The comparison document the host app supplies. Shape:
		 * `{systems, areas, features?, providers?, capabilities}`. Every key
		 * beyond `systems`, `areas` and `capabilities` is optional, and a
		 * document without them renders the table this component's consumers
		 * already had.
		 *
		 * @type {object}
		 */
		comparison: {
			type: Object,
			default: null,
		},

		/**
		 * BCP 47 locale used to pick `name` or `name_nl` on every labelled
		 * entry. Defaults to the reader's Nextcloud language.
		 *
		 * @type {string}
		 */
		locale: {
			type: String,
			default: '',
		},

		/**
		 * Render the search box. Leave it on unless the host already filters
		 * the rows it passes.
		 *
		 * @type {boolean}
		 */
		searchable: {
			type: Boolean,
			default: true,
		},

		/**
		 * Force a grouping: `feature` or `area`. When empty the table opens on
		 * features if any row carries one, and on areas otherwise, and the
		 * reader can switch.
		 *
		 * @type {string}
		 */
		groupBy: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			/**
			 * What the reader has typed, bound straight to the field. Kept
			 * separate from `query`: binding the field to the DEBOUNCED value
			 * makes it a controlled input that snaps back to the old text
			 * between keystrokes, which reads as a broken search box.
			 */
			rawQuery: '',
			/** The debounced query the table actually filters on. */
			query: '',
			/** The reader's grouping choice; empty until they make one. */
			chosenGroupMode: '',
			/** Handle of the pending debounce, cleared on unmount. */
			debounceHandle: null,
		}
	},

	computed: {
		/**
		 * @return {string} The reader's locale.
		 */
		effectiveLocale() {
			if (this.locale) {
				return this.locale
			}
			// `getLanguage()` and not a Dutch-defaulting resolver: mixing a
			// Dutch-defaulting label helper with `t()`, which falls back to its
			// English source, ships Dutch capability names inside English
			// chrome. One source, one language.
			return getLanguage() || 'en'
		},

		/**
		 * @return {Array<object>} The system columns, in document order.
		 */
		systems() {
			return this.comparison?.systems ?? []
		},

		/**
		 * @return {number} How many rows the document holds.
		 */
		totalCount() {
			return this.comparison?.capabilities?.length ?? 0
		},

		/**
		 * The grouping in force: the `groupBy` prop, else the reader's choice,
		 * else what the document suggests.
		 *
		 * @return {'feature'|'area'} The mode.
		 */
		groupMode() {
			const forced = this.groupBy === 'feature' || this.groupBy === 'area' ? this.groupBy : ''
			return forced || this.chosenGroupMode || defaultGroupMode(this.comparison)
		},

		/**
		 * The toggle is pointless on a document that maps no features, so it
		 * only renders once there is a second grouping to switch to.
		 *
		 * @return {boolean} Whether to render the grouping toggle.
		 */
		groupingAvailable() {
			return !this.groupBy && defaultGroupMode(this.comparison) === 'feature'
		},

		/**
		 * @return {boolean} Whether any row names a provider.
		 */
		showProviderColumn() {
			return hasProviders(this.comparison)
		},

		/**
		 * @return {Array<object>} The groups to render, already filtered.
		 */
		groups() {
			return groupCapabilities(this.comparison, {
				mode: this.groupMode,
				locale: this.effectiveLocale,
				query: this.query,
				unmappedLabel: this.unmappedLabel,
			})
		},

		/**
		 * @return {number} How many rows survived the search.
		 */
		visibleCount() {
			return this.groups.reduce((sum, group) => sum + group.capabilities.length, 0)
		},

		/**
		 * @return {string} The line that tells a reader how much they are seeing.
		 */
		resultCountText() {
			return n(
				'nextcloud-vue',
				'You see {count} capability of {total}.',
				'You see {count} capabilities of {total}.',
				this.visibleCount,
				{ count: this.visibleCount, total: this.totalCount },
			)
		},

		searchLabel() {
			return t('nextcloud-vue', 'Search capabilities')
		},

		searchPlaceholder() {
			return t('nextcloud-vue', 'Name, number, area or feature')
		},

		clearLabel() {
			return t('nextcloud-vue', 'Clear the search')
		},

		groupingGroupLabel() {
			return t('nextcloud-vue', 'Group the capabilities')
		},

		byFeatureLabel() {
			return t('nextcloud-vue', 'Group by feature')
		},

		byAreaLabel() {
			return t('nextcloud-vue', 'Group by area')
		},

		unmappedLabel() {
			return t('nextcloud-vue', 'Not yet mapped to a feature')
		},

		numberHeader() {
			return t('nextcloud-vue', 'No.')
		},

		capabilityHeader() {
			return t('nextcloud-vue', 'Capability')
		},

		providerHeader() {
			return t('nextcloud-vue', 'Provided by')
		},

		lowConfidenceHint() {
			return t('nextcloud-vue', 'We matched this row to its feature by judgement.')
		},

		emptyName() {
			return t('nextcloud-vue', 'No capability matches {query}', { query: this.query })
		},

		emptyDescription() {
			return t('nextcloud-vue', 'Clear the search box or try another word.')
		},
	},

	beforeUnmount() {
		if (this.debounceHandle !== null) {
			clearTimeout(this.debounceHandle)
			this.debounceHandle = null
		}
	},

	methods: {
		/**
		 * Debounce the reader's typing into `query`.
		 *
		 * @param {string} value The raw input value.
		 */
		onQueryInput(value) {
			this.rawQuery = value ?? ''
			if (this.debounceHandle !== null) {
				clearTimeout(this.debounceHandle)
			}
			this.debounceHandle = setTimeout(() => {
				this.debounceHandle = null
				this.query = this.rawQuery
			}, SEARCH_DEBOUNCE_MS)
		},

		/**
		 * Empty the search box at once, without waiting out the debounce.
		 */
		clearQuery() {
			if (this.debounceHandle !== null) {
				clearTimeout(this.debounceHandle)
				this.debounceHandle = null
			}
			this.rawQuery = ''
			this.query = ''
		},

		/**
		 * @param {'feature'|'area'} mode The grouping the reader picked.
		 */
		setGroupMode(mode) {
			this.chosenGroupMode = mode
		},

		/**
		 * @param {object} row One capability row.
		 * @return {object|null} Its provider, or null when it names none.
		 */
		providerOf(row) {
			return resolveProvider(row, this.comparison, this.effectiveLocale)
		},

		/**
		 * The kind word rendered beside the provider name. It is TEXT, not a
		 * colour: a reader who cannot tell the chips apart still reads which
		 * of the three kinds this is.
		 *
		 * @param {string} kind One of `self`, `app`, `platform`, `unknown`.
		 * @return {string} The label, empty for an unrecognised kind.
		 */
		providerKindLabel(kind) {
			if (kind === 'self') {
				return t('nextcloud-vue', 'this app')
			}
			if (kind === 'app') {
				return t('nextcloud-vue', 'another app')
			}
			if (kind === 'platform') {
				return t('nextcloud-vue', 'the platform')
			}
			return ''
		},

		/**
		 * @param {object} row One capability row.
		 * @return {boolean} Whether to mark the row's feature as a judgement.
		 */
		isLowConfidence(row) {
			return row?.featureConfidence === 'low'
				&& typeof row?.feature === 'string'
				&& row.feature.trim() !== ''
		},

		/**
		 * A rating outside the three the audit emits is shown as `unknown`
		 * rather than blanked, so a typo in the document is visible.
		 *
		 * @param {object} row One capability row.
		 * @param {string} systemKey The system column.
		 * @return {string} The rating to render.
		 */
		ratingOf(row, systemKey) {
			const rating = row?.[systemKey]
			return RATINGS.includes(rating) ? rating : 'unknown'
		},

		/**
		 * @param {string} rating One of `yes`, `partial`, `no`, `unknown`.
		 * @return {string} The reader's word for it.
		 */
		ratingLabel(rating) {
			if (rating === 'yes') {
				return t('nextcloud-vue', 'Yes')
			}
			if (rating === 'partial') {
				return t('nextcloud-vue', 'Partial')
			}
			if (rating === 'no') {
				return t('nextcloud-vue', 'No')
			}
			return t('nextcloud-vue', 'Unknown')
		},

		/**
		 * @param {object} group One rendered group.
		 * @return {string} Its table caption.
		 */
		captionFor(group) {
			return t('nextcloud-vue', 'Capabilities in {group}, rated per system.', {
				group: group.label,
			})
		},
	},
}
</script>

<style scoped>
.cn-capability-table__controls {
	display: flex;
	gap: 12px;
	align-items: flex-end;
	flex-wrap: wrap;
	margin-bottom: 8px;
}

.cn-capability-table__search {
	flex: 1 1 280px;
	min-width: 220px;
}

.cn-capability-table__grouping {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.cn-capability-table__count {
	margin: 0 0 16px;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-capability-table__group {
	margin-bottom: 24px;
}

.cn-capability-table__group-title {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0 0 8px;
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-capability-table__group-count {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: normal;
}

.cn-capability-table__scroller {
	overflow-x: auto;
}

.cn-capability-table__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-capability-table__caption {
	text-align: start;
	caption-side: top;
	padding-bottom: 8px;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-capability-table__table th,
.cn-capability-table__table td {
	border-bottom: 1px solid var(--color-border);
	padding: 6px 8px;
	text-align: start;
	vertical-align: top;
}

.cn-capability-table__table thead th {
	color: var(--color-text-maxcontrast);
	font-weight: bold;
	white-space: nowrap;
}

.cn-capability-table__num {
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-capability-table__cap {
	font-weight: normal;
	color: var(--color-main-text);
	min-width: 240px;
}

.cn-capability-table__col--self {
	background-color: var(--color-background-hover);
}

.cn-capability-table__confidence {
	display: inline-block;
	margin-inline-start: 4px;
	color: var(--color-text-maxcontrast);
	cursor: help;
}

.cn-capability-table__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

.cn-capability-table__provider {
	display: inline-flex;
	flex-direction: column;
	gap: 2px;
}

.cn-capability-table__provider-name {
	border-inline-start: 3px solid var(--color-border-dark);
	padding-inline-start: 6px;
	color: var(--color-main-text);
}

.cn-capability-table__provider--self .cn-capability-table__provider-name {
	border-inline-start-color: var(--color-primary-element);
}

.cn-capability-table__provider--app .cn-capability-table__provider-name {
	border-inline-start-color: var(--color-success);
}

.cn-capability-table__provider--platform .cn-capability-table__provider-name {
	border-inline-start-color: var(--color-warning);
}

.cn-capability-table__provider-kind {
	padding-inline-start: 9px;
	color: var(--color-text-maxcontrast);
	font-size: 0.8em;
}

.cn-capability-table__chip {
	display: inline-block;
	padding: 1px 8px;
	border-radius: var(--border-radius-pill, 100px);
	border: 1px solid var(--color-border-dark);
	color: var(--color-main-text);
	font-size: 0.85em;
	white-space: nowrap;
}

.cn-capability-table__chip--yes {
	border-color: var(--color-success);
}

.cn-capability-table__chip--partial {
	border-color: var(--color-warning);
}

.cn-capability-table__chip--no {
	border-color: var(--color-error);
}

.cn-capability-table__chip--unknown {
	border-style: dashed;
	color: var(--color-text-maxcontrast);
}
</style>
