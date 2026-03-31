<!--
  CnJsonViewer — Syntax-highlighted JSON viewer/editor powered by CodeMirror.

  Supports read-only mode for displaying JSON data with syntax highlighting,
  and editable mode with formatting and validation.
-->
<template>
	<div class="cn-json-viewer">
		<div :class="['cn-json-viewer__codemirror', isDark ? 'cn-json-viewer__codemirror--dark' : 'cn-json-viewer__codemirror--light']">
			<CodeMirror
				v-model="localValue"
				:basic="true"
				placeholder="{ &quot;key&quot;: &quot;value&quot; }"
				:dark="isDark"
				:readonly="readOnly"
				:linter="readOnly ? null : jsonLinterExtension"
				:lang="jsonLangExtension"
				:extensions="[jsonLangExtension, theme]"
				:tab-size="2"
				:style="{ height }" />
			<NcButton
				v-if="!readOnly"
				class="cn-json-viewer__format-btn"
				type="secondary"
				size="small"
				@click="formatJson">
				Format JSON
			</NcButton>
		</div>
		<span v-if="!readOnly && !isValidJson(value)" class="cn-json-viewer__error">
			Invalid JSON format
		</span>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CodeMirror from 'vue-codemirror6'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'
import { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'
import { getTheme } from '../../utils/getTheme.js'

/**
 * CnJsonViewer — Syntax-highlighted JSON viewer/editor.
 *
 * Wraps CodeMirror 6 with JSON language support, syntax highlighting,
 * and optional formatting/validation. Use `readOnly` for display-only mode.
 *
 * @example Read-only display
 * <CnJsonViewer :value="jsonString" :read-only="true" />
 *
 * @example Editable with custom height
 * <CnJsonViewer :value="jsonString" height="500px" @update:value="onUpdate" />
 */
export default {
	name: 'CnJsonViewer',

	components: {
		NcButton,
		CodeMirror,
	},

	props: {
		/** JSON string to display or edit */
		value: { type: String, default: '' },
		/** When true, the editor is non-editable and hides format button and validation */
		readOnly: { type: Boolean, default: false },
		/** CSS height for the editor container */
		height: { type: String, default: '300px' },
	},

	data() {
		return {
			jsonLangExtension: jsonLang(),
			jsonLinterExtension: jsonLinter(),
			githubLight,
			githubDark,
		}
	},

	computed: {
		localValue: {
			get() { return this.value },
			set(v) { this.$emit('update:value', v) },
		},
		isDark: {
			get() { return getTheme() === 'dark' },
		},
		theme: {
			get() { return this.isDark ? githubDark : githubLight },
		},
	},

	methods: {
		/**
		 * Format the current JSON value with 2-space indentation.
		 * Emits 'update:value' with the formatted string and 'format' with the parsed object.
		 */
		formatJson() {
			try {
				if (this.value) {
					const parsed = JSON.parse(this.value)
					this.$emit('update:value', JSON.stringify(parsed, null, 2))
					this.$emit('format', parsed)
				}
			} catch {
				// Keep invalid JSON as-is
			}
		},

		/**
		 * Check if a string is valid JSON.
		 * @param {string} str - String to validate
		 * @return {boolean} True if valid JSON
		 */
		isValidJson(str) {
			if (!str || !str.trim()) return false
			try {
				JSON.parse(str)
				return true
			} catch {
				return false
			}
		},
	},
}
</script>

<style scoped>
.cn-json-viewer {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-json-viewer__codemirror {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	position: relative;
}

.cn-json-viewer__codemirror :deep(.cm-editor) {
	height: 100%;
	outline: none !important;
}

.cn-json-viewer__codemirror :deep(.cm-scroller) {
	overflow: auto;
}

.cn-json-viewer__codemirror :deep(.cm-content) {
	border-radius: 0 !important;
	border: none !important;
}

.cn-json-viewer__codemirror--light > .vue-codemirror {
	border: 1px dotted silver;
}

.cn-json-viewer__codemirror--dark > .vue-codemirror {
	border: 1px dotted grey;
}

/* Text cursor */
.cn-json-viewer__codemirror :deep(.cm-content) * {
	cursor: text !important;
}

/* PATCH SELECTION COLOR - default selection system does not work */
/* Selection background — CodeMirror uses .cm-selectionBackground instead of ::selection */
.cn-json-viewer__codemirror--light :deep(.cm-selectionBackground) {
	background: #3390ff !important;
}

.cn-json-viewer__codemirror--light :deep(.cm-selectionBackground) + .cm-selectionBackground,
.cn-json-viewer__codemirror--light :deep(.cm-line ::selection) {
	color: white !important;
}

.cn-json-viewer__codemirror--dark :deep(.cm-selectionBackground) {
	background: #3390ff !important;
}

/* Selected text color */
.cn-json-viewer__codemirror--light :deep(.cm-content ::selection) {
	background: #3390ff !important;
	color: white !important;
}

.cn-json-viewer__codemirror--dark :deep(.cm-content ::selection) {
	background: #3390ff !important;
	color: white !important;
}

.cn-json-viewer__format-btn {
	margin-top: 8px;
}

.cn-json-viewer__error {
	color: var(--color-error);
	font-size: 14px;
}
</style>
