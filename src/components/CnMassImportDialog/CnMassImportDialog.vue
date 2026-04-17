<template>
	<NcDialog
		:name="dialogTitle"
		size="large"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Success/error messages -->
		<NcNoteCard v-if="result && result.success && !hasErrors" type="success">
			{{ successText }}
		</NcNoteCard>
		<NcNoteCard v-if="result && result.success && hasErrors" type="warning">
			{{ partialSuccessText }}
		</NcNoteCard>
		<NcNoteCard v-if="result && result.error" type="error">
			{{ result.error }}
		</NcNoteCard>

		<!-- Results summary table -->
		<div v-if="result && result.summary" class="cn-mass-import__results">
			<h3>{{ summaryTitle }}</h3>
			<table class="cn-mass-import__summary-table">
				<thead>
					<tr>
						<th>{{ sheetLabel }}</th>
						<th>{{ foundLabel }}</th>
						<th>{{ createdLabel }}</th>
						<th>{{ updatedLabel }}</th>
						<th>{{ unchangedLabel }}</th>
						<th>{{ errorsLabel }}</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="(sheet, key) in result.summary">
						<tr :key="key">
							<td class="cn-mass-import__sheet-name">
								{{ key }}
							</td>
							<td class="cn-mass-import__stat cn-mass-import__stat--found">
								{{ sheet.found || 0 }}
							</td>
							<td class="cn-mass-import__stat cn-mass-import__stat--created">
								{{ getCount(sheet.created) }}
							</td>
							<td class="cn-mass-import__stat cn-mass-import__stat--updated">
								{{ getCount(sheet.updated) }}
							</td>
							<td class="cn-mass-import__stat cn-mass-import__stat--unchanged">
								{{ getCount(sheet.unchanged) }}
							</td>
							<td class="cn-mass-import__stat cn-mass-import__stat--errors">
								<span>{{ getCount(sheet.errors) }}</span>
								<button
									v-if="getCount(sheet.errors) > 0"
									class="cn-mass-import__expand"
									:class="{ 'cn-mass-import__expand--open': expandedErrors[key] }"
									@click="toggleErrors(key)">
									<ChevronDown :size="16" />
								</button>
							</td>
						</tr>
						<!-- Error details row -->
						<tr
							v-if="expandedErrors[key] && sheet.errors && sheet.errors.length"
							:key="`${key}-errors`"
							class="cn-mass-import__error-row">
							<td colspan="6">
								<table class="cn-mass-import__error-table">
									<thead>
										<tr>
											<th>Row</th>
											<th>Type</th>
											<th>Message</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="(err, idx) in sheet.errors" :key="idx">
											<td>{{ err.row || '—' }}</td>
											<td>{{ err.type || 'Unknown' }}</td>
											<td>{{ err.error || err.message || '—' }}</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</div>

		<!-- Upload form -->
		<div v-if="!result" class="cn-mass-import__form">
			<input
				ref="fileInput"
				type="file"
				:accept="acceptedTypes"
				style="display: none"
				@change="handleFileSelect">

			<div class="cn-mass-import__file-row">
				<NcButton @click="$refs.fileInput.click()">
					<template #icon>
						<Upload :size="20" />
					</template>
					{{ selectFileLabel }}
				</NcButton>
				<div v-if="selectedFile" class="cn-mass-import__file-info">
					<span class="cn-mass-import__file-name">{{ selectedFile.name }}</span>
					<span class="cn-mass-import__file-size">({{ formatFileSize(selectedFile.size) }})</span>
				</div>
			</div>

			<!-- Additional fields slot (e.g., register/schema selectors) -->
			<slot name="fields" :file="selectedFile" />

			<!-- File type help text -->
			<div v-if="fileTypeHelp" class="cn-mass-import__help">
				<p><strong>{{ supportedFormatsLabel }}</strong></p>
				<ul>
					<li v-for="(help, idx) in fileTypeHelp" :key="idx">
						<strong>{{ help.label }}</strong> — {{ help.description }}
					</li>
				</ul>
			</div>

			<!-- Import options -->
			<div v-if="options.length > 0" class="cn-mass-import__options">
				<NcCheckboxRadioSwitch
					v-for="opt in options"
					:key="opt.key"
					:checked="optionValues[opt.key]"
					type="switch"
					@update:checked="setOption(opt.key, $event)">
					{{ opt.label }}
					<template v-if="opt.description" #helper>
						{{ opt.description }}
					</template>
				</NcCheckboxRadioSwitch>
			</div>
		</div>

		<!-- Loading indicator -->
		<NcNoteCard v-if="loading" type="info">
			{{ loadingText }}
		</NcNoteCard>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="!result"
				type="primary"
				:disabled="loading || !selectedFile || !canSubmit"
				@click="executeImport">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<ImportIcon v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import ImportIcon from 'vue-material-design-icons/Import.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'

