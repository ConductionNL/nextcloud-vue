<template>
	<div class="cn-markdown-editor" data-testid="cn-markdown-editor" :class="modeClass">
		<!-- Toolbar with formatting shortcuts (textarea modes only; WYSIWYG has its own). -->
		<div v-if="!hideToolbar && mode !== 'wysiwyg'" class="cn-markdown-editor__toolbar" role="toolbar">
			<button v-for="tool in toolbar"
				:key="tool.id"
				type="button"
				class="cn-markdown-editor__tool"
				:title="tool.tooltip || tool.label"
				:data-testid="'tool-' + tool.id"
				@click="invokeTool(tool)">
				<span>{{ tool.label }}</span>
			</button>
			<span class="cn-markdown-editor__spacer" />
			<button v-if="!hideModeSwitch"
				type="button"
				class="cn-markdown-editor__tool cn-markdown-editor__mode-switch"
				:title="modeSwitchTooltip"
				data-testid="mode-switch"
				@click="cycleMode">
				{{ currentModeLabel }}
			</button>
		</div>

		<!-- Pane layout: edit / preview / split (textarea + rendered preview). -->
		<div v-if="mode !== 'wysiwyg'" class="cn-markdown-editor__panes" :data-mode="mode">
			<textarea v-if="mode !== 'preview'"
				ref="textarea"
				class="cn-markdown-editor__textarea"
				:value="localValue"
				:placeholder="placeholder"
				:rows="rows"
				:disabled="disabled"
				:aria-label="ariaLabel"
				data-testid="cn-markdown-textarea"
				@input="onInput"
				@keydown="onKeydown" />
			<div v-if="mode !== 'edit'"
				class="cn-markdown-editor__preview"
				data-testid="cn-markdown-preview"
				v-html="renderedHtml" />
		</div>

		<!-- WYSIWYG mode: lazily-mounted Toast UI editor. -->
		<div v-else class="cn-markdown-editor__wysiwyg" data-testid="cn-markdown-wysiwyg">
			<component
				:is="toastEditorComponent"
				v-if="toastEditorComponent"
				ref="toast"
				:initial-value="localValue"
				:options="wysiwygOptions"
				initial-edit-type="wysiwyg"
				preview-style="tab"
				:height="wysiwygHeight"
				@change="onWysiwygChange" />
			<p v-else class="cn-markdown-editor__hint">{{ t('nextcloud-vue', 'Loading editor…') }}</p>
		</div>

		<!-- Hint row. -->
		<small v-if="hint" class="cn-markdown-editor__hint">{{ hint }}</small>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'

/**
 * Default formatting toolbar — Markdown insertions that wrap a
 * selection or insert a placeholder.
 *
 * @type {Array<{id:string,label:string,prefix:string,suffix?:string,placeholder?:string}>}
 */
const DEFAULT_TOOLBAR = Object.freeze([
	{ id: 'bold', label: 'B', prefix: '**', suffix: '**', placeholder: 'bold', tooltip: 'Bold (Ctrl+B)' },
	{ id: 'italic', label: 'I', prefix: '_', suffix: '_', placeholder: 'italic', tooltip: 'Italic (Ctrl+I)' },
	{ id: 'h1', label: 'H1', prefix: '# ', suffix: '', placeholder: 'Heading', tooltip: 'Heading 1', linePrefix: true },
	{ id: 'h2', label: 'H2', prefix: '## ', suffix: '', placeholder: 'Heading', tooltip: 'Heading 2', linePrefix: true },
	{ id: 'link', label: '🔗', prefix: '[', suffix: '](https://)', placeholder: 'link text', tooltip: 'Link' },
	{ id: 'code', label: '`</>`', prefix: '`', suffix: '`', placeholder: 'code', tooltip: 'Inline code' },
	{ id: 'list', label: '•', prefix: '- ', suffix: '', placeholder: 'item', tooltip: 'List', linePrefix: true },
	{ id: 'quote', label: '“”', prefix: '> ', suffix: '', placeholder: 'quote', tooltip: 'Quote', linePrefix: true },
])

const MODES = ['edit', 'split', 'preview', 'wysiwyg']

/**
 * Default Toast UI WYSIWYG toolbar layout — used only in `mode: 'wysiwyg'`.
 *
 * @type {Array<Array<string>>}
 */
