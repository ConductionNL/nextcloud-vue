<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-schema-rules" data-testid="cn-schema-rules">
		<component :is="innerHeadingTag" v-if="title !== null" class="cn-inner-heading">
			{{ title ? text(title) : t('nextcloud-vue', 'Rules on this schema') }}
		</component>
		<p class="cn-schema-rules__hint">
			{{ description ? text(description) : t('nextcloud-vue', 'Everything the platform checks when an object is saved, in the order it checks it.') }}
		</p>

		<NcLoadingIcon v-if="loading" :size="32" :name="t('nextcloud-vue', 'Loading')" />
		<p v-else-if="error"
			class="cn-schema-rules__error"
			role="alert"
			data-testid="cn-schema-rules-error">
			{{ error }}
		</p>
		<p v-else-if="rules.length === 0" class="cn-schema-rules__empty" data-testid="cn-schema-rules-empty">
			{{ emptyText ? text(emptyText) : t('nextcloud-vue', 'Nothing is checked on this schema yet.') }}
		</p>
		<table v-else class="cn-schema-rules__table" data-testid="cn-schema-rules-table">
			<thead>
				<tr>
					<th scope="col">
						{{ t('nextcloud-vue', 'Rule') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'Kind') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'On') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'Last run') }}
					</th>
					<th scope="col">
						<span class="hidden-visually">{{ t('nextcloud-vue', 'Try') }}</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="rule in rules" :key="rule.id" data-testid="cn-schema-rules-row">
					<th scope="row">
						{{ rule.label || rule.key || rule.id }}
					</th>
					<td data-testid="cn-schema-rules-kind">
						{{ kindLabel(rule) }}
					</td>
					<td>{{ rule.enabled === false ? t('nextcloud-vue', 'Off') : t('nextcloud-vue', 'On') }}</td>
					<td>{{ rule.lastRun || t('nextcloud-vue', 'Never') }}</td>
					<td>
						<NcButton variant="tertiary"
							:disabled="trying === rule.id || trialObject.trim() === ''"
							:data-testid="`cn-schema-rules-try-${rule.id}`"
							@click="tryRule(rule)">
							{{ t('nextcloud-vue', 'Try it') }}
						</NcButton>
					</td>
				</tr>
			</tbody>
		</table>

		<div class="cn-schema-rules__trial">
			<NcTextField :modelValue="trialObject"
				:label="objectLabel ? text(objectLabel) : t('nextcloud-vue', 'Object to try a rule against')"
				:placeholder="objectPlaceholder ? text(objectPlaceholder) : t('nextcloud-vue', 'Paste an object id')"
				data-testid="cn-schema-rules-object-id"
				@update:modelValue="(v) => (trialObject = v)" />
			<p class="cn-schema-rules__hint">
				{{ t('nextcloud-vue', 'A trial writes nothing. It reads the object as it stands and says what the rule would have decided.') }}
			</p>
			<div v-if="trace" class="cn-schema-rules__trace" data-testid="cn-schema-rules-trace">
				<p class="cn-schema-rules__verdict">
					{{ verdictLine }}
				</p>
				<p v-if="trace.operand" data-testid="cn-schema-rules-operand">
					{{ t('nextcloud-vue', 'It read {operand} and found {value}.', { operand: trace.operand, value: trace.operandValue || t('nextcloud-vue', 'nothing') }) }}
				</p>
				<p v-if="trace.message">
					{{ trace.message }}
				</p>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import innerHeading from '../../mixins/innerHeading.js'
import { evaluateRule, fetchRuleVocabulary, fetchSchemaRules, kindsByName, traceOf } from './schemaRules.js'

/**
 * CnSchemaRulesWidget: the rules OpenRegister's engine holds for one schema,
 * in the order it evaluates them, each with its kind (from the engine's own
 * vocabulary), whether it is on and when it last ran, and a dry run against
 * one stored object that writes nothing and shows the trace (verdict, the
 * operand it read and what it found).
 *
 * The inventory is an admin read: a refusal is said in one sentence instead
 * of an empty table that would read as "nothing is checked".
 *
 * @spec openspec/changes/schema-rules-widget/specs/schema-rules-widget/spec.md
 */