/**
 * CnMassImportDialog — File import dialog with options and results summary.
 *
 * Supports file upload (JSON, Excel, CSV), configurable import options via
 * toggle switches, and a results summary table showing created/updated/error
 * counts per sheet. Based on the OpenRegister ImportRegister pattern.
 *
 * The dialog does NOT perform the import itself — it emits a `confirm` event
 * with the file and options. The parent handles the API call and calls
 * `setResult()` via a ref.
 *
 * @example
 * <CnMassImportDialog
 *   v-if="showImportDialog"
 *   ref="importDialog"
 *   :options="importOptions"
 *   @confirm="onImportConfirm"
 *   @close="showImportDialog = false">
 *   <template #fields="{ file }">
 *     <NcSelect v-if="file" :options="schemas" @input="selectedSchema = $event" />
 *   </template>
 * </CnMassImportDialog>
 *
 * // In data:
 * importOptions: [
 *   { key: 'validation', label: 'Enable validation', description: 'Validate against schema', default: true },
 *   { key: 'publish', label: 'Auto-publish', description: 'Set published date', default: false },
 * ]
 *
 * // In methods:
 * async onImportConfirm({ file, options }) {
 *   try {
 *     const formData = new FormData()
 *     formData.append('file', file)
 *     const result = await axios.post('/api/import', formData, { params: options })
 *     this.$refs.importDialog.setResult({ success: true, summary: result.data.summary })
 *   } catch (e) {
 *     this.$refs.importDialog.setResult({ error: e.message })
 *   }
 * }
 */
