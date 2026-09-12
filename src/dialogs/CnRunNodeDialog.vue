<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -->

<template>
	<NcDialog
		:name="tr(title)"
		size="normal"
		:no-close="loading"
		data-testid="cn-run-node-dialog"
		@closing="$emit('close')">
		<NcNoteCard v-if="loadError" type="error" data-testid="cn-run-node-dialog-error">
			{{ loadError }}
		</NcNoteCard>

		<div v-else class="cn-run-node-dialog__form">
			<div
				v-for="field in fields"
				:key="field.key"
				:data-cn-field="field.key"
				class="cn-run-node-dialog__field">
				<NcCheckboxRadioSwitch
					v-if="field.type === 'boolean'"
					:model-value="values[field.key] === true"
					type="switch"
					@update:model-value="setValue(field.key, $event)">
					{{ tr(field.label) }}
				</NcCheckboxRadioSwitch>

				<NcSelect
					v-else-if="field.type === 'select'"
					:model-value="selectedOption(field)"
					:options="optionsFor(field)"
					:input-label="tr(field.label)"
					:loading="optionsLoading[field.key] === true"
					:placeholder="t('nextcloud-vue', 'Pick one…')"
					@update:model-value="setValue(field.key, $event ? $event.id : '')" />

				<NcTextArea
					v-else-if="field.type === 'textarea'"
					:model-value="String(values[field.key] ?? '')"
					:label="tr(field.label)"
					:helper-text="tr(field.help)"
					rows="4"
					@update:model-value="setValue(field.key, $event)" />

				<NcTextField
					v-else-if="field.type === 'number'"
					:model-value="String(values[field.key] ?? '')"
					type="number"
					:label="tr(field.label)"
					:helper-text="tr(field.help)"
					@update:model-value="setNumberValue(field.key, $event)" />

				<NcTextField
					v-else
					:model-value="String(values[field.key] ?? '')"
					:label="tr(field.label)"
					:helper-text="tr(field.help)"
					@update:model-value="setValue(field.key, $event)" />
			</div>

			<p v-if="!fields.length" class="cn-run-node-dialog__hint">
				{{ t('nextcloud-vue', 'This step has no options.') }}
			</p>
		</div>

		<template #actions>
			<NcButton :disabled="loading" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="!loadError"
				variant="primary"
				:disabled="loading || !requiredFieldsFilled"
				@click="$emit('confirm', values)">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Run') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'

/**
 * The dialog `run-node` opens to collect a directly-invoked flow node's own
 * declared config, before POSTing to OpenRegister's
 * `/api/flows/{flowId}/nodes/{nodeId}/run` (manifest-run-node-action / RN-4).
 *
 * WHY THIS IS A NEW, SMALL RENDERER AND NOT `CnFlowNodeEditModal`'S ONE
 * ----------------------------------------------------------------------
 * design.md says "render it with the SAME field renderer CnFlowSidebar
 * [reads: CnFlowNodeEditModal] uses" as the INTENT — no new form-rendering
 * VOCABULARY — and this component honours that: the type-to-widget mapping
 * (switch/select/textarea/number/text) and the `optionsFrom` fetch-and-
 * normalise behaviour below are the SAME rules that modal applies. What it
 * does NOT reuse is that modal's component/methods directly, because that
 * renderer solves a materially different problem: it guesses a widget for
 * ANY engine config key via `widgetFor()` heuristics (including keys no
 * `configForm()` ever declared — cron expressions, HTTP methods, principal
 * pickers, a `runAs` identity field, a raw-JSON fallback), because the flow
 * EDITOR must let an author set every key the engine reads whether or not
 * its type ever described one. A run-node CALLER dialog has no such need —
 * it renders ONLY the fields `configForm()` explicitly declares (this
 * interface's whole contract, per its own docblock: "a field over a key the
 * node ignores looks like it works and changes nothing") — text / textarea /
 * number / boolean / select, nothing else. Extracting a shared component
 * from the editor's modal is a reasonable follow-up; it was not done here to
 * avoid an invasive refactor of an unrelated, already-shipped surface for a
 * dialog whose actual field vocabulary is a fifth its size.
 *
 * @spec openspec/changes/manifest-run-node-action/specs/manifest-run-node-action/spec.md#requirement-the-nodes-own-config-form-drives-the-dialog-not-a-new-token
 */
