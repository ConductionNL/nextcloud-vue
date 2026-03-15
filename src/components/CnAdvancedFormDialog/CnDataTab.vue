<template>
	<div class="cn-advanced-form-dialog__json-editor">
		<div :class="['cn-advanced-form-dialog__codemirror-container', dark ? 'cn-advanced-form-dialog__codemirror-container--dark' : 'cn-advanced-form-dialog__codemirror-container--light']">
			<CodeMirror
				v-model="localValue"
				:basic="true"
				placeholder="{ &quot;key&quot;: &quot;value&quot; }"
				:dark="dark"
				:linter="jsonLinterExtension"
				:lang="jsonLangExtension"
				:extensions="[jsonLangExtension]"
				:tab-size="2"
				style="height: 400px" />
			<NcButton
				class="cn-advanced-form-dialog__format-btn"
				type="secondary"
				size="small"
				@click="formatJson">
				Format JSON
			</NcButton>
		</div>
		<span v-if="!isValidJson(value)" class="cn-advanced-form-dialog__json-error">
			Invalid JSON format
		</span>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CodeMirror from 'vue-codemirror6'
import { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'

export default {
	name: 'CnDataTab',

	components: {
		NcButton,
		CodeMirror,
	},

	props: {
		/** Current JSON string value */
		value: { type: String, default: '' },
		/** Use dark theme for the editor */
		dark: { type: Boolean, default: false },
	},

	data() {
		return {
			jsonLangExtension: jsonLang(),
			jsonLinterExtension: jsonLinter(),
		}
	},

	computed: {
		localValue: {
			get() { return this.value },
			set(v) { this.$emit('update:value', v) },
		},
	},

	methods: {
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
.cn-advanced-form-dialog__json-editor {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-advanced-form-dialog__codemirror-container {
	margin-top: 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	position: relative;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-editor) {
	height: 100%;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-scroller) {
	overflow: auto;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-content) {
	border-radius: 0 !important;
	border: none !important;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-editor) {
	outline: none !important;
}

.cn-advanced-form-dialog__codemirror-container--light > .vue-codemirror {
	border: 1px dotted silver;
}

.cn-advanced-form-dialog__codemirror-container--dark > .vue-codemirror {
	border: 1px dotted grey;
}

/* value text color */
/* string */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼe) {
	color: #448c27;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼe) {
	color: #88c379;
}

/* boolean */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼc) {
	color: #221199;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼc) {
	color: #8d64f7;
}

/* null */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼb) {
	color: #770088;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼb) {
	color: #be55cd;
}

/* number */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼd) {
	color: #d19a66;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼd) {
	color: #9d6c3a;
}

/* text cursor */
.cn-advanced-form-dialog__codemirror-container :deep(.cm-content) * {
	cursor: text !important;
}

/* selection color */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line)::selection,
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line) ::selection {
	background-color: #d7eaff !important;
	color: black;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line)::selection,
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line) ::selection {
	background-color: #8fb3e6 !important;
	color: black;
}

/* string selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼe)::selection {
	color: #2d770f;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼe)::selection {
	color: #104e0c;
}

/* boolean selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼc)::selection {
	color: #221199;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼc)::selection {
	color: #4026af;
}

/* null selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼb)::selection {
	color: #770088;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼb)::selection {
	color: #770088;
}

/* number selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼd)::selection {
	color: #8c5c2c;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼd)::selection {
	color: #623907;
}

.cn-advanced-form-dialog__format-btn {
	margin-top: 8px;
}

.cn-advanced-form-dialog__json-error {
	color: var(--color-error);
	font-size: 14px;
}
</style>