const DEFAULT_WYSIWYG_TOOLBAR = Object.freeze([
	['heading', 'bold', 'italic', 'strike'],
	['hr', 'quote'],
	['ul', 'ol', 'task', 'indent', 'outdent'],
	['table', 'image', 'link'],
	['code', 'codeblock'],
])

/**
 * CnMarkdownEditor — Markdown editor with a textarea + live HTML
 * preview, a formatting toolbar, and four layout modes (edit /
 * split / preview / wysiwyg).
 *
 * The default path is a `<textarea>` + `cnRenderMarkdown` preview.
 * Setting `mode: 'wysiwyg'` opts into a rich Toast UI WYSIWYG editor
 * that is **lazily loaded** only when that mode is active — the
 * textarea modes carry no editor dependency. The `v-model` contract
 * is identical across all modes (`value` in, `input` out).
 *
 * ```vue
 * <CnMarkdownEditor v-model="article" placeholder="Write your article …" />
 * <CnMarkdownEditor v-model="article" mode="wysiwyg" />
 * ```
 *
 * Toolbar buttons either wrap the current selection or insert a
 * placeholder (`bold` / `italic` / `link` / `code`) OR prefix the
 * current line (`h1` / `h2` / `list` / `quote`). The `toolbar`
 * prop lets consumers replace the default set.
 */
