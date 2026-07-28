<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:no-close="loading"
		data-testid="cn-modal"
		data-testid-modal="cn-export-wizard"
		@closing="onClose">
		<!-- Result phase: success / error banner shown after submit. -->
		<div v-if="result !== null"
			class="cn-export-wizard__result"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ result.message || successText }}
				<template v-if="result.jobId">
					<br>
					<small>{{ jobLabel }}: <code>{{ result.jobId }}</code></small>
				</template>
			</NcNoteCard>
			<NcNoteCard v-else-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase: scope + format + delivery fields driven by props. -->
		<div v-else
			class="cn-export-wizard__form"
			data-testid-phase="form">
			<p v-if="description" class="cn-export-wizard__description">
				{{ description }}
			</p>

			<!-- Date range (when 'date-range' is in scopes). -->
			<div v-if="scopes.includes('date-range')" class="cn-export-wizard__field cn-export-wizard__field--row">
				<div>
					<label :for="fieldIdFor('dateFrom')">{{ labelOr('dateFrom', dateFromLabel) }}</label>
					<input :id="fieldIdFor('dateFrom')"
						v-model="formData.dateFrom"
						type="date"
						class="cn-export-wizard__date">
				</div>
				<div>
					<label :for="fieldIdFor('dateTo')">{{ labelOr('dateTo', dateToLabel) }}</label>
					<input :id="fieldIdFor('dateTo')"
						v-model="formData.dateTo"
						type="date"
						class="cn-export-wizard__date">
				</div>
			</div>

			<!-- Regulation (free-form text / select via `regulations` prop). -->
			<div v-if="scopes.includes('regulation')" class="cn-export-wizard__field">
				<label :for="fieldIdFor('regulation')">{{ labelOr('regulation', regulationLabel) }}</label>
				<NcSelect v-if="regulations.length > 0"
					:input-id="fieldIdFor('regulation')"
					:options="regulations"
					:model-value="formData.regulation"
					:clearable="false"
					@update:modelValue="formData.regulation = $event" />
				<input v-else
					:id="fieldIdFor('regulation')"
					v-model="formData.regulation"
					type="text"
					class="cn-export-wizard__input">
			</div>

			<!-- Schema subset (free-form for now — see issue #283 for future schema-picker). -->
			<div v-if="scopes.includes('schema')" class="cn-export-wizard__field">
				<label :for="fieldIdFor('schema')">{{ labelOr('schema', schemaLabel) }}</label>
				<input :id="fieldIdFor('schema')"
					v-model="formData.schema"
					type="text"
					class="cn-export-wizard__input">
			</div>

			<!-- Format. -->
			<div v-if="formats.length > 0" class="cn-export-wizard__field">
				<label :for="fieldIdFor('format')">{{ labelOr('format', formatLabel) }}</label>
				<NcSelect :input-id="fieldIdFor('format')"
					:options="formats"
					:model-value="formData.format"
					:clearable="false"
					@update:model-value="formData.format = $event" />
			</div>

			<!-- Delivery channel. -->
			<div v-if="deliveries.length > 0" class="cn-export-wizard__field">
				<label :for="fieldIdFor('delivery')">{{ labelOr('delivery', deliveryLabel) }}</label>
				<NcSelect :input-id="fieldIdFor('delivery')"
					:options="deliveries"
					:model-value="formData.delivery"
					:clearable="false"
					@update:model-value="formData.delivery = $event" />
				<input v-if="formData.delivery === 'email'"
					:id="fieldIdFor('emailRecipient')"
					v-model="formData.emailRecipient"
					type="email"
					:placeholder="emailPlaceholder"
					class="cn-export-wizard__input cn-export-wizard__input--inline">
			</div>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton v-if="result === null"
				variant="primary"
				:disabled="loading"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<ExportIcon v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcSelect, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'
import ExportIcon from 'vue-material-design-icons/Export.vue'

/**
 * CnExportWizard — Configurable export trigger dialog.
 *
 * Composes scope (date range / regulation / schema), format, and
 * delivery pickers into a single dialog. Emits `@confirm` with the
 * collected form data; the parent runs the actual export (sync
 * download OR async background job + status polling) and reports
 * the outcome via `setResult({ success, jobId?, message?, error? })`.
 *
 * The widget is intentionally narrow: it covers the common shape of
 * compliance / audit / data-portability export flows (scholiq
 * AuditPackExportModal, RequestExportModal, opencatalogi pending
 * data-exchange exports). Anything beyond — multi-step wizards,
 * domain-specific scope pickers — belongs in
 * [`CnWizardDialog`](../CnWizardDialog/) or a bespoke component.
 *
 * Polling protocol (consumer-side):
 *
 * ```vue
 * <CnExportWizard
 *   ref="exportWizard"
 *   :scopes="['date-range', 'regulation']"
 *   :formats="['pdf', 'zip']"
 *   :deliveries="['download', 'email']"
 *   @confirm="onExport"
 *   @close="showExport = false" />
 * ```
 *
 * ```js
 * async onExport(formData) {
 *   const { data } = await axios.post('/api/exports', formData)
 *   // Synchronous download case:
 *   if (data.success) {
 *     this.$refs.exportWizard.setResult({ success: true, message: 'Downloaded.' })
 *     return
 *   }
 *   // Async job case — poll until done:
 *   const jobId = data.jobId
 *   this.$refs.exportWizard.setResult({ success: true, jobId, message: 'Export queued.' })
 *   // (Polling lives in the consumer; the wizard only renders the result phase.)
 * }
 * ```
 */
export default {
	name: 'CnExportWizard',
	components: { NcDialog, NcButton, NcSelect, NcNoteCard, NcLoadingIcon, ExportIcon },
	props: {
		/**
		 * Dialog title shown in the NcDialog header.
		 *
		 * @type {string}
		 */
		dialogTitle: {
			type: String,
			default: 'Export',
		},
		/**
		 * Optional description shown above the form fields.
		 *
		 * @type {string}
		 */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Scope pickers to render. Recognised values:
		 * `'date-range'`, `'regulation'`, `'schema'`. Unknown values
		 * are ignored. Empty array hides the scope section.
		 *
		 * @type {Array<'date-range'|'regulation'|'schema'>}
		 */
		scopes: {
			type: Array,
			default: () => [],
		},
		/**
		 * Format options for the format select. Each entry can be a
		 * string (the value, used as the label too) or an object
		 * `{ label, value }`.
		 *
		 * @type {Array<string|{label:string,value:string}>}
		 */
		formats: {
			type: Array,
			default: () => [],
		},
		/**
		 * Delivery options. Recognised values include `'download'`,
		 * `'email'`, `'api'`. `'email'` reveals an additional
		 * recipient input.
		 *
		 * @type {Array<string|{label:string,value:string}>}
		 */
		deliveries: {
			type: Array,
			default: () => [],
		},
		/**
		 * Optional list of regulation values (e.g. `['GDPR', 'AVG']`).
		 * When non-empty the regulation field renders as a select;
		 * when empty it renders as a free-form text input.
		 *
		 * @type {Array<string|{label:string,value:string}>}
		 */
		regulations: {
			type: Array,
			default: () => [],
		},
		/**
		 * Override-map for the built-in field labels.
		 * Keys: `'dateFrom' | 'dateTo' | 'regulation' | 'schema' | 'format' | 'delivery'`.
		 *
		 * @type {Record<string,string>}
		 */
		fieldLabels: {
			type: Object,
			default: () => ({}),
		},
		/** Confirm-button label. */
		confirmLabel: { type: String, default: 'Export' },
		/** Cancel-button label (form phase). */
		cancelLabel: { type: String, default: 'Cancel' },
		/** Close-button label (result phase). */
		closeLabel: { type: String, default: 'Close' },
		/** Success banner default text when result.message is empty. */
		successText: { type: String, default: 'Export started.' },
		/** Label preceding the jobId in the success banner. */
		jobLabel: { type: String, default: 'Job' },
		/** Email recipient input placeholder when delivery='email'. */
		emailPlaceholder: { type: String, default: 'name@example.org' },
		/** Default values for the form, merged onto an empty form. */
		defaults: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		return {
			loading: false,
			result: null,
			formData: this.buildEmptyForm(),
		}
	},
	computed: {
		/**
		 * Default label for the "Date from" input. Consumers override
		 * via `fieldLabels.dateFrom`.
		 *
		 * @return {string} The default label.
		 */
		dateFromLabel() { return 'From' },
		/**
		 * Default label for the "Date to" input.
		 *
		 * @return {string} The default label.
		 */
		dateToLabel() { return 'To' },
		/**
		 * Default label for the regulation field.
		 *
		 * @return {string} The default label.
		 */
		regulationLabel() { return 'Regulation' },
		/**
		 * Default label for the schema field.
		 *
		 * @return {string} The default label.
		 */
		schemaLabel() { return 'Schema' },
		/**
		 * Default label for the format select.
		 *
		 * @return {string} The default label.
		 */
		formatLabel() { return 'Format' },
		/**
		 * Default label for the delivery select.
		 *
		 * @return {string} The default label.
		 */
		deliveryLabel() { return 'Delivery' },
	},
	methods: {
		/**
		 * Build a fresh form-data object with default values applied.
		 *
		 * @return {object} The seed form state.
		 */
		buildEmptyForm() {
			return {
				dateFrom: '',
				dateTo: '',
				regulation: '',
				schema: '',
				format: '',
				delivery: '',
				emailRecipient: '',
				...this.defaults,
			}
		},
		/**
		 * Pick the consumer-override label for a field, falling back
		 * to the prop-level default.
		 *
		 * @param {string} key Field key (e.g. 'dateFrom').
		 * @param {string} fallback Default label to use when no
		 *   override is set.
		 * @return {string} The resolved label.
		 */
		labelOr(key, fallback) {
			return this.fieldLabels[key] || fallback
		},
		/**
		 * Stable DOM id helper so labels link to the right input.
		 *
		 * @param {string} key Field key.
		 * @return {string} The DOM id.
		 */
		fieldIdFor(key) {
			return `cn-export-wizard-${key}`
		},
		/**
		 * Confirm handler. Emits @confirm with the current form data
		 * and sets `loading` until `setResult` is called.
		 *
		 * @return {void}
		 */
		onConfirm() {
			this.loading = true
			/**
			 * @event confirm Emitted when the user clicks the
			 *   export button. Payload is the collected form data.
			 * @type {object}
			 */
			this.$emit('confirm', { ...this.formData })
		},
		/**
		 * Public method called by the parent to switch the dialog
		 * into the result phase.
		 *
		 * @param {object} result `{ success?, jobId?, message?, error? }`.
		 * @return {void}
		 */
		setResult(result) {
			this.result = result || { success: true }
			this.loading = false
		},
		/**
		 * Close-button handler. Resets local state so the next open
		 * starts fresh.
		 *
		 * @return {void}
		 */
		onClose() {
			this.result = null
			this.loading = false
			this.formData = this.buildEmptyForm()
			/**
			 * @event close Emitted when the dialog should close.
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-export-wizard__description {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-export-wizard__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 12px;
}

.cn-export-wizard__field--row {
	flex-direction: row;
	gap: 12px;
}

.cn-export-wizard__field--row > div {
	flex: 1 1 50%;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-export-wizard__input,
.cn-export-wizard__date {
	width: 100%;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-export-wizard__input--inline {
	margin-top: 8px;
}

.cn-export-wizard__result {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
</style>
