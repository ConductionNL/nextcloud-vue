<!--
  CnJsonViewer — Syntax-highlighted code viewer/editor powered by CodeMirror.

  Supports multiple languages (JSON, XML, HTML, plain text) with optional
  auto-detection. Use `readOnly` for display-only mode.
-->
<template>
	<div class="cn-json-viewer">
		<div :class="['cn-json-viewer__codemirror', isDark ? 'cn-json-viewer__codemirror--dark' : 'cn-json-viewer__codemirror--light']">
			<CodeMirror
				v-model="localValue"
				:basic="true"
				:placeholder="resolvedLanguage === 'json' ? '{ &quot;key&quot;: &quot;value&quot; }' : ''"
				:dark="isDark"
				:readonly="readOnly"
				:linter="linterExtension"
				:lang="langExtension"
				:extensions="editorExtensions"
				:tab-size="2"
				:style="{ height }" />
			<NcButton
				v-if="!readOnly && resolvedLanguage === 'json'"
				class="cn-json-viewer__format-btn"
				type="secondary"
				size="small"
				@click="formatJson">
				Format JSON
			</NcButton>
		</div>
		<span v-if="!readOnly && resolvedLanguage === 'json' && !isValidJson(value)" class="cn-json-viewer__error">
			Invalid JSON format
		</span>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CodeMirror from 'vue-codemirror6'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'
import { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'
import { xml as xmlLang } from '@codemirror/lang-xml'
import { html as htmlLang } from '@codemirror/lang-html'
import { getTheme } from '../../utils/getTheme.js'

/**
 * CnJsonViewer — Syntax-highlighted code viewer/editor.
 *
 * Wraps CodeMirror 6 with support for JSON, XML, HTML, and plain text.
 * Includes syntax highlighting, and optional formatting/validation for JSON.
 * Use `readOnly` for display-only mode.
 *
 * @example Read-only JSON display (default)
 * <CnJsonViewer :value="jsonString" :read-only="true" />
 *
 * @example Auto-detect language from content
 * <CnJsonViewer :value="responseBody" :read-only="true" language="auto" />
 *
 * @example Explicit XML mode
 * <CnJsonViewer :value="xmlString" :read-only="true" language="xml" />
 *
 * @example Editable JSON with custom height
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
		/**
		 * Content language for syntax highlighting.
		 * - 'auto': Auto-detect from content (JSON → xml → text) (default)
		 * - 'json': JSON with validation and formatting
		 * - 'xml': XML/HTML tag highlighting
		 * - 'html': Alias for XML highlighting
		 * - 'text': Plain text, no highlighting
		 */
		language: {
			type: String,
			default: 'auto',
			validator: (v) => ['json', 'xml', 'html', 'text', 'auto'].includes(v),
		},
	},

	data() {
		return {
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
		/**
		 * Resolve 'auto' language to a concrete language based on content.
		 * @return {string} Resolved language: 'json', 'xml', or 'text'
		 */
		resolvedLanguage() {
			if (this.language !== 'auto') {
				return this.language
			}
			const trimmed = (this.value || '').trim()
			if (!trimmed) return 'text'
			try {
				JSON.parse(trimmed)
				return 'json'
			} catch {
				// not JSON
			}
			if (trimmed.charAt(0) === '<' && trimmed.includes('>')) {
				// Detect HTML by doctype or common HTML tags
				if (/<!doctype\s+html/i.test(trimmed) || /<(?:html|head|body|div|span|p|a|script|style|link|meta|form|input|button|table|ul|ol|li|h[1-6]|img|nav|header|footer|main|section|article)\b/i.test(trimmed)) {
					return 'html'
				}
				return 'xml'
			}
			return 'text'
		},
		/**
		 * CodeMirror language extension based on resolved language.
		 * @return {object|null} Language extension or null for plain text
		 */
		langExtension() {
			switch (this.resolvedLanguage) {
			case 'json':
				return jsonLang()
			case 'html':
				return htmlLang()
			case 'xml':
				return xmlLang()
			case 'text':
			default:
				return null
			}
		},
		/**
		 * CodeMirror linter extension (only active for JSON in edit mode).
		 * @return {object|null} Linter extension or null
		 */
		linterExtension() {
			if (this.readOnly) return null
			if (this.resolvedLanguage === 'json') return jsonLinter()
			return null
		},
		/**
		 * Combined CodeMirror extensions array.
		 * @return {Array} Extensions including theme and optional language
		 */
		editorExtensions() {
			const exts = [this.theme]
			if (this.langExtension) exts.push(this.langExtension)
			return exts
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