export default {
	name: 'CnSchemaRulesWidget',

	components: { NcButton, NcLoadingIcon, NcTextField },

	mixins: [innerHeading],

	inject: {
		/** The host app's translate, for the texts the page declares. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The register slug the trial object lives in. */
		register: { type: String, required: true },
		/** The schema slug whose rules are listed. */
		schema: { type: String, required: true },
		/** The object a trial runs against, pre-filled; the reader can change it. */
		objectId: { type: String, default: '' },
		/** The heading; `null` draws none. */
		title: { type: String, default: '' },
		/** The line under the heading. */
		description: { type: String, default: '' },
		/** Said when the schema has no rules. */
		emptyText: { type: String, default: '' },
		/** The label of the trial object field. */
		objectLabel: { type: String, default: '' },
		/** The placeholder of the trial object field. */
		objectPlaceholder: { type: String, default: '' },
		/** Said when the inventory is refused (403). */
		refusedText: { type: String, default: '' },
		/** Whether to read nothing yet (a record still being created). */
		disabled: { type: Boolean, default: false },
	},

	data() {
		return {
			loading: false,
			error: '',
			rules: [],
			kinds: {},
			trialObject: this.objectId,
			trying: '',
			trace: null,
		}
	},

	computed: {
		/** @return {string} What the trial decided, as a sentence. */
		verdictLine() {
			const verdicts = {
				fired: t('nextcloud-vue', 'The rule fired.'),
				no_match: t('nextcloud-vue', 'The rule did not match this object.'),
				refused: t('nextcloud-vue', 'The rule refused the save.'),
				error: t('nextcloud-vue', 'The rule could not be evaluated.'),
			}
			return verdicts[this.trace && this.trace.verdict] || (this.trace && this.trace.verdict) || ''
		},
	},

	watch: {
		objectId(value) {
			this.trialObject = value
		},

		schema() {
			this.load()
		},
	},

	mounted() {
		if (!this.disabled) {
			this.load()
		}
	},

	methods: {
		t,

		/**
		 * @param {string} value A declared text.
		 * @return {string} It, translated by the host.
		 */
		text(value) {
			return value ? String(this.cnTranslate(String(value))) : ''
		},

		/**
		 * The word for a rule's kind, from the vocabulary, else the kind the
		 * rule carries: a blank would read as "this rule has no kind".
		 *
		 * @param {object} rule An inventory row.
		 * @return {string} The label.
		 */
		kindLabel(rule) {
			const kind = String((rule && rule.kind) ?? '')
			return String((this.kinds[kind] && this.kinds[kind].description) || kind)
		},

		/**
		 * Read the vocabulary and the inventory.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (!this.schema) {
				return
			}
			this.loading = true
			this.error = ''
			this.kinds = kindsByName(await fetchRuleVocabulary())
			try {
				this.rules = await fetchSchemaRules(this.schema)
			} catch (e) {
				this.rules = []
				const refused = Number(e && e.response && e.response.status) === 403
				this.error = refused
					? (this.refusedText ? this.text(this.refusedText) : t('nextcloud-vue', 'Only an administrator can read the rules of this schema.'))
					: t('nextcloud-vue', 'The rules could not be read. Ask an administrator.')
			}
			this.loading = false
		},

		/**
		 * Try one rule against the trial object, keyed on the rule's id.
		 *
		 * @param {object} rule An inventory row.
		 * @return {Promise<void>}
		 */
		async tryRule(rule) {
			const ruleId = String((rule && rule.id) ?? '')
			const objectId = this.trialObject.trim()
			if (ruleId === '' || objectId === '') {
				return
			}
			this.trying = ruleId
			this.trace = null
			try {
				this.trace = traceOf(await evaluateRule(this.schema, ruleId, this.register, objectId))
			} catch {
				this.trace = { verdict: 'error', operand: '', operandValue: '', message: t('nextcloud-vue', 'That object could not be read.') }
			}
			this.trying = ''
		},
	},
}
</script>

<style scoped>
.cn-schema-rules__hint {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	margin: 4px 0 12px;
}

.cn-schema-rules__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-schema-rules__table th,
.cn-schema-rules__table td {
	text-align: start;
	padding: 6px 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-schema-rules__trial {
	margin-top: 16px;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-schema-rules__trace {
	margin-top: 8px;
	padding: 8px 12px;
	border-radius: var(--border-radius-large, 8px);
	background-color: var(--color-background-hover);
}

.cn-schema-rules__trace p {
	margin: 0;
}

.cn-schema-rules__verdict {
	font-weight: bold;
}

.cn-schema-rules__error {
	color: var(--color-error-text);
}

.cn-schema-rules__empty {
	color: var(--color-text-maxcontrast);
}
</style>
