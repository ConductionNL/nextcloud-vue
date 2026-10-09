<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-markdown-widget-form">
		<label class="cn-markdown-widget-form__label" :for="inputId">{{ t('nextcloud-vue', 'Markdown') }}</label>
		<textarea
			:id="inputId"
			v-model="markdown"
			class="cn-markdown-widget-form__text"
			rows="10"
			@input="emitContent" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

let uid = 0

/**
 * CnMarkdownWidgetForm — the config sub-form for a `markdown` widget: one
 * labelled text area. Emits `update:content` with `{ markdown }` on every
 * change; `validate()` requires some text.
 */
export default {
	name: 'CnMarkdownWidgetForm',

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},

		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every change.
		 *
		 * @event update:content
		 * @type {{markdown: string}}
		 */
		'update:content',
	],

	data() {
		uid += 1
		const initial = (this.editingWidget && this.editingWidget.content) || this.value || {}
		return { markdown: typeof initial.markdown === 'string' ? initial.markdown : '', inputId: `cn-markdown-widget-form-${uid}` }
	},

	methods: {
		t,

		/** Emit the assembled blob. */
		emitContent() {
			this.$emit('update:content', { markdown: this.markdown })
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			return this.markdown.trim() === '' ? [t('nextcloud-vue', 'Write some text')] : []
		},
	},
}
</script>

<style scoped>
.cn-markdown-widget-form {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-markdown-widget-form__label {
	font-weight: 600;
}

.cn-markdown-widget-form__text {
	width: 100%;
	resize: vertical;
	font-family: monospace;
}
</style>