export default {
	name: 'CnMassImportDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcCheckboxRadioSwitch,
		Upload,
		ImportIcon,
		ChevronDown,
	},

	props: {
		/** Dialog title */
		dialogTitle: {
			type: String,
			default: 'Import Data',
		},
		/** Accepted file types (input accept attribute) */
		acceptedTypes: {
			type: String,
			default: '.json,.xlsx,.xls,.csv',
		},
		/** Import option definitions */
		options: {
			type: Array,
			default: () => [],
		},
		/** File type help entries */
		fileTypeHelp: {
			type: Array,
			default: () => [
				{ label: 'JSON', description: 'Configuration and objects.' },
				{ label: 'Excel (.xlsx, .xls)', description: 'Tabular objects data with multiple sheets.' },
				{ label: 'CSV', description: 'Single table of objects data.' },
			],
		},
		/** Whether the form is ready to submit (parent can control via slot logic) */
		canSubmit: {
			type: Boolean,
			default: true,
		},
		/** Success text when all rows imported without errors */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Import completed successfully!'),
		},
		/** Text when import partially succeeded */
		partialSuccessText: {
			type: String,
			default: () => t('nextcloud-vue', 'Import completed with errors. Check the details below.'),
		},
		/** Text shown while importing */
		loadingText: {
			type: String,
			default: () => t('nextcloud-vue', 'Importing data — this may take a moment for large files...'),
		},
		summaryTitle: { type: String, default: () => t('nextcloud-vue', 'Import summary') },
		supportedFormatsLabel: { type: String, default: () => t('nextcloud-vue', 'Supported file types:') },
		selectFileLabel: { type: String, default: () => t('nextcloud-vue', 'Select File') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Import') },
		sheetLabel: { type: String, default: () => t('nextcloud-vue', 'Sheet') },
		foundLabel: { type: String, default: () => t('nextcloud-vue', 'Found') },
		createdLabel: { type: String, default: () => t('nextcloud-vue', 'Created') },
		updatedLabel: { type: String, default: () => t('nextcloud-vue', 'Updated') },
		unchangedLabel: { type: String, default: () => t('nextcloud-vue', 'Unchanged') },
		errorsLabel: { type: String, default: () => t('nextcloud-vue', 'Errors') },
	},

	data() {
		const optionValues = {}
		this.options.forEach((opt) => {
			optionValues[opt.key] = opt.default !== undefined ? opt.default : false
		})
		return {
			selectedFile: null,
			loading: false,
			result: null,
			optionValues,
			expandedErrors: {},
		}
	},

	computed: {
		hasErrors() {
			if (!this.result || !this.result.summary) return false
			return Object.values(this.result.summary).some(
				(sheet) => sheet.errors && sheet.errors.length > 0,
			)
		},
	},

	methods: {
		handleFileSelect(event) {
			const file = event.target.files[0]
			this.selectedFile = file || null
		},

		setOption(key, value) {
			this.$set(this.optionValues, key, value)
		},

		formatFileSize(bytes) {
			if (bytes === 0) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(k))
			return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
		},

		getCount(val) {
			if (Array.isArray(val)) return val.length
			if (typeof val === 'number') return val
			return 0
		},

		toggleErrors(key) {
			this.$set(this.expandedErrors, key, !this.expandedErrors[key])
		},

		executeImport() {
			this.loading = true
			this.$emit('confirm', {
				file: this.selectedFile,
				options: { ...this.optionValues },
			})
		},

		/**
		 * Set the result of the import operation.
		 * @param {{ success?: boolean, error?: string, summary?: object }} resultData - Result data to pass to the dialog
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
		},
	},
}
</script>

<style scoped>
.cn-mass-import__form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-mass-import__file-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.cn-mass-import__file-info {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-mass-import__file-name {
	font-weight: 500;
}

.cn-mass-import__file-size {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-mass-import__help {
	padding: 12px;
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-mass-import__help p {
	margin: 0 0 8px;
}

.cn-mass-import__help ul {
	margin: 0;
	padding-left: 20px;
}

.cn-mass-import__options {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Summary table */
.cn-mass-import__results h3 {
	margin: 0 0 12px;
	font-size: 1.1rem;
}

.cn-mass-import__summary-table {
	width: 100%;
	border-collapse: collapse;
	border-radius: var(--border-radius);
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.cn-mass-import__summary-table th,
.cn-mass-import__summary-table td {
	padding: 8px 12px;
	text-align: left;
	border-bottom: 1px solid var(--color-border);
}

.cn-mass-import__summary-table th {
	background: var(--color-background-dark);
	font-weight: 600;
	font-size: 0.85rem;
	text-transform: uppercase;
}

.cn-mass-import__sheet-name {
	font-weight: 600;
}

.cn-mass-import__stat {
	text-align: center;
	font-weight: 600;
}

.cn-mass-import__stat--found { color: var(--color-primary-element); }
.cn-mass-import__stat--created { color: var(--color-success); }
.cn-mass-import__stat--updated { color: var(--color-warning); }
.cn-mass-import__stat--unchanged { color: var(--color-text-maxcontrast); }
.cn-mass-import__stat--errors { color: var(--color-error); }

.cn-mass-import__expand {
	background: none;
	border: none;
	cursor: pointer;
	padding: 2px;
	border-radius: var(--border-radius-small, 4px);
	color: var(--color-error);
	transition: transform 0.2s ease;
	vertical-align: middle;
	margin-left: 4px;
}

.cn-mass-import__expand:hover {
	background: var(--color-background-hover);
}

.cn-mass-import__expand--open {
	transform: rotate(180deg);
}

/* Error details */
.cn-mass-import__error-row td {
	padding: 8px 12px;
	background: var(--color-background-hover);
}

.cn-mass-import__error-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.9em;
}

.cn-mass-import__error-table th,
.cn-mass-import__error-table td {
	padding: 6px 10px;
	text-align: left;
	border-bottom: 1px solid var(--color-border);
}

.cn-mass-import__error-table th {
	background: var(--color-background-dark);
	font-weight: 600;
	font-size: 0.85rem;
}
</style>
