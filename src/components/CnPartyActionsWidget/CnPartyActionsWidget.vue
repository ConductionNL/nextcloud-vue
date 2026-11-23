<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-party-actions-widget" data-testid="cn-party-actions-widget">
		<ul v-if="shownIndicators.length > 0" class="cn-party-actions-widget__indicators">
			<li
				v-for="indicator in shownIndicators"
				:key="indicator.key"
				class="cn-party-actions-widget__indicator"
				:class="`cn-party-actions-widget__indicator--${indicator.tone}`"
				:data-testid="`cn-party-indicator-${indicator.key}`">
				<CnIcon v-if="indicator.icon"
					:name="indicator.icon"
					:size="18"
					aria-hidden="true" />
				<component :is="indicator.toneIcon"
					v-else
					:size="18"
					aria-hidden="true" />
				<span class="cn-party-actions-widget__indicator-text">
					<span>{{ indicator.label }}</span>
					<span v-if="indicator.toneLabel" class="cn-party-actions-widget__tone" data-testid="cn-party-indicator-tone">{{ indicator.toneLabel }}</span>
					<span v-if="indicator.meta" class="cn-party-actions-widget__meta" data-testid="cn-party-indicator-meta">{{ indicator.meta }}</span>
					<span v-if="indicator.seen" class="cn-party-actions-widget__meta" data-testid="cn-party-indicator-seen">{{ indicator.seen }}</span>
				</span>
				<NcButton
					v-if="indicator.ack"
					variant="primary"
					:disabled="acking === indicator.key"
					data-testid="cn-party-indicator-ack"
					@click="acknowledge(indicator)">
					{{ indicator.ack }}
				</NcButton>
			</li>
		</ul>
		<p v-else-if="loadError"
			class="cn-party-actions-widget__error"
			role="alert"
			data-testid="cn-party-indicator-load-error">
			{{ loadError }}
		</p>
		<span v-else-if="emptyText" class="cn-party-actions-widget__empty" data-testid="cn-party-actions-empty">
			<CheckCircleOutline :size="18" aria-hidden="true" />
			{{ emptyText }}
		</span>
		<p v-if="ackError"
			class="cn-party-actions-widget__error"
			role="alert"
			data-testid="cn-party-indicator-error">
			{{ ackError }}
		</p>
		<CnActionButtons
			v-if="indicatorActions.length > 0"
			class="cn-party-actions-widget__add"
			:actions="indicatorActions"
			data-testid="cn-party-actions-indicator-actions" />
		<CnActionButtons
			v-if="emptyActions.length > 0"
			class="cn-party-actions-widget__add"
			:actions="emptyActions"
			data-testid="cn-party-actions-add" />
		<span class="cn-party-actions-widget__spacer" />
		<CnActionButtons
			v-if="quickActions.length > 0"
			class="cn-party-actions-widget__quick"
			:actions="quickActions"
			data-testid="cn-party-actions-quick" />
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { NcButton } from '@nextcloud/vue'
import { markRaw } from 'vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import AlertOutline from 'vue-material-design-icons/AlertOutline.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { contactHref } from '../../utils/contactHref.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { OBJECT_CREATED_EVENT } from '../../utils/walkthroughSignals.js'
import { CnActionButtons } from '../CnActionButtons/index.js'

const TONES = Object.freeze(['warning', 'error', 'info', 'success', 'neutral'])

const TONE_ICONS = Object.freeze({
	warning: AlertOutline,
	error: AlertCircleOutline,
	info: InformationOutline,
	success: CheckCircleOutline,
	neutral: InformationOutline,
})

