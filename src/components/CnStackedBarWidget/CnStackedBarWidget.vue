<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-stacked-bar" data-testid="cn-stacked-bar">
		<div v-if="loading" class="cn-stacked-bar__state" role="status">
			<NcLoadingIcon :size="20" />
			<span>{{ loadingLabel }}</span>
		</div>
		<p v-else-if="error" class="cn-stacked-bar__state" role="status">
			{{ errorLabel }}
		</p>
		<p v-else-if="total === 0" class="cn-stacked-bar__state" data-testid="cn-stacked-bar-empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<!-- The bar is a picture of the legend below it. The legend holds
			     every label and number, so the bar itself is hidden from
			     assistive technology rather than described twice. -->
			<div class="cn-stacked-bar__bar" aria-hidden="true">
				<span
					v-for="segment in barSegments"
					:key="segment.key"
					class="cn-stacked-bar__segment"
					:style="{ flexGrow: segment.count, backgroundColor: segment.color }" />
			</div>
			<ul class="cn-stacked-bar__legend">
				<li
					v-for="segment in segments"
					:key="segment.key"
					class="cn-stacked-bar__legend-item"
					data-testid="cn-stacked-bar-legend-item">
					<span class="cn-stacked-bar__label">
						<span
							class="cn-stacked-bar__dot"
							aria-hidden="true"
							:style="{ backgroundColor: segment.color }" />
						{{ segment.label }}
					</span>
					<strong class="cn-stacked-bar__count">{{ segment.count }}</strong>
				</li>
			</ul>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { fetchGroupedCounts } from '../../utils/fetchAggregate.js'

/** The lightest step keeps this share of the primary colour, so it still stands out from the page. */
const LIGHTEST_PRIMARY_SHARE = 70

/**
 * The colour of step `index` out of `count`, on one ramp that runs from a
 * light tint of the primary colour, through the primary colour, to the text
 * colour. Steps differ in LIGHTNESS, so they stay apart for somebody who
 * cannot tell hues apart, and the ramp follows the theme because it is built
 * from Nextcloud's own variables.
 *
 * @param {number} index The step, 0-based.
 * @param {number} count The number of steps.
 * @return {string} A CSS colour.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
 */
export function rampColor(index, count) {
	if (count <= 1) {
		return 'var(--color-primary-element)'
	}
	const position = index / (count - 1)
	if (position < 0.5) {
		const share = Math.round(LIGHTEST_PRIMARY_SHARE + (position / 0.5) * (100 - LIGHTEST_PRIMARY_SHARE))
		return `color-mix(in srgb, var(--color-primary-element) ${share}%, var(--color-main-background))`
	}
	const textShare = Math.round(((position - 0.5) / 0.5) * 100)
	if (textShare === 0) {
		return 'var(--color-primary-element)'
	}
	if (textShare === 100) {
		return 'var(--color-main-text)'
	}
	return `color-mix(in srgb, var(--color-main-text) ${textShare}%, var(--color-primary-element))`
}

/**
 * CnStackedBarWidget shows how a total divides over a few groups: ONE bar cut
 * into segments, with a legend below it that names every segment and gives
 * its count. Use it for "my cases per step" or "requests per channel".
 *
 * Segments come from one grouped count request against an OpenRegister
 * source (`source.groupBy`), or from static `segments`. `order` fixes the
 * order of the segments, and `labels` gives a group key a readable name.
 * Colours come from one ramp built on the theme's primary colour; the steps
 * differ in lightness, never in hue alone. Resolved by its registry type key
 * `stacked-bar`.
 *
 * ```json
 * {
 *   "widgetKey": "stacked-bar",
 *   "props": {
 *     "content": {
 *       "source": { "register": "dossiq", "schema": "case", "groupBy": "status", "filter": { "assignee": "@me" } },
 *       "order": ["received", "in_progress", "decision", "publish"],
 *       "labels": { "received": "Received", "in_progress": "In progress", "decision": "Decision", "publish": "Publish" }
 *     }
 *   }
 * }
 * ```
 */
