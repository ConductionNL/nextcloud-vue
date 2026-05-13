<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:no-close="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-mass-export__result"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-export-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase -->
		<div v-else
			class="cn-mass-export__form"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-export-dialog"
			data-testid-phase="form">
			<p v-if="description" class="cn-mass-export__description">
				{{ description }}
			</p>

			<div class="cn-mass-export__field">
				<label for="cn-mass-export-format">{{ formatLabel }}</label>
				<NcSelect
					input-id="cn-mass-export-format"
					:options="formatOptions"
					:model-value="selectedFormat"
					:clearable="false"
					@input="selectedFormat = $event" />
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="primary"
				:disabled="loading"
				@click="executeExport">
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import ExportIcon from 'vue-material-design-icons/Export.vue'

/**
 * CnMassExportDialog — Export dialog with format selection.
 *
 * Allows users to select an export format and triggers the export.
 * The parent handles the actual download. Based on the OpenRegister
 * ExportRegister pattern.
 *
 * ```vue
 * <CnMassExportDialog
 *   v-if="showExportDialog"
 *   ref="exportDialog"
 *   description="Export 42 objects from Cases"
 *   @confirm="onExportConfirm"
 *   @close="showExportDialog = false" />
 * ```
 *
 * // In methods:
 * async onExportConfirm({ format }) {
 *   try {
 *     const response = await axios({
 *       url: `/api/objects/export`,
 *       method: 'GET',
 *       params: { type: format },
 *       responseType: 'blob',
 *     })
 *     // Trigger download...
 *     this.$refs.exportDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.exportDialog.setResult({ error: e.message })
 *   }
 * }
 */
export default {
	name: 'CnMassExportDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcSelect,
		ExportIcon,
	},

	props: {
		/** Dialog title */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Export objects'),
		},

		/** Description text shown above the format selector */
		description: {
			type: String,
			default: '',
		},

		/** Available export formats */
		formats: {
			type: Array,
			default: () => [
				{ id: 'excel', label: 'Excel (.xlsx)' },
				{ id: 'csv', label: 'CSV (.csv)' },
			],
		},

		/** Default selected format ID */
		defaultFormat: {
			type: String,
			default: 'excel',
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Export completed successfully.'),
		},

		/** Label for the export format selector */
		formatLabel: { type: String, default: () => t('nextcloud-vue', 'Export format') },
		/** Label for the cancel button */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the confirm / primary action button */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Export') },
	},

	data() {
		const defaultOption = this.formats.find((f) => f.id === this.defaultFormat) || this.formats[0]
		return {
			selectedFormat: defaultOption,
			loading: false,
			result: null,
			closeTimeout: null,
		}
	},

	beforeDestroy() {
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	methods: {
		executeExport() {
			this.loading = true
			this.$emit('confirm', {
				format: this.selectedFormat.id,
			})
		},

		/**
		 * Set the result of the export operation.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData - Result data to pass to the dialog
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData.success) {
				this.closeTimeout = setTimeout(() => {
					this.$emit('close')
				}, 2000)
			}
		},
	},
}
</script>

<style scoped>
.cn-mass-export__description {
	margin-bottom: 16px;
	color: var(--color-text-maxcontrast);
}

.cn-mass-export__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-mass-export__field label {
	font-weight: 600;
}
</style>