export default {
	name: 'CnMarkdownEditor',
	props: {
		/**
		 * Markdown source (v-model).
		 *
		 * @type {string}
		 */
		value: { type: String, default: '' },
		/**
		 * Layout mode. `edit` shows only the textarea, `preview`
		 * shows only the rendered HTML, `split` shows both
		 * side-by-side.
		 *
		 * @type {'edit'|'split'|'preview'}
		 */
		mode: {
			type: String,
			default: 'split',
			validator: (v) => MODES.includes(v),
		},
		/** Placeholder for the textarea. */
		placeholder: { type: String, default: 'Write Markdown…' },
		/** Aria-label for the textarea. */
		ariaLabel: { type: String, default: 'Markdown editor input' },
		/** Minimum textarea rows. */
		rows: { type: Number, default: 10 },
		/** Disable the textarea (still renders the preview). */
		disabled: { type: Boolean, default: false },
		/** Hide the formatting toolbar entirely. */
		hideToolbar: { type: Boolean, default: false },
		/** Hide the mode-switch button on the toolbar. */
		hideModeSwitch: { type: Boolean, default: false },
		/** Mode-switch tooltip. */
		modeSwitchTooltip: { type: String, default: 'Cycle layout (edit / split / preview)' },
		/**
		 * Custom toolbar entries. Each entry: `{id, label, prefix,
		 * suffix?, placeholder?, tooltip?, linePrefix?}`. When
		 * `linePrefix: true` the prefix is inserted at the start
		 * of the current line instead of wrapping the selection.
		 *
		 * @type {Array<object>}
		 */
		toolbar: { type: Array, default: () => DEFAULT_TOOLBAR.slice() },
		/** Optional helper text rendered under the editor. */
		hint: { type: String, default: '' },
		/**
		 * WYSIWYG mode only: Toast UI toolbar layout (array of button groups).
		 * Ignored in the textarea modes.
		 *
		 * @type {Array<Array<string>>}
		 */
		wysiwygToolbar: { type: Array, default: () => DEFAULT_WYSIWYG_TOOLBAR.map((g) => g.slice()) },
		/** WYSIWYG mode only: editor height (any CSS length). */
		wysiwygHeight: { type: String, default: '300px' },
	},
	data() {
		return {
			localValue: this.value,
			// Lazily-loaded Toast UI Editor component (WYSIWYG mode only).
			toastEditorComponent: null,
		}
	},
	computed: {
		/**
		 * BEM modifier for the current layout mode.
		 *
		 * @return {string} The class.
		 */
		modeClass() {
			return `cn-markdown-editor--${this.mode}`
		},
		/**
		 * Rendered HTML for the preview pane. Uses
		 * `cnRenderMarkdown` so the output goes through the lib's
		 * sanitised pipeline.
		 *
		 * @return {string} The rendered HTML.
		 */
		renderedHtml() {
			return cnRenderMarkdown(this.localValue || '')
		},
		/**
		 * Label for the mode-switch button (shows the NEXT mode).
		 *
		 * @return {string} The label.
		 */
		currentModeLabel() {
			return `▦ ${this.mode}`
		},
		/**
		 * Toast UI editor options (WYSIWYG mode) — the configured toolbar plus
		 * fixed WYSIWYG defaults.
		 *
		 * @return {object} The Toast UI options object.
		 */
		wysiwygOptions() {
			return {
				minHeight: '200px',
				language: 'en-US',
				hideModeSwitch: true,
				toolbarItems: this.wysiwygToolbar,
				initialEditType: 'wysiwyg',
			}
		},
	},
	watch: {
		value(next) {
			if (next !== this.localValue) {
				this.localValue = next
			}
		},
		mode(next) {
			if (next === 'wysiwyg') {
				this.loadWysiwyg()
			}
		},
	},
	mounted() {
		if (this.mode === 'wysiwyg') {
			this.loadWysiwyg()
		}
	},
	methods: {
		t,
		/**
		 * Lazily import the Toast UI editor (and its CSS) the first time WYSIWYG
		 * mode is entered. Keeps the ~200 KB editor out of the default textarea
		 * path.
		 *
		 * @return {Promise<void>}
		 */
		async loadWysiwyg() {
			if (this.toastEditorComponent) {
				return
			}
			try {
				const [{ Editor }] = await Promise.all([
					import('@toast-ui/vue-editor'),
					import('@toast-ui/editor/dist/toastui-editor.css'),
				])
				this.toastEditorComponent = Editor
			} catch (e) {
				console.error('CnMarkdownEditor: failed to load the WYSIWYG editor', e)
			}
		},
		/**
		 * Toast UI change handler — read the current markdown and emit it via
		 * v-model.
		 *
		 * @return {void}
		 */
		onWysiwygChange() {
			const editor = this.$refs.toast
			if (!editor || typeof editor.invoke !== 'function') {
				return
			}
			const markdown = editor.invoke('getMarkdown')
			this.localValue = markdown
			/**
			 * @event input v-model emit.
			 * @type {string}
			 */
			this.$emit('input', markdown)
		},
		/**
		 * Textarea input handler — pushes the new value upward via
		 * v-model.
		 *
		 * @param {InputEvent} event The input event.
		 * @return {void}
		 */
		onInput(event) {
			this.localValue = event.target.value
			/**
			 * @event input v-model emit.
			 * @type {string}
			 */
			this.$emit('input', this.localValue)
		},
		/**
		 * Keyboard handler — supports Ctrl/Cmd+B (bold) and
		 * Ctrl/Cmd+I (italic) shortcuts mapped to the matching
		 * toolbar entries.
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 * @return {void}
		 */
		onKeydown(event) {
			const meta = event.ctrlKey || event.metaKey
			if (!meta) return
			let toolId = null
			if (event.key === 'b' || event.key === 'B') toolId = 'bold'
			else if (event.key === 'i' || event.key === 'I') toolId = 'italic'
			if (!toolId) return
			const tool = this.toolbar.find((t) => t.id === toolId)
			if (!tool) return
			event.preventDefault()
			this.invokeTool(tool)
		},
		/**
		 * Cycle the layout mode `edit → split → preview → edit`.
		 *
		 * @return {void}
		 */
		cycleMode() {
			const idx = MODES.indexOf(this.mode)
			const next = MODES[(idx + 1) % MODES.length]
			/**
			 * @event update:mode v-model:mode emit so consumers can bind the layout mode.
			 * @type {'edit'|'split'|'preview'}
			 */
			this.$emit('update:mode', next)
		},
		/**
		 * Apply a toolbar action — either prefix the current line
		 * (`linePrefix: true`) or wrap the current selection.
		 *
		 * @param {object} tool The toolbar entry.
		 * @return {void}
		 */
		invokeTool(tool) {
			const ta = this.$refs.textarea
			if (!ta) return
			const before = this.localValue.slice(0, ta.selectionStart)
			const selected = this.localValue.slice(ta.selectionStart, ta.selectionEnd)
			const after = this.localValue.slice(ta.selectionEnd)

			let nextValue
			let nextSelStart
			let nextSelEnd
			if (tool.linePrefix) {
				// Line-prefix mode: insert prefix at the start of
				// the line containing the cursor (don't wrap).
				const lineStart = before.lastIndexOf('\n') + 1
				const head = before.slice(0, lineStart)
				const lineBefore = before.slice(lineStart)
				const placeholder = lineBefore + selected ? selected || lineBefore : tool.placeholder || ''
				const insertedLine = `${tool.prefix}${lineBefore}${selected}`
				nextValue = `${head}${insertedLine}${after}`
				nextSelStart = head.length + tool.prefix.length + lineBefore.length
				nextSelEnd = nextSelStart + (selected.length || (placeholder ? placeholder.length : 0))
			} else {
				// Wrap mode: prefix + selected (or placeholder) + suffix.
				const inner = selected || tool.placeholder || ''
				const insertion = `${tool.prefix}${inner}${tool.suffix || ''}`
				nextValue = `${before}${insertion}${after}`
				nextSelStart = before.length + tool.prefix.length
				nextSelEnd = nextSelStart + inner.length
			}

			this.localValue = nextValue
			this.$emit('input', nextValue)
			this.$nextTick(() => {
				ta.focus()
				ta.setSelectionRange(nextSelStart, nextSelEnd)
			})
		},
		/**
		 * Programmatic insert helper — exposed publicly so parents
		 * can drop content at the caret (e.g. from a file-picker
		 * callback inserting a `![alt](url)` reference).
		 *
		 * @param {string} text The text to insert at the caret.
		 * @return {void}
		 */
		insertAtCaret(text) {
			const ta = this.$refs.textarea
			if (!ta) {
				this.localValue += text
				this.$emit('input', this.localValue)
				return
			}
			const before = this.localValue.slice(0, ta.selectionStart)
			const after = this.localValue.slice(ta.selectionEnd)
			const next = `${before}${text}${after}`
			const caret = before.length + text.length
			this.localValue = next
			this.$emit('input', next)
			this.$nextTick(() => {
				ta.focus()
				ta.setSelectionRange(caret, caret)
			})
		},
	},
}
</script>

