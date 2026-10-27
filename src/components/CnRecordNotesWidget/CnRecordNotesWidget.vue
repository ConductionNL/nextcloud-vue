<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-record-notes" data-testid="cn-record-notes">
		<label class="cn-record-notes__label" :class="{ 'hidden-visually': content.hideLabel === true }" :for="textId">{{ tr(content.label || '') || t('nextcloud-vue', 'Notes') }}</label>
		<textarea
			:id="textId"
			v-model="text"
			class="cn-record-notes__text"
			:rows="content.rows || 5"
			:placeholder="tr(content.placeholder || '')"
			:disabled="!canWrite"
			data-testid="cn-record-notes-text"
			@input="scheduleSave" />
		<div class="cn-record-notes__foot">
			<span class="cn-record-notes__status" role="status" data-testid="cn-record-notes-status">{{ statusText }}</span>
			<div v-if="outcome" class="cn-record-notes__outcome">
				<label class="cn-record-notes__outcome-label" :for="selectId">{{ tr(outcome.label || '') || t('nextcloud-vue', 'Outcome') }}</label>
				<select
					:id="selectId"
					v-model="choice"
					class="cn-record-notes__select"
					:disabled="!canWrite"
					data-testid="cn-record-notes-outcome">
					<option value="">
						{{ tr(outcome.placeholder || '') || t('nextcloud-vue', 'Choose') }}
					</option>
					<option v-for="option in outcomeOptions" :key="option.value" :value="option.value">
						{{ option.label }}
					</option>
				</select>
				<NcButton
					variant="secondary"
					:disabled="!canWrite || choice === '' || saving"
					data-testid="cn-record-notes-outcome-save"
					@click="saveOutcome">
					{{ tr(outcome.saveLabel || '') || t('nextcloud-vue', 'Save outcome') }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { formatTimeOfDay } from '../../utils/boardDate.js'
import { readPath } from '../../utils/readPath.js'

let instances = 0

/**
 * CnRecordNotesWidget — a text field of the record in view, edited in place
 * and saved as you type, with an optional select for a second field that is
 * saved with its own button (PqContactmoment: the conversation notes and
 * "Uitkomst noteren").
 *
 * `content`: `{ field?, label?, hideLabel?, rows?, placeholder?, savedText?,
 * savingText?, failedText?, debounceMs?, outcome?: { field, label?,
 * placeholder?, saveLabel?, options: [{ value, label }] } }`. `field` defaults
 * to `notes`. `hideLabel` keeps the label for screen readers only, for a
 * field under a heading that already names it.
 * `savedText` takes `{time}`, the time of the last save. A write is a PATCH
 * of only the edited key on the record's OpenRegister object, so a change
 * somebody else made to another key stays. Without a record id, register and
 * schema the fields are read-only: a save would have nowhere to go.
 *
 * @spec openspec/changes/record-notes-widget/specs/record-notes-widget/spec.md#requirement-a-text-field-saves-as-you-type
 */
export default {
	name: 'CnRecordNotesWidget',

	components: { NcButton },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
	},

	props: {
		/** The widget configuration; see the component description. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record in view, as the detail page hands it to a widget. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	emits: ['saved'],

	data() {
		instances += 1
		return {
			uid: instances,
			text: '',
			choice: '',
			saving: false,
			failed: false,
			savedAt: null,
			timer: null,
			loadedId: null,
		}
	},

	computed: {
		/** @return {object|null} The record in view. */
		record() {
			if (this.objectData) {
				return this.objectData
			}
			const context = this.cnObjectContext
			const value = context && typeof context === 'object' && 'value' in context ? context.value : context
			return value?.object || null
		},

		/** @return {{id: string, register: string, schema: string}} Where a save goes. */
		target() {
			const context = this.cnObjectContext
			const value = (context && typeof context === 'object' && 'value' in context ? context.value : context) || {}
			const record = this.record || {}
			const self = record['@self'] || {}
			return {
				id: String(value.objectId || record.id || self.id || ''),
				register: String(value.register || self.register || ''),
				schema: String(value.schema || self.schema || ''),
			}
		},

		/** @return {boolean} Whether a save has somewhere to go. */
		canWrite() {
			return this.target.id !== '' && this.target.register !== '' && this.target.schema !== ''
		},

		/** @return {string} The edited text field. */
		field() {
			return typeof this.content.field === 'string' && this.content.field !== '' ? this.content.field : 'notes'
		},

		/** @return {object|null} The outcome select, when configured. */
		outcome() {
			const outcome = this.content.outcome
			return outcome && typeof outcome === 'object' && typeof outcome.field === 'string' && outcome.field !== '' ? outcome : null
		},

		/** @return {Array<{value: string, label: string}>} The outcome options, labels translated. */
		outcomeOptions() {
			const options = Array.isArray(this.outcome?.options) ? this.outcome.options : []
			return options
				.filter((option) => option && typeof option.value === 'string' && option.value !== '')
				.map((option) => ({ value: option.value, label: this.tr(option.label || option.value) }))
		},

		/** @return {string} The line under the text: saving, failed, or when it was last saved. */
		statusText() {
			if (this.saving) {
				return this.tr(this.content.savingText || '') || t('nextcloud-vue', 'Saving…')
			}
			if (this.failed) {
				return this.tr(this.content.failedText || '') || t('nextcloud-vue', 'Could not save. Your text is kept here; it is saved again when you type.')
			}
			const template = this.tr(this.content.savedText || '') || t('nextcloud-vue', 'Saved automatically as you type.')
			if (this.savedAt === null) {
				return template.replace(/\s*[^.]*\{time\}[^.]*\.?/, '').trim()
			}
			return template.replace('{time}', formatTimeOfDay(this.savedAt))
		},

		/** @return {string} The textarea id. */
		textId() {
			return `cn-record-notes-text-${this.uid}`
		},

		/** @return {string} The select id. */
		selectId() {
			return `cn-record-notes-outcome-${this.uid}`
		},
	},

	watch: {
		/** Load the fields when another record comes into view. */
		record: {
			immediate: true,
			handler(record) {
				const id = this.target.id
				if (!record || id === this.loadedId) {
					return
				}
				this.loadedId = id
				const text = readPath(record, this.field)
				this.text = typeof text === 'string' ? text : ''
				const choice = this.outcome ? readPath(record, this.outcome.field) : ''
				this.choice = typeof choice === 'string' ? choice : ''
			},
		},
	},

	beforeUnmount() {
		if (this.timer !== null) {
			clearTimeout(this.timer)
			this.timer = null
			this.saveText()
		}
	},

	methods: {
		t,

		/**
		 * @param {string} text An app string.
		 * @return {string} It through the app's catalogue, '' for ''.
		 */
		tr(text) {
			return text ? this.cnTranslate(text) : ''
		},

		/** Save the text a moment after the last keystroke. */
		scheduleSave() {
			if (!this.canWrite) {
				return
			}
			if (this.timer !== null) {
				clearTimeout(this.timer)
			}
			const wait = Number.isFinite(Number(this.content.debounceMs)) ? Number(this.content.debounceMs) : 800
			this.timer = setTimeout(() => {
				this.timer = null
				this.saveText()
			}, wait)
		},

		/** @return {Promise<boolean>} Whether the text was saved. */
		saveText() {
			return this.patch({ [this.field]: this.text })
		},

		/** @return {Promise<boolean>} Whether the outcome was saved. */
		saveOutcome() {
			if (!this.outcome || this.choice === '') {
				return Promise.resolve(false)
			}
			return this.patch({ [this.outcome.field]: this.choice })
		},

		/**
		 * PATCH only these keys onto the record.
		 *
		 * @param {object} changes The keys and their values.
		 * @return {Promise<boolean>} Whether the write landed.
		 */
		async patch(changes) {
			if (!this.canWrite) {
				return false
			}
			this.saving = true
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const { id, register, schema } = this.target
				const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(id)}`)
				const response = await axios.patch(url, changes)
				this.failed = false
				this.savedAt = new Date()
				this.$emit('saved', { changes, object: response?.data ?? null })
				return true
			} catch {
				this.failed = true
				return false
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-record-notes {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.cn-record-notes__label {
	font-weight: 600;
}

.cn-record-notes__text {
	box-sizing: border-box;
	width: 100%;
	min-height: 0;
	resize: vertical;
	font: inherit;
}

.cn-record-notes__foot {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 16px;
	align-items: center;
	justify-content: space-between;
}

.cn-record-notes__status {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-notes__outcome {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.cn-record-notes__outcome-label {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}
</style>
