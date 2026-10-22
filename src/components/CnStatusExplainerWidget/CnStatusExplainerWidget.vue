<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div v-if="show" class="cn-status-explainer" data-testid="cn-status-explainer">
		<p
			v-if="reasons"
			class="cn-status-explainer__derivation"
			data-testid="cn-status-explainer-derivation">
			<span class="cn-status-explainer__heading">{{ heading }}</span>
			<span
				v-for="reason in reasons.unmet"
				:key="reason"
				class="cn-status-explainer__item"
				data-testid="cn-status-explainer-missing">
				{{ reason }}
			</span>
		</p>

		<p
			v-if="explanation"
			class="cn-status-explainer__muted"
			data-testid="cn-status-explainer-explanation">
			{{ explanation }}
		</p>

		<ul
			v-if="withheld.length > 0"
			class="cn-status-explainer__withheld"
			data-testid="cn-status-explainer-withheld">
			<li
				v-for="entry in withheld"
				:key="entry.id"
				data-testid="cn-status-explainer-withheld-entry">
				{{ withheldSentence(entry) }}
			</li>
		</ul>

		<p
			v-if="waiting"
			data-testid="cn-status-explainer-waiting">
			{{ waiting }}
		</p>

		<p
			v-if="fieldRuleLines.length > 0"
			data-testid="cn-status-explainer-field-rules">
			<span class="cn-status-explainer__heading">{{ fieldRulesHeading }}</span>
			<span
				v-for="line in fieldRuleLines"
				:key="line"
				class="cn-status-explainer__item"
				data-testid="cn-status-explainer-field-rule">
				{{ line }}
			</span>
		</p>

		<p
			v-if="dwellText"
			class="cn-status-explainer__dwell"
			:class="{ 'cn-status-explainer__dwell--breached': breached }"
			data-testid="cn-status-explainer-dwell">
			{{ dwellText }}
			<span
				v-if="breached"
				class="cn-status-badge cn-status-badge--warning cn-status-explainer__chip"
				data-testid="cn-status-explainer-breached">{{ breachedLabel }}</span>
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { fetchEndpointSource, getByPath } from '../../composables/useEndpointSource.js'
import { fieldRulesOf, hasFieldRules } from '../../utils/fieldRules.js'
import {
	derivationHeading,
	derivationReasons,
	dwellLabel,
	isDwellBreached,
	waitingOnLabel,
	withheldSentence,
	withheldTransitions,
} from '../../utils/statusDeclaration.js'

/** Where each part sits in the endpoint's answer unless `content.paths` says otherwise. */
const DEFAULT_PATHS = {
	derivation: 'derivation',
	withheld: 'withheld',
	waitingOn: 'current.waitingOn',
	dwell: 'current.dwell',
	explanation: 'current.statusDescription',
}

/**
 * CnStatusExplainerWidget — the `status-explainer` widget: what the status a
 * record is in asks of it, in sentences. What a derived status is still
 * missing, the explanation an administrator wrote on the status, the moves
 * that are withheld and what they wait on, who the record waits on, how long
 * it has been in the status (with a chip when that is longer than the status
 * allows), and what the status requires, locks and hides
 * (`@self.fieldRules`, OpenRegister's answer for this reader).
 *
 * ```json
 * {
 *   "type": "status-explainer",
 *   "content": {
 *     "endpointSource": { "url": "/apps/myapp/api/item/@objectId/available-transitions" },
 *     "paths": { "waitingOn": "current.waitingOn" },
 *     "fieldRules": true
 *   }
 * }
 * ```
 *
 * Silent when there is nothing to say. A failed read binds nothing: the
 * field rules ride on the record and still show, the endpoint's parts do not.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-explain-its-status
 */