<style scoped>
.cn-markdown-editor {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	overflow: hidden;
}

.cn-markdown-editor__toolbar {
	display: flex;
	gap: 4px;
	padding: 6px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-background-hover);
}

.cn-markdown-editor__tool {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 4px 8px;
	cursor: pointer;
	font-family: monospace;
	min-width: 28px;
}

.cn-markdown-editor__tool:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-markdown-editor__spacer {
	flex: 1 1 auto;
}

.cn-markdown-editor__panes {
	display: grid;
	grid-template-columns: 1fr;
	min-height: 200px;
}

.cn-markdown-editor__panes[data-mode="split"] {
	grid-template-columns: 1fr 1fr;
}

.cn-markdown-editor__textarea {
	border: none;
	outline: none;
	padding: 10px 12px;
	font-family: monospace;
	font-size: 0.95em;
	resize: vertical;
	width: 100%;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-markdown-editor__preview {
	padding: 10px 14px;
	border-left: 1px solid var(--color-border);
	background: var(--color-main-background);
	overflow-y: auto;
	min-height: 200px;
}

.cn-markdown-editor__panes[data-mode="preview"] .cn-markdown-editor__preview {
	border-left: none;
}

.cn-markdown-editor__hint {
	color: var(--color-text-maxcontrast);
	padding: 0 10px 8px;
}

/* WYSIWYG (Toast UI) mode — themed with Nextcloud CSS variables. */
.cn-markdown-editor__wysiwyg {
	width: 100%;
}

.cn-markdown-editor__wysiwyg :deep(.toastui-editor-defaultUI) {
	font-family: var(--font-face) !important;
	background-color: var(--color-main-background) !important;
	border: none !important;
}

.cn-markdown-editor__wysiwyg :deep(.toastui-editor-toolbar) {
	background-color: var(--color-background-hover) !important;
	border-bottom: 1px solid var(--color-border-dark) !important;
}

.cn-markdown-editor__wysiwyg :deep(.toastui-editor-toolbar-icons button) {
	color: var(--color-main-text) !important;
	background-color: transparent !important;
	border: none !important;
}

.cn-markdown-editor__wysiwyg :deep(.toastui-editor-toolbar-icons button:hover) {
	background-color: var(--color-background-dark) !important;
}

.cn-markdown-editor__wysiwyg :deep(.toastui-editor-contents),
.cn-markdown-editor__wysiwyg :deep(.ProseMirror) {
	color: var(--color-main-text) !important;
	background-color: var(--color-main-background) !important;
	font-family: var(--font-face) !important;
}
</style>