/**
 * CnPartyActionsWidget - the `party-actions` widget: one band on a contact
 * person's or organisation's page with what to watch out for and the quick
 * actions (board PqKlant / PqOrganisatie: "Geen waarschuwingen bij deze
 * inwoner. Waarschuwing toevoegen" and Bellen, Mail, Route, Bezoek
 * vastleggen, Bericht sturen).
 *
 * Everything is configuration, so pipelinq, dossiq and shillinq draw the same
 * band:
 *
 * ```json
 * {
 *   "type": "party-actions",
 *   "content": {
 *     "indicators": [
 *       { "label": "Aggressive behaviour reported", "tone": "error", "visibleWhen": { "field": "flags.aggression", "op": "eq", "value": true } },
 *       { "label": "Debt with the municipality: {debt|currency}", "tone": "warning", "visibleWhen": { "field": "debt", "op": "gt", "value": 0 } }
 *     ],
 *     "emptyText": "No warnings for this resident.",
 *     "emptyActions": [{ "id": "add-warning", "label": "Add warning", "type": "open-form", "variant": "tertiary" }],
 *     "actions": [
 *       { "id": "call", "label": "Call", "icon": "Phone", "type": "navigate", "target": "tel:@object.phone", "visibleWhen": { "field": "phone", "op": "exists" } },
 *       { "id": "visit", "label": "Log visit", "icon": "MapMarkerCheckOutline", "type": "open-modal", "target": "LogVisit" }
 *     ]
 *   }
 * }
 * ```
 *
 * Indicators that are objects of their own (a warning recorded on a person)
 * come from `indicatorSource`: one list request, `@objectId` in its filter,
 * the label and tone read at `labelPath` / `tonePath` (through `toneMap`).
 * With `url` instead of `register`/`schema` they come from an app endpoint
 * (rows at `itemsPath`), each with `toneLabels`, a `meta` line (parts, each
 * the first of its templates that fills) and an `ack` (`{ whenPath,
 * donePath, endpoint, label, seen, errorText }`): an "I have seen this"
 * button where an acknowledgement is due, else the "seen" line.
 *
 * An action `target` of `@object.<field>|tel`, `|mailto` or `|geo` becomes
 * that link, and the action is left out when the value makes none. A label
 * with `{field}` is filled from the record.
 *
 * An indicator shows when its local `visibleWhen` holds against the page
 * object (no condition: always); its label goes through the app's translate
 * and then takes `{field}` tokens from the object. Without a shown indicator
 * the band says `emptyText`. `actions` and `emptyActions` are action
 * descriptors as a page's `headerActions` take them, drawn by
 * CnActionButtons, so each has its own `id`, `icon`, `label`, `visibleWhen`
 * and action type, and `@object.<field>` tokens resolve on a detail page.
 *
 * @spec openspec/changes/party-actions-widget/specs/party-actions-widget/spec.md#requirement-a-party-page-draws-one-band-of-indicators-and-quick-actions
 */
