<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-stacked-bar" :class="{ 'cn-stacked-bar--inset': inset }" data-testid="cn-stacked-bar">
		<div v-if="isLoading" class="cn-stacked-bar__state" role="status">
			<NcLoadingIcon :size="20" />
			<span>{{ loadingLabel }}</span>
		</div>
		<p v-else-if="loadError" class="cn-stacked-bar__state" role="status">
			{{ errorLabel }}
		</p>
		<!-- The designed empty state the list widgets use, compact: a bare
		     line of text read as a broken widget in an empty card. -->
		<CnWidgetEmptyState
			v-else-if="total === 0"
			:name="emptyLabel"
			compact
			class="cn-stacked-bar__empty"
			data-testid="cn-stacked-bar-empty" />
		<template v-else>
			<div v-if="heading" class="cn-stacked-bar__heading">
				<strong data-testid="cn-stacked-bar-heading">{{ heading }}</strong>
				<span v-if="headingMeta" class="cn-stacked-bar__heading-meta" data-testid="cn-stacked-bar-heading-meta">{{ headingMeta }}</span>
			</div>
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
					<!-- The leading space keeps label and count two words for a
					     screen reader; it is not drawn in this flex column. -->
					<strong class="cn-stacked-bar__count">{{ ' ' + segment.count }}</strong>
				</li>
			</ul>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { inject, isRef } from 'vue'
import CnWidgetEmptyState from '../CnWidgetEmptyState/CnWidgetEmptyState.vue'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { fetchGroupedCounts } from '../../utils/fetchAggregate.js'

/** The colour of a group's tone (`content.colors`); any other value is used as a CSS colour. */
const TONE_COLORS = {
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
	info: 'var(--color-info, var(--color-primary-element))',
	neutral: 'var(--color-background-darker)',
}

/**
 * The value at a dot path of an object.
 *
 * @param {object} data The object.
 * @param {string} dotPath The path, '' for the object itself.
 * @return {unknown} The value, or undefined.
 */