export default {
	name: 'CnStackedBarWidget',

	components: { NcLoadingIcon },

	inject: {
		/**
		 * Host translate function provided by CnAppRoot. Segment labels and
		 * the empty text run through it. Identity by default.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration. `source` names the OpenRegister
		 * register and schema, the `groupBy` field and an optional `filter`
		 * (the shared @-token grammar). `segments` are static entries
		 * `{ key?, label, value }` used when there is no source. `order` lists
		 * group keys in the order they render; groups it does not list follow
		 * in the order they arrive, and a listed key without records renders
		 * with a count of 0. `labels` maps a group key to its label.
		 * `emptyText` is shown when there is nothing to count.
		 *
		 * @type {{source?: {register?: string, schema?: string, groupBy?: string, filter?: object}, segments?: Array<{key?: string, label: string, value: number}>, order?: Array<string>, labels?: {[key: string]: string}, emptyText?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Translate function. Falls back to the injected `cnTranslate`. Pass it
		 * when mounting the widget outside a CnAppRoot.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	data() {
		return {
			groups: [],
			loading: false,
			error: '',
		}
	},

	computed: {
		/**
		 * The translate function in use.
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * Whether the segments come from OpenRegister.
		 *
		 * @return {boolean}
		 */
		hasSource() {
			const s = this.content.source || {}
			return Boolean(s.register && s.schema && s.groupBy)
		},

		/**
		 * The raw groups, from the source or the static list, as `{ key, label, count }`.
		 *
		 * @return {Array<{key: string, label: string, count: number}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		rawGroups() {
			if (this.hasSource) {
				return this.groups.map((group) => ({ key: group.key, label: group.key, count: group.count }))
			}
			const list = Array.isArray(this.content.segments) ? this.content.segments : []
			return list
				.filter((segment) => segment && typeof segment === 'object')
				.map((segment, index) => {
					const count = Number(segment.value)
					return {
						key: String(segment.key ?? segment.label ?? index),
						label: String(segment.label ?? segment.key ?? ''),
						count: Number.isFinite(count) && count > 0 ? count : 0,
					}
				})
		},

		/**
		 * The segments in render order, each with its label and colour.
		 *
		 * @return {Array<{key: string, label: string, count: number, color: string}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		segments() {
			const order = Array.isArray(this.content.order) ? this.content.order.map(String) : []
			const labels = (this.content.labels && typeof this.content.labels === 'object') ? this.content.labels : {}
			const byKey = {}
			for (const group of this.rawGroups) {
				byKey[group.key] = group
			}
			const ordered = []
			for (const key of order) {
				ordered.push(byKey[key] || { key, label: key, count: 0 })
			}
			for (const group of this.rawGroups) {
				if (!order.includes(group.key)) {
					ordered.push(group)
				}
			}
			return ordered.map((group, index) => ({
				key: group.key,
				label: this.effectiveTranslate(typeof labels[group.key] === 'string' ? labels[group.key] : group.label),
				count: group.count,
				color: rampColor(index, ordered.length),
			}))
		},

		/**
		 * The segments that take up room in the bar.
		 *
		 * @return {Array<object>}
		 */
		barSegments() {
			return this.segments.filter((segment) => segment.count > 0)
		},

		/**
		 * The sum of all counts.
		 *
		 * @return {number}
		 */
		total() {
			return this.segments.reduce((sum, segment) => sum + segment.count, 0)
		},

		/**
		 * The text shown when there is nothing to count.
		 *
		 * @return {string}
		 */
		emptyLabel() {
			const text = this.content.emptyText
			return (typeof text === 'string' && text !== '')
				? this.effectiveTranslate(text)
				: t('nextcloud-vue', 'Nothing to show yet')
		},

		/** @return {string} The loading text. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		/** @return {string} The text shown when the counts could not be loaded. */
		errorLabel() {
			return t('nextcloud-vue', 'The numbers could not be loaded.')
		},

		/**
		 * Changes whenever a new fetch is needed.
		 *
		 * @return {string}
		 */
		sourceKey() {
			return JSON.stringify(this.content.source || {})
		},
	},

	watch: {
		sourceKey() {
			this.fetchGroups()
		},
	},

	mounted() {
		this.fetchGroups()
	},

	methods: {
		/**
		 * Load the count per group in one request.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		async fetchGroups() {
			if (!this.hasSource) {
				this.groups = []
				this.error = ''
				return
			}
			const requestKey = this.sourceKey
			this.loading = true
			this.error = ''
			try {
				const groups = await fetchGroupedCounts(this.content.source)
				if (requestKey !== this.sourceKey) {
					return
				}
				this.groups = groups
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnStackedBarWidget] failed to load counts:', e)
				this.error = (e && e.message) || 'error'
				this.groups = []
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-stacked-bar {
	display: flex;
	flex-direction: column;
	gap: 16px;
	width: 100%;
}

.cn-stacked-bar__state {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-stacked-bar__bar {
	display: flex;
	gap: 3px;
	height: 12px;
}

.cn-stacked-bar__segment {
	flex-basis: 0;
	min-width: 4px;
	border-radius: 6px;
}

.cn-stacked-bar__legend {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-stacked-bar__legend-item {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-stacked-bar__label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.95em;
	color: var(--color-text-maxcontrast);
	overflow-wrap: anywhere;
}

.cn-stacked-bar__dot {
	flex: none;
	width: 10px;
	height: 10px;
	border-radius: 3px;
}

.cn-stacked-bar__count {
	font-size: 1.5em;
	font-weight: 700;
	line-height: 1.2;
	color: var(--color-main-text);
}
</style>