export default {
	name: 'CnPartyActionsWidget',

	components: { CheckCircleOutline, CnActionButtons, CnIcon, NcButton },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration: `indicators` (`{ label, tone?, icon?, visibleWhen? }`,
		 * tone `warning` | `error` | `info` | `success` | `neutral`), `emptyText`,
		 * `emptyActions`, `indicatorActions` and `actions` (action descriptors), and `indicatorSource`
		 * for indicators kept as objects of their own (see `loadListed`).
		 *
		 * @type {{indicators?: Array<object>, emptyText?: string, emptyActions?: Array<object>, actions?: Array<object>}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The page object, passed by the detail page host. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The page object's id, for `@objectId` in `indicatorSource.filter`. */
		objectId: {
			type: [String, Number],
			default: null,
		},
	},

	data() {
		return {
			/** The indicators read from `indicatorSource`. */
			listed: [],
			/** The indicator being acknowledged. */
			acking: '',
			/** Why the last acknowledgement failed. */
			ackError: '',
			/** Why `indicatorSource` could not be read: shown instead of the empty sentence. */
			loadError: '',
		}
	},

	computed: {
		/** @return {string|number|null} The page object's id: the prop, else the record's. */
		partyId() {
			if (this.objectId !== null && this.objectId !== '') {
				return this.objectId
			}
			return this.objectData && this.objectData.id !== undefined ? this.objectData.id : null
		},

		/**
		 * The indicators whose condition holds, labels resolved.
		 *
		 * @return {Array<{key: string, label: string, tone: string, icon: string, toneIcon: object}>}
		 */
		shownIndicators() {
			const object = this.objectData || {}
			const list = Array.isArray(this.content?.indicators) ? this.content.indicators : []
			return [...list, ...this.listed]
				.filter((indicator) => indicator && typeof indicator === 'object' && typeof indicator.label === 'string' && indicator.label !== '')
				.filter((indicator) => evaluateVisibleWhenLocal(indicator.visibleWhen ?? null, object))
				.map((indicator, index) => {
					const tone = TONES.includes(indicator.tone) ? indicator.tone : 'warning'
					return {
						key: String(indicator.id || index),
						label: fillTemplate(this.tr(indicator.label), object),
						tone,
						icon: typeof indicator.icon === 'string' ? indicator.icon : '',
						toneIcon: markRaw(TONE_ICONS[tone]),
						toneLabel: indicator.toneLabel || '',
						meta: indicator.meta || '',
						seen: indicator.seen || '',
						ack: indicator.ack || '',
						row: indicator.row || null,
					}
				})
				// A label whose token has no value fills to '' and is left out.
				.filter((indicator) => indicator.label !== '')
		},

		/** @return {string} The sentence without a shown indicator, translated. */
		emptyText() {
			return typeof this.content?.emptyText === 'string' ? this.tr(this.content.emptyText) : ''
		},

		/** @return {Array<object>} The actions beside the empty sentence. */
		emptyActions() {
			return this.shownIndicators.length === 0 ? this.actionList(this.content?.emptyActions) : []
		},

		/** @return {Array<object>} The actions beside the indicators (`indicatorActions`), drawn while any shows. */
		indicatorActions() {
			return this.shownIndicators.length > 0 ? this.actionList(this.content?.indicatorActions) : []
		},

		/** @return {Array<object>} The quick actions at the end of the band. */
		quickActions() {
			return this.actionList(this.content?.actions)
		},
	},

	watch: {
		partyId: {
			immediate: true,
			handler() {
				this.loadListed()
			},
		},
	},

	mounted() {
		window.addEventListener(OBJECT_CREATED_EVENT, this.loadListed)
		subscribe('cn:page:refresh', this.loadListed)
	},

	beforeUnmount() {
		window.removeEventListener(OBJECT_CREATED_EVENT, this.loadListed)
		unsubscribe('cn:page:refresh', this.loadListed)
	},

	methods: {
		/**
		 * Read the indicators kept as objects of their own
		 * (`indicatorSource`: `{ register, schema, filter?, extend?, labelPath, tonePath?, toneMap?, limit? }`),
		 * e.g. pipelinq's partyIndicatorValue rows with `filter: { party: "@objectId" }`,
		 * `extend: ["indicator"]`, `labelPath: "indicator.label"`, `tonePath: "indicator.severity"`.
		 * A filter whose token does not resolve sends no request; a failed
		 * request leaves the configured indicators only.
		 *
		 * @spec openspec/changes/party-actions-widget/specs/party-actions-widget/spec.md#requirement-a-party-page-draws-one-band-of-indicators-and-quick-actions
		 * @return {Promise<void>}
		 */
		async loadListed() {
			const source = this.content?.indicatorSource
			if (source && typeof source === 'object' && typeof source.url === 'string' && source.url !== '') {
				this.listed = await this.loadFromEndpoint(source)
				return
			}
			if (!source || typeof source !== 'object' || !source.register || !source.schema || !source.labelPath) {
				this.listed = []
				return
			}
			const filter = resolveFilterTokens(source.filter || {}, { objectId: this.partyId, object: this.objectData || {} })
			if (this.partyId === null || Object.values(filter).some((value) => value === undefined || value === null || (typeof value === 'string' && value.startsWith('@')))) {
				this.listed = []
				return
			}
			if (Array.isArray(source.extend) && source.extend.length > 0) {
				filter._extend = source.extend.join(',')
			}
			let rows
			try {
				rows = await fetchReferenceObjects({ register: source.register, schema: source.schema, filter, limit: source.limit || 50 })
			} catch {
				this.listed = []
				return
			}
			const toneMap = source.toneMap && typeof source.toneMap === 'object' ? source.toneMap : {}
			this.listed = rows.map((row, index) => {
				const raw = source.tonePath ? readPath(row, source.tonePath) : undefined
				const tone = Object.hasOwn(toneMap, String(raw)) ? toneMap[String(raw)] : raw
				const label = readPath(row, source.labelPath)
				return { id: `source-${row?.id ?? index}`, label: typeof label === 'string' ? label : '', tone }
			})
		},

		/**
		 * Read indicators from an app endpoint (`indicatorSource.url`, `@objectId`
		 * filled; the rows at `itemsPath`), each with its tone label, a meta line
		 * of `meta` parts (each part the first of its templates that fills) and,
		 * with `ack`, an acknowledgement button or the "seen" line.
		 *
		 * @spec openspec/changes/party-actions-endpoint-indicators/specs/party-actions-widget/spec.md#requirement-indicators-can-come-from-an-endpoint-and-be-acknowledged
		 * @param {object} source The `indicatorSource`.
		 * @return {Promise<Array<object>>} The indicators.
		 */
		async loadFromEndpoint(source) {
			if (this.partyId === null || this.partyId === '') {
				return []
			}
			let rows
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
				const url = source.url.replace(/@objectId/g, encodeURIComponent(String(this.partyId)))
				const { data } = await axios.get(generateUrl(url))
				rows = source.itemsPath ? readPath(data, source.itemsPath) : data
			} catch {
				this.loadError = this.tr(source.errorText || 'The warnings could not be loaded.')
				return []
			}
			this.loadError = ''
			const toneMap = source.toneMap && typeof source.toneMap === 'object' ? source.toneMap : {}
			const toneLabels = source.toneLabels && typeof source.toneLabels === 'object' ? source.toneLabels : {}
			const ack = source.ack && typeof source.ack === 'object' ? source.ack : null
			return (Array.isArray(rows) ? rows : []).filter((row) => row && typeof row === 'object').map((row, index) => {
				const raw = source.tonePath ? readPath(row, source.tonePath) : undefined
				const label = readPath(row, source.labelPath || 'label')
				const meta = (Array.isArray(source.meta) ? source.meta : [])
					.map((part) => firstFilled(part, row, (key) => this.tr(key)))
					.filter((text) => text !== '')
					.join(' · ')
				const needsAck = ack && readPath(row, ack.whenPath) === true && !readPath(row, ack.donePath)
				const seen = ack && ack.seen && readPath(row, ack.donePath) ? fillTemplate(this.tr(ack.seen), row) : ''
				return {
					id: `source-${row.id ?? index}`,
					label: typeof label === 'string' ? label : '',
					tone: Object.hasOwn(toneMap, String(raw)) ? toneMap[String(raw)] : raw,
					toneLabel: Object.hasOwn(toneLabels, String(raw)) ? this.tr(toneLabels[String(raw)]) : '',
					meta,
					seen,
					ack: needsAck ? this.tr(ack.label || 'I have seen this') : '',
					row,
				}
			})
		},

		/**
		 * Acknowledge an indicator, then read them again.
		 *
		 * @spec openspec/changes/party-actions-endpoint-indicators/specs/party-actions-widget/spec.md#requirement-indicators-can-come-from-an-endpoint-and-be-acknowledged
		 * @param {object} indicator The shown indicator.
		 * @return {Promise<void>}
		 */
		async acknowledge(indicator) {
			const ack = this.content?.indicatorSource?.ack
			if (!ack || !indicator.row || this.acking) {
				return
			}
			this.acking = indicator.key
			this.ackError = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
				const path = String(ack.endpoint).replace(/\{([\w.]+)\}/g, (_m, field) => encodeURIComponent(String(readPath(indicator.row, field) ?? '')))
				await axios.post(generateUrl(path))
				await this.loadListed()
			} catch {
				this.ackError = this.tr(ack.errorText || 'This did not work. Try again.')
			} finally {
				this.acking = ''
			}
		},

		/**
		 * Translate through the app's translate.
		 *
		 * @param {string} key The source string.
		 * @return {string}
		 */
		tr(key) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(key) : key
		},

		/**
		 * The action descriptors with an id and a label, inline.
		 *
		 * @param {Array<object>} list The configured actions.
		 * @return {Array<object>}
		 */
		actionList(list) {
			const object = this.objectData || {}
			return (Array.isArray(list) ? list : [])
				.filter((action) => action && typeof action === 'object' && action.id && action.label)
				.map((action) => {
					const linked = { variant: 'secondary', ...action, inline: true }
					const filter = typeof action.target === 'string' ? action.target.match(/^@object\.([\w.]+)\|(tel|mailto|geo)$/) : null
					if (filter) {
						linked.target = contactHref(filter[2], readPath(object, filter[1]))
					}
					if (action.label.includes('{')) {
						linked.label = fillTemplate(this.tr(action.label), object)
					}
					return linked
				})
				.filter((action) => action.target !== null && action.label !== '')
		},
	},
}
</script>

