<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-text-widget-form">
		<NcSelect
			:value="modeOption"
			:options="modeOptions"
			:input-label="t('nextcloud-vue', 'Content type')"
			:clearable="false"
			label="label"
			@input="onModeChange" />

		<template v-if="!tableMode">
			<NcSelect
				:value="contentMode"
				:options="contentModeOptions"
				:input-label="t('nextcloud-vue', 'Mode')"
				:clearable="false"
				:reduce="option => option.value"
				label="label"
				class="cn-text-widget-form__mode"
				@input="updateField('contentMode', $event)" />

			<label class="cn-text-widget-form__field">
				{{ t('nextcloud-vue', 'Text') }}
				<!-- Markdown mode gets the full editor (toolbar + live preview);
				     raw-HTML mode keeps a plain textarea. -->
				<CnMarkdownEditor
					v-if="contentMode === 'markdown'"
					:value="text"
					mode="edit"
					:rows="6"
					:placeholder="modePlaceholder"
					@input="updateField('text', $event)" />
				<textarea
					v-else
					:value="text"
					:placeholder="modePlaceholder"
					class="cn-text-widget-form__textarea"
					rows="4"
					required
					@input="updateField('text', $event.target.value)" />
			</label>

			<NcTextField
				:value="fontSize"
				:label="t('nextcloud-vue', 'Font size')"
				placeholder="14px"
				@update:value="updateField('fontSize', $event)" />

			<label class="cn-text-widget-form__color-label">
				{{ t('nextcloud-vue', 'Text color') }}
				<input
					type="color"
					:value="color || '#000000'"
					class="cn-text-widget-form__color"
					@input="updateField('color', $event.target.value)">
			</label>

			<label class="cn-text-widget-form__color-label">
				{{ t('nextcloud-vue', 'Background color') }}
				<input
					type="color"
					:value="backgroundColor || '#ffffff'"
					class="cn-text-widget-form__color"
					@input="updateField('backgroundColor', $event.target.value)">
			</label>

			<NcSelect
				:value="textAlign"
				:options="textAlignOptions"
				:input-label="t('nextcloud-vue', 'Alignment')"
				:clearable="false"
				@input="updateField('textAlign', $event)" />
		</template>

		<template v-else>
			<CnTextTableEditor
				:value="tableValue"
				@input="onTableDataChange" />
		</template>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnTextTableEditor from '../CnTextTableEditor/CnTextTableEditor.vue'
import CnMarkdownEditor from '../CnMarkdownEditor/CnMarkdownEditor.vue'
import { emptyTable, validateTable } from '../../utils/textTable.js'

const DEFAULT_CONTENT = Object.freeze({
	text: '',
	fontSize: '14px',
	color: '',
	backgroundColor: '',
	textAlign: 'left',
	// New widgets default to 'markdown'; existing widgets without the field
	// render in the renderer's legacy 'html' branch.
	contentMode: 'markdown',
	tableMode: false,
	tableData: null,
})

const VALID_CONTENT_MODES = Object.freeze(['html', 'markdown'])

/**
 * CnTextWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * a `text` widget placement (renderer: {@link CnTextWidget}).
 *
 * A top-level "Content type" picker switches between text mode (textarea +
 * Markdown/HTML toggle, font size, two colour pickers, alignment) and table
 * mode (a {@link CnTextTableEditor} editing `content.tableData`). The legacy
 * `text` field is preserved across mode switches so toggling is lossless.
 * `validate()` defers to `validateTable()` in table mode, otherwise requires
 * non-empty text. Emits `update:content` with the assembled blob on change.
 */