export default {
	name: 'CnRunNodeDialog',

	components: { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard, NcSelect, NcTextArea, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		title: { type: String, default: '' },
		/**
		 * The node's declared config form — `IFlowNodeConfigForm::configForm()`'s
		 * shape, unchanged: `[{key, label, type, help?, required?, optionsFrom?}]`.
		 * @type {Array<object>}
		 */
		fields: { type: Array, default: () => [] },
		/** Whether a run is in flight — disables Cancel/Run and shows a spinner. */
		loading: { type: Boolean, default: false },
		/** Set when the node's form could not be resolved; replaces the form with an error and hides Run. */
		loadError: { type: String, default: '' },
		/** The consumer's bound `t()`, matching CnActionButtons' own `cnTranslate` inject. */
		translate: { type: Function, default: null },
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			/** Live field values, keyed by field.key. */
			values: {},
			/** Fetched `{id, label}` options per select field.key. */
			options: {},
			/** In-flight flag per select field.key. */
			optionsLoading: {},
		}
	},

	computed: {
		/** Every `required: true` field carries a non-empty value. */
		requiredFieldsFilled() {
			return this.fields.every((field) => {
				if (field.required !== true) return true
				const value = this.values[field.key]
				return value !== undefined && value !== null && value !== ''
			})
		},
	},

	watch: {
		fields: {
			immediate: true,
			handler(fields) {
				const seed = {}
				for (const field of (fields || [])) {
					seed[field.key] = field.type === 'boolean' ? false : ''
				}
				this.values = seed
				for (const field of (fields || [])) {
					if (field.type === 'select' && field.optionsFrom) {
						this.loadOptions(field)
					}
				}
			},
		},
	},

	methods: {
		t,

		/**
		 * Resolve a manifest/node-authored UI string through the host translate
		 * function, matching CnActionButtons' own `tr()`.
		 *
		 * @param {string} [value] The English source string.
		 * @return {string|undefined} The translated (or source) string.
		 */
		tr(value) {
			if (!value) return value
			return typeof this.translate === 'function' ? this.translate(value) : value
		},

		/**
		 * Write one field's value.
		 *
		 * @param {string} key The field key.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		setValue(key, value) {
			this.values = { ...this.values, [key]: value }
		},

		/**
		 * Write a number field, coercing an empty string to '' (not 0 — an
		 * empty required-number field must still fail `requiredFieldsFilled`)
		 * and anything else to a JS number.
		 *
		 * @param {string} key The field key.
		 * @param {string} raw The NcTextField string value.
		 * @return {void}
		 */
		setNumberValue(key, raw) {
			this.setValue(key, raw === '' ? '' : Number(raw))
		},

		/**
		 * The NcSelect-shaped `{id, label}` currently selected for a field, or
		 * null. Falls back to `{id: value, label: String(value)}` when the
		 * stored value is not (yet, or no longer) among the loaded options —
		 * the same graceful-degrade `CnFlowNodeEditModal` applies.
		 *
		 * @param {object} field The field declaration.
		 * @return {object|null}
		 */
		selectedOption(field) {
			const value = this.values[field.key]
			if (value === undefined || value === null || value === '') return null
			const opts = this.options[field.key] || []
			return opts.find((o) => o.id === value) || { id: value, label: String(value) }
		},

		/**
		 * The loaded `{id, label}` options for a select field.
		 *
		 * @param {object} field The field declaration.
		 * @return {Array<object>}
		 */
		optionsFor(field) {
			return this.options[field.key] || []
		},

		/**
		 * Fetch and normalise a select field's `optionsFrom` catalogue —
		 * SAME acceptance shape as `CnFlowNodeEditModal`'s own picker (design.md's
		 * point: reuse the FORM CONTRACT, not necessarily the component): a bare
		 * array or `{results: [...]}`; each row read as `{id, label}`,
		 * `{value, label}`, or an OpenRegister object (`@self.uuid`/`uuid`,
		 * `name`/`title`). A row this dialog cannot make sense of is dropped
		 * rather than shown as a blank option.
		 *
		 * @param {object} field The field declaration carrying `optionsFrom`.
		 * @return {Promise<void>}
		 */
		async loadOptions(field) {
			this.optionsLoading = { ...this.optionsLoading, [field.key]: true }
			try {
				const [{ default: axios }] = await Promise.all([import('@nextcloud/axios')])
				const raw = String(field.optionsFrom)
				const url = (raw.startsWith('/') && !raw.startsWith('/apps') && !raw.startsWith('/index.php'))
					? generateUrl(raw)
					: raw
				const response = await axios.get(url)
				const rows = Array.isArray(response.data) ? response.data : (response.data?.results || [])
				const opts = rows.map((row) => {
					const id = row.id ?? row.value ?? row['@self']?.uuid ?? row.uuid
					return { id, label: row.label || row.name || row.title || String(id) }
				}).filter((o) => o.id !== undefined && o.id !== null && o.id !== '')
				this.options = { ...this.options, [field.key]: opts }
			} catch (error) {
				// A picker that fails to load degrades to an empty list rather
				// than blocking the whole dialog — the field just shows no
				// choices, which is honest about what happened.
				// eslint-disable-next-line no-console
				console.error(`cn-run-node-dialog: could not load options for "${field.key}"`, error)
			} finally {
				this.optionsLoading = { ...this.optionsLoading, [field.key]: false }
			}
		},
	},
}
</script>

<style scoped>
.cn-run-node-dialog__form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-run-node-dialog__hint {
	color: var(--color-text-maxcontrast);
}
</style>