function pluck(data, dotPath) {
	if (!dotPath) {
		return data
	}
	return String(dotPath).split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), data)
}

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

	components: { CnWidgetEmptyState, NcLoadingIcon },

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
		 * `emptyText` is shown when there is nothing to count. `inset: true`
		 * draws the bar and legend inside the board's inset (16px above, 24px
		 * at the sides, 22px below) instead of from card edge to card edge.
		 * `endpointSource` (`{ url, responsePath? }`, `@objectId` filled from
		 * the page) reads the groups from an app endpoint instead: the counts
		 * at `groupsPath` (a `{ key: count }` map or `[{ key, count }]`) and the
		 * whole at `totalPath`. `colors` maps a group key to a tone (`success`,
		 * `warning`, `error`, `info`, `neutral`) or a CSS colour. `remainder`
		 * (`{ key?, label }`) adds what the groups leave of the whole as a last,
		 * neutral segment. `heading` and `headingMeta` are templates over
		 * `{counted}`, `{total}`, `{remaining}` and the endpoint's own fields,
		 * drawn above the bar. `headerCount: true` reports the sum of the
		 * segments to the card (`header` event, `count`), for a chip after the
		 * title or a `{count}` in it.
		 *
		 * @type {{inset?: boolean, headerCount?: boolean, source?: {register?: string, schema?: string, groupBy?: string, filter?: object}, segments?: Array<{key?: string, label: string, value: number}>, order?: Array<string>, labels?: {[key: string]: string}, emptyText?: string}}
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

		/** The record on the page, for the `@objectId` token of `endpointSource`. */
		objectId: {
			type: String,
			default: null,
		},
	},

	emits: ['header'],

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const { data, loading, error } = useEndpointSource(() => props.content?.endpointSource || null, {
			ctx: () => {
				const ctx = (isRef(objectCtxRaw) ? objectCtxRaw.value : objectCtxRaw) || {}
				return { ...ctx, objectId: props.objectId ?? ctx.objectId ?? null, object: ctx.object || null }
			},
		})
		return { epData: data, epLoading: loading, epError: error }
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
		 * Whether the widget draws the board's inset (`content.inset`). Off
		 * by default, which keeps it edge to edge as before.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-strip-and-a-stacked-bar-can-take-the-board-inset
		 * @return {boolean}
		 */
		inset() {
			return Boolean(this.content && this.content.inset === true)
		},

		/**
		 * The translate function in use.
		 *
		 * @return {(key: string) => string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * Whether the segments come from OpenRegister.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		hasEndpoint() {
			return Boolean(this.content.endpointSource && this.content.endpointSource.url)
		},

		/** @return {boolean} Whether the counts are still loading. */
		isLoading() {
			return this.hasEndpoint ? Boolean(this.epLoading) && this.epData === null : this.loading
		},

		/** @return {string} The load error, or ''. */
		loadError() {
			return this.hasEndpoint ? (this.epError || '') : this.error
		},

		/**
		 * The endpoint's groups as `{ key, count }`, from a `{ key: count }`
		 * map or a `[{ key, count }]` list at `groupsPath`.
		 *
		 * @return {Array<{key: string, count: number}>}
		 */
		endpointGroups() {
			const raw = pluck(this.epData, this.content.groupsPath || 'groups')
			const entries = Array.isArray(raw)
				? raw.filter((entry) => entry && typeof entry === 'object').map((entry) => [entry.key, entry.count])
				: Object.entries(raw && typeof raw === 'object' ? raw : {})
			return entries.map(([key, count]) => ({ key: String(key), count: Number(count) > 0 ? Number(count) : 0 }))
		},

		/**
		 * The whole the groups are part of (`totalPath` of the endpoint), or
		 * null when none is given.
		 *
		 * @return {number|null}
		 */
		whole() {
			if (!this.hasEndpoint || !this.content.totalPath) {
				return null
			}
			const value = Number(pluck(this.epData, this.content.totalPath))
			return Number.isFinite(value) && value >= 0 ? value : null
		},

		/** @return {number} The sum of the groups, without the remainder. */
		counted() {
			return this.rawGroups.reduce((sum, group) => sum + group.count, 0)
		},

		/** @return {number} What the groups leave of the whole. */
		remaining() {
			return this.whole === null ? 0 : Math.max(0, this.whole - this.counted)
		},

		/**
		 * The values the heading templates read.
		 *
		 * @return {object}
		 */
		templateValues() {
			const own = this.epData && typeof this.epData === 'object' && !Array.isArray(this.epData) ? this.epData : {}
			return { ...own, counted: this.counted, total: this.whole === null ? this.counted : this.whole, remaining: this.remaining }
		},

		/** @return {string} The line above the bar, or ''. */
		heading() {
			return this.fillTemplate(this.content.heading)
		},

		/** @return {string} The muted line beside the heading, or ''. */
		headingMeta() {
			return this.fillTemplate(this.content.headingMeta)
		},

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
			if (this.hasEndpoint) {
				return this.endpointGroups.map((group) => ({ key: group.key, label: group.key, count: group.count }))
			}
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
			const colors = (this.content.colors && typeof this.content.colors === 'object') ? this.content.colors : {}
			const segments = ordered.map((group, index) => ({
				key: group.key,
				label: this.effectiveTranslate(typeof labels[group.key] === 'string' ? labels[group.key] : group.label),
				count: group.count,
				color: this.colorOf(colors[group.key]) || rampColor(index, ordered.length),
			}))
			const remainder = this.content.remainder
			if (remainder && typeof remainder === 'object' && this.remaining > 0) {
				segments.push({
					key: String(remainder.key || 'remainder'),
					label: this.effectiveTranslate(String(remainder.label || '')),
					count: this.remaining,
					color: this.colorOf(remainder.color) || TONE_COLORS.neutral,
				})
			}
			return segments
		},

		/**
		 * The segments that take up room in the bar.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		barSegments() {
			return this.segments.filter((segment) => segment.count > 0)
		},

		/**
		 * The total reported to the card under `headerCount: true`, or null
		 * while loading, after an error or without `headerCount`.
		 *
		 * @return {number|null}
		 * @spec openspec/changes/widget-title-count/specs/widget-title-count/spec.md#requirement-a-widget-title-can-carry-the-total-its-widget-reports
		 */
		headerTotal() {
			if (this.content.headerCount !== true || this.isLoading || this.loadError) {
				return null
			}
			return this.total
		},

		/**
		 * The sum of all counts.
		 *
		 * @return {number}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		total() {
			return this.segments.reduce((sum, segment) => sum + segment.count, 0)
		},

		/**
		 * The text shown when there is nothing to count.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		emptyLabel() {
			const text = this.content.emptyText
			return (typeof text === 'string' && text !== '')
				? this.effectiveTranslate(text)
				: t('nextcloud-vue', 'Nothing to show yet')
		},

		/**
		 * @return {string} The loading text.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		/**
		 * @return {string} The text shown when the counts could not be loaded.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		errorLabel() {
			return t('nextcloud-vue', 'The numbers could not be loaded.')
		},

		/**
		 * Changes whenever a new fetch is needed.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		sourceKey() {
			return JSON.stringify(this.content.source || {})
		},
	},

	watch: {
		/** @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget */
		sourceKey() {
			this.fetchGroups()
		},

		/** @spec openspec/changes/widget-title-count/specs/widget-title-count/spec.md#requirement-a-widget-title-can-carry-the-total-its-widget-reports */
		headerTotal: {
			immediate: true,
			handler(total) {
				if (total !== null) {
					/**
					 * @event header With `headerCount: true`, once the counts have loaded: `{ link: null, note: '', count }`, the sum of the segments.
					 */
					this.$emit('header', { link: null, note: '', count: total })
				}
			},
		},
	},

	mounted() {
		this.fetchGroups()
	},

	methods: {
		/**
		 * The CSS colour of a tone or colour value.
		 *
		 * @param {string} value A tone name or a CSS colour.
		 * @return {string} The colour, or '' for none.
		 */
		colorOf(value) {
			if (typeof value !== 'string' || value === '') {
				return ''
			}
			return TONE_COLORS[value] || value
		},

		/**
		 * Translate a heading template and fill its `{name}` placeholders.
		 *
		 * @param {string} template The template.
		 * @return {string} The line, or '' without a template.
		 */
		fillTemplate(template) {
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			const values = this.templateValues
			return this.effectiveTranslate(template).replace(/\{(\w+)\}/g, (match, name) => (
				values[name] === undefined || values[name] === null ? '' : String(values[name])
			))
		},

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

/* `content.inset: true`: the board's inset inside the card (zuiddrecht-pixel-
   gaps-3). A dashboard renders its widgets flush, so without it the strip ran
   from card edge to card edge. Theme hook: --cn-widget-board-inset. */
.cn-stacked-bar--inset {
	box-sizing: border-box;
	padding: var(--cn-widget-board-inset, 16px 24px 22px);
}

.cn-stacked-bar__heading {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
}

.cn-stacked-bar__heading-meta {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
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