export default {
	name: 'CnTextWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		CnTextTableEditor,
		CnMarkdownEditor,
	},

	props: {
		/**
		 * The placement being edited, or `null` in create mode. Pre-fills
		 * every control from `editingWidget.content`.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values — used when not editing and the parent
		 * supplies registry defaults.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		// Existing widgets with no contentMode default to 'html' to preserve
		// their rendering; new widgets (registry default) get 'markdown'.
		const isEditingExisting = this.editingWidget != null
		const fallback = isEditingExisting ? 'html' : DEFAULT_CONTENT.contentMode
		const requested = initial.contentMode
		const contentMode = VALID_CONTENT_MODES.includes(requested)
			? requested
			: fallback
		return {
			text: initial.text ?? DEFAULT_CONTENT.text,
			fontSize: initial.fontSize ?? DEFAULT_CONTENT.fontSize,
			color: initial.color ?? DEFAULT_CONTENT.color,
			backgroundColor: initial.backgroundColor ?? DEFAULT_CONTENT.backgroundColor,
			textAlign: initial.textAlign ?? DEFAULT_CONTENT.textAlign,
			contentMode,
			tableMode: initial.tableMode === true,
			tableData: initial.tableData && typeof initial.tableData === 'object'
				? initial.tableData
				: null,
		}
	},

	computed: {
		/** Alignment select options. */
		textAlignOptions() {
			return ['left', 'center', 'right', 'justify']
		},

		/** Markdown / HTML mode select options. */
		contentModeOptions() {
			return [
				{ value: 'markdown', label: t('nextcloud-vue', 'Markdown') },
				{ value: 'html', label: t('nextcloud-vue', 'HTML') },
			]
		},

		/** Placeholder text reflecting the active markdown / html mode. */
		modePlaceholder() {
			return this.contentMode === 'markdown'
				? t('nextcloud-vue', 'Markdown — # heading, **bold**, *italic*, [link](url), - list')
				: t('nextcloud-vue', 'HTML — <b>bold</b>, <i>italic</i>, <a href="…">link</a>')
		},

		/** The top-level content-type picker options. */
		modeOptions() {
			return [
				{ id: 'text', label: t('nextcloud-vue', 'Text') },
				{ id: 'table', label: t('nextcloud-vue', 'Table') },
			]
		},

		/** The currently-selected content-type option object. */
		modeOption() {
			return this.modeOptions.find((o) => o.id === (this.tableMode ? 'table' : 'text'))
		},

		/** The tableData passed to the editor, defaulting to an empty table. */
		tableValue() {
			return this.tableData || emptyTable()
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				text: this.text,
				fontSize: this.fontSize,
				color: this.color,
				backgroundColor: this.backgroundColor,
				textAlign: this.textAlign,
				contentMode: this.contentMode,
				tableMode: this.tableMode,
				tableData: this.tableData,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`. Invalid
		 * content-mode writes are ignored.
		 *
		 * @param {string} field one of: text, fontSize, color, backgroundColor, textAlign, contentMode.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			if (field === 'contentMode' && !VALID_CONTENT_MODES.includes(value)) {
				return
			}
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Switch between text and table content type, seeding an empty table
		 * on first switch and preserving the text so toggling back is lossless.
		 *
		 * @param {object} option the selected modeOptions item.
		 * @return {void}
		 */
		onModeChange(option) {
			const id = option?.id || 'text'
			this.tableMode = id === 'table'
			if (this.tableMode && !this.tableData) {
				this.tableData = emptyTable()
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Receive the latest tableData from {@link CnTextTableEditor} and
		 * bubble it up through the sub-form contract.
		 *
		 * @param {object} next the next tableData value.
		 * @return {void}
		 */
		onTableDataChange(next) {
			this.tableData = next
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid. Defers to
		 * `validateTable()` in table mode, otherwise requires non-empty text.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (this.tableMode) {
				return validateTable(this.tableData)
			}
			if (typeof this.text !== 'string' || this.text.trim() === '') {
				return [t('nextcloud-vue', 'Text is required')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-text-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-text-widget-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
}

.cn-text-widget-form__textarea {
	width: 100%;
	min-height: 96px;
	padding: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	resize: vertical;
}

.cn-text-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-text-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}

.cn-text-widget-form__mode {
	width: 100%;
}
</style>