export default {
	name: 'CnStatusExplainerWidget',

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The configuration: `endpointSource` (`{ url, params? }`, tokens
		 * `@objectId` and `@object.<field>`), `paths` (where each part sits in
		 * the answer: `derivation`, `withheld`, `waitingOn`, `dwell`,
		 * `explanation`), `fieldRules` (show `@self.fieldRules`, default true),
		 * `withheld` (show the withheld moves, default true; false for a card
		 * that says only where the record stands) and `labels`
		 * (`derivationHeading` with `{status}`, `fieldRulesHeading`).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, bound by the detail-page host. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The loaded record, bound by the detail-page host. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			loaded: false,
			answer: null,
		}
	},

	computed: {
		/** @return {object} The paths, defaults filled in. */
		paths() {
			const own = this.content?.paths && typeof this.content.paths === 'object' ? this.content.paths : {}
			return { ...DEFAULT_PATHS, ...own }
		},

		/** @return {{name: string, unmet: Array<string>}|null} What a derived status still misses. */
		reasons() {
			return this.loaded ? derivationReasons(this.part('derivation')) : null
		},

		/** @return {string} The sentence above the missing things. */
		heading() {
			if (!this.reasons) {
				return ''
			}
			const own = this.content?.labels?.derivationHeading
			if (typeof own === 'string' && own !== '') {
				return this.cnTranslate(own).replaceAll('{status}', this.reasons.name)
			}
			return derivationHeading(this.reasons.name)
		},

		/** @return {string} The explanation written on the status. */
		explanation() {
			return this.loaded ? String(this.part('explanation') ?? '').trim() : ''
		},

		/**
		 * @return {Array<object>} The withheld moves that say why, none with `withheld: false`.
		 * @spec openspec/changes/status-explainer-board/specs/record-widgets/spec.md#requirement-the-status-card-says-where-the-record-stands-as-the-board-draws-it
		 */
		withheld() {
			if (this.content?.withheld === false) {
				return []
			}
			return this.loaded ? withheldTransitions(this.part('withheld')) : []
		},

		/** @return {string} Who the record waits on, when it is not us. */
		waiting() {
			return this.loaded ? waitingOnLabel(this.part('waitingOn')) : ''
		},

		/** @return {string} How long the record has been in this status. */
		dwellText() {
			return this.loaded ? dwellLabel(this.part('dwell')) : ''
		},

		/** @return {boolean} Whether that is longer than the status allows. */
		breached() {
			return this.loaded && isDwellBreached(this.part('dwell'))
		},

		/** @return {string} The chip beside a breached dwell. */
		breachedLabel() {
			return t('nextcloud-vue', 'longer than this status allows')
		},

		/** @return {string} The heading above the field rules. */
		fieldRulesHeading() {
			const own = this.content?.labels?.fieldRulesHeading
			return typeof own === 'string' && own !== '' ? this.cnTranslate(own) : t('nextcloud-vue', 'What this status asks')
		},

		/**
		 * What the status requires, locks and hides, one line per kind.
		 *
		 * @return {Array<string>} The lines.
		 */
		fieldRuleLines() {
			if (this.content?.fieldRules === false) {
				return []
			}
			const rules = fieldRulesOf(this.objectData)
			if (!hasFieldRules(rules)) {
				return []
			}
			const lines = []
			if (rules.required.length > 0) {
				lines.push(t('nextcloud-vue', 'Fill in: {fields}', { fields: rules.required.join(', ') }, undefined, { escape: false }))
			}
			if (rules.readOnly.length > 0) {
				lines.push(t('nextcloud-vue', 'Cannot be changed here: {fields}', { fields: rules.readOnly.join(', ') }, undefined, { escape: false }))
			}
			if (rules.hidden.length > 0) {
				lines.push(t('nextcloud-vue', 'Not shown to you here: {fields}', { fields: rules.hidden.join(', ') }, undefined, { escape: false }))
			}
			return lines
		},

		/**
		 * Whether there is anything to say. The field rules ride on the record,
		 * so they show also when the endpoint refused.
		 *
		 * @return {boolean}
		 */
		show() {
			return this.fieldRuleLines.length > 0
				|| this.reasons !== null
				|| this.waiting !== ''
				|| this.dwellText !== ''
				|| this.explanation !== ''
				|| this.withheld.length > 0
		},

		/** @return {string} A key that changes when the endpoint must be read again. */
		requestKey() {
			const source = this.content?.endpointSource
			return source && source.url && this.objectId ? `${source.url}|${this.objectId}` : ''
		},
	},

	watch: {
		requestKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		withheldSentence,

		/**
		 * One part of the answer, by its configured path.
		 *
		 * @param {string} key The part.
		 * @return {unknown} The value.
		 */
		part(key) {
			return getByPath(this.answer, this.paths[key])
		},

		/**
		 * Read what the status declares. A refusal binds nothing: no strip is
		 * the honest rendering of "this app does not know what this status declares".
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (this.requestKey === '') {
				this.loaded = false
				return
			}
			try {
				this.answer = await fetchEndpointSource(this.content.endpointSource, { objectId: this.objectId, object: this.objectData || {} }, { force: true })
				this.loaded = this.answer !== null
			} catch {
				this.answer = null
				this.loaded = false
			}
		},
	},
}
</script>

<style scoped>
.cn-status-explainer {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 12px;
	border-radius: var(--border-radius-large, 8px);
	background-color: var(--color-background-hover);
}

.cn-status-explainer p {
	margin: 0;
}

.cn-status-explainer__heading {
	display: block;
	font-weight: bold;
}

.cn-status-explainer__item {
	display: block;
	margin-inline-start: 12px;
}

.cn-status-explainer__item::before {
	content: '• ';
}

.cn-status-explainer__withheld {
	margin: 0;
	padding-inline-start: 18px;
}

.cn-status-explainer__muted {
	color: var(--color-text-maxcontrast);
}

.cn-status-explainer__dwell--breached {
	color: var(--color-warning-text);
	font-weight: bold;
}

.cn-status-explainer__chip {
	margin-inline-start: 4px;
}
</style>