<style scoped>
.cn-party-actions-widget {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px 20px;
	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-main-background);
}

.cn-party-actions-widget__indicator-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-party-actions-widget__tone,
.cn-party-actions-widget__meta {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-party-actions-widget__error {
	color: var(--color-error-text, var(--color-error));
	margin: 0;
}

.cn-party-actions-widget__indicators {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-party-actions-widget__indicator {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: 14px;
	font-size: 14px;
	font-weight: 600;
}

.cn-party-actions-widget__indicator--warning {
	background: var(--color-warning-light, var(--color-background-dark));
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-party-actions-widget__indicator--error {
	background: var(--color-error-light, var(--color-background-dark));
	color: var(--color-error-text, var(--color-main-text));
}

.cn-party-actions-widget__indicator--info,
.cn-party-actions-widget__indicator--neutral {
	background: var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-party-actions-widget__indicator--success {
	background: var(--color-success-light, var(--color-background-dark));
	color: var(--color-success-text, var(--color-main-text));
}

.cn-party-actions-widget__empty {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--color-main-text);
}

.cn-party-actions-widget__spacer {
	flex: 1 1 auto;
}

.cn-party-actions-widget__quick,
.cn-party-actions-widget__add {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-party-actions-widget__quick :deep(.button-vue) {
	min-height: 36px;
	height: 36px;
}

@media (max-width: 640px) {
	.cn-party-actions-widget__quick :deep(.button-vue) {
		min-height: 44px;
		height: 44px;
	}
}
</style>
