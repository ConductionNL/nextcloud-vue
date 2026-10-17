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
				<span>{{ indicator.label }}</span>
			</li>
		</ul>
		<span v-else-if="emptyText" class="cn-party-actions-widget__empty" data-testid="cn-party-actions-empty">
			<CheckCircleOutline :size="18" aria-hidden="true" />
			{{ emptyText }}
		</span>
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
import { markRaw } from 'vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import AlertOutline from 'vue-material-design-icons/AlertOutline.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
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

	components: { CheckCircleOutline, CnActionButtons, CnIcon },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration: `indicators` (`{ label, tone?, icon?, visibleWhen? }`,
		 * tone `warning` | `error` | `info` | `success` | `neutral`), `emptyText`,
		 * `emptyActions` and `actions` (action descriptors).
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
	},

	computed: {
		/**
		 * The indicators whose condition holds, labels resolved.
		 *
		 * @return {Array<{key: string, label: string, tone: string, icon: string, toneIcon: object}>}
		 */
		shownIndicators() {
			const object = this.objectData || {}
			const list = Array.isArray(this.content?.indicators) ? this.content.indicators : []
			return list
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

		/** @return {Array<object>} The quick actions at the end of the band. */
		quickActions() {
			return this.actionList(this.content?.actions)
		},
	},

	methods: {
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
			return (Array.isArray(list) ? list : [])
				.filter((action) => action && typeof action === 'object' && action.id && action.label)
				.map((action) => ({ variant: 'secondary', ...action, inline: true }))
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
