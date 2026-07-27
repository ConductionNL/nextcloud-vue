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

		<!-- WYSIWYG mode: lazily-instantiated Toast UI editor. The editor is
		     driven imperatively against `toastHost` rather than through a Vue
		     wrapper component — `@toast-ui/vue-editor` is Vue-2 only, so the
		     Vue-3 line uses the framework-agnostic `@toast-ui/editor` API. -->
		<div v-else class="cn-markdown-editor__wysiwyg" data-testid="cn-markdown-wysiwyg">
			<div v-show="toastEditorReady" ref="toastHost" />
			<p v-if="!toastEditorReady" class="cn-markdown-editor__hint">{{ t('nextcloud-vue', 'Loading editor…') }}</p>
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
 * Matches a list item at the start of a line: leading indentation, a bullet
 * (`-`/`*`/`+`) or ordered marker (`1.`/`1)`), the whitespace after it, then the
 * item body. Drives the smart Enter / Tab list handling. Only the markers
 * CommonMark actually renders as lists are recognised (no `a.`/`A)` alpha
 * markers — Markdown renders those as plain text).
 *
 * @type {RegExp}
 */
const LIST_ITEM_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(.*)$/

/** One indent step for nesting list items (a tab; textarea uses `tab-size: 2`). */
const LIST_INDENT = '\t'

/**
 * The marker that continues a list after `marker`: unordered bullets repeat;
 * numeric markers increment (`1.`→`2.`, `1)`→`2)`) keeping the `.`/`)` delimiter.
 *
 * @param {string} marker The current line's list marker (e.g. `-`, `1.`).
 * @return {string} The next item's marker.
 */
function nextListMarker(marker) {
	const ordered = marker.match(/^(\d+)([.)])$/)
	if (!ordered) {
		return marker
	}
	return `${parseInt(ordered[1], 10) + 1}${ordered[2]}`
}

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
			// Whether the lazily-created Toast UI editor instance is live
			// (WYSIWYG mode only). Drives the loading hint.
			toastEditorReady: false,
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
				// The imperative editor holds its own copy of the document, so
				// an external v-model change has to be pushed into it. Guarded
				// on the current markdown so we don't clobber the caret while
				// the user is typing (our own change handler round-trips here).
				if (this.toastEditor && this.toastEditor.getMarkdown() !== next) {
					this.toastEditor.setMarkdown(next || '')
				}
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
	beforeUnmount() {
		// The editor is created imperatively, so Vue will not tear it down.
		if (this.toastEditor && typeof this.toastEditor.destroy === 'function') {
			this.toastEditor.destroy()
		}
		this.toastEditor = null
	},
	methods: {
		t,
		/**
		 * Lazily import and instantiate the Toast UI editor (and its CSS) the
		 * first time WYSIWYG mode is entered. Keeps the ~200 KB editor out of
		 * the default textarea path.
		 *
		 * Uses the framework-agnostic `@toast-ui/editor` constructor rather
		 * than a Vue wrapper: `@toast-ui/vue-editor` is published for Vue 2
		 * only and has no Vue-3 build. The instance is held as a plain (NON
		 * reactive) instance property — putting a third-party class instance
		 * in `data()` would wrap it in Vue 3's reactive proxy and break its
		 * internal identity checks.
		 *
		 * @return {Promise<void>}
		 */
		async loadWysiwyg() {
			if (this.toastEditor) {
				return
			}
			try {
				const [{ default: Editor }] = await Promise.all([
					import('@toast-ui/editor'),
					import('@toast-ui/editor/dist/toastui-editor.css'),
				])
				await this.$nextTick()
				const el = this.$refs.toastHost
				if (!el) {
					return
				}
				this.toastEditor = new Editor({
					el,
					...this.wysiwygOptions,
					initialValue: this.localValue,
					previewStyle: 'tab',
					height: this.wysiwygHeight,
					events: { change: this.onWysiwygChange },
				})
				this.toastEditorReady = true
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
			if (!this.toastEditor || typeof this.toastEditor.getMarkdown !== 'function') {
				return
			}
			const markdown = this.toastEditor.getMarkdown()
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
		 * Keyboard handler. Ctrl/Cmd+B / Ctrl/Cmd+I trigger bold / italic;
		 * Enter continues (or exits) a list; Tab / Shift+Tab indent / dedent a
		 * list item. Anything else falls through to the textarea default.
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 * @return {void}
		 */
		onKeydown(event) {
			const ta = this.$refs.textarea
			if (!ta) return
			if (event.ctrlKey || event.metaKey) {
				let toolId = null
				if (event.key === 'b' || event.key === 'B') toolId = 'bold'
				else if (event.key === 'i' || event.key === 'I') toolId = 'italic'
				if (!toolId) return
				const tool = this.toolbar.find((t) => t.id === toolId)
				if (!tool) return
				event.preventDefault()
				this.invokeTool(tool)
				return
			}
			if (event.altKey) return
			if (event.key === 'Enter' && !event.shiftKey) {
				this.handleListEnter(event, ta)
			} else if (event.key === 'Tab') {
				this.handleListTab(event, ta)
			}
		},
		/**
		 * Smart Enter inside a list: continue with the next marker (incrementing
		 * ordered / alpha markers), or — when the current item is empty — break
		 * out of the list, leaving a blank line so the user types normally. No-op
		 * (default newline) unless the caret is in a list item's body.
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 * @param {HTMLTextAreaElement} ta The textarea element.
		 * @return {void}
		 */
		handleListEnter(event, ta) {
			const value = this.localValue
			const selStart = ta.selectionStart
			if (selStart !== ta.selectionEnd) return
			const lineStart = value.slice(0, selStart).lastIndexOf('\n') + 1
			const nl = value.indexOf('\n', selStart)
			const lineEnd = nl === -1 ? value.length : nl
			const m = value.slice(lineStart, lineEnd).match(LIST_ITEM_RE)
			if (!m) return
			const [, indent, marker, gap, content] = m
			// Only act once the caret is past the marker (in the item body).
			if (selStart < lineStart + indent.length + marker.length + gap.length) return
			event.preventDefault()
			if (content.trim() === '') {
				// Empty item → exit the list: drop the marker, leave a blank line.
				const next = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`
				this.applyTextChange(next, lineStart, lineStart)
				return
			}
			const insertion = `\n${indent}${nextListMarker(marker)}${gap}`
			const next = `${value.slice(0, selStart)}${insertion}${value.slice(selStart)}`
			const caret = selStart + insertion.length
			this.applyTextChange(next, caret, caret)
		},
		/**
		 * Smart Tab inside a list: Tab indents the current line (or every line
		 * spanned by the selection) by one level; Shift+Tab dedents it. Only
		 * hijacks Tab when the caret's line is a list item, so Tab still moves
		 * focus in plain text.
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 * @param {HTMLTextAreaElement} ta The textarea element.
		 * @return {void}
		 */
		handleListTab(event, ta) {
			const value = this.localValue
			const selStart = ta.selectionStart
			const selEnd = ta.selectionEnd
			const firstLineStart = value.slice(0, selStart).lastIndexOf('\n') + 1
			const firstNl = value.indexOf('\n', firstLineStart)
			const firstLineEnd = firstNl === -1 ? value.length : firstNl
			if (!LIST_ITEM_RE.test(value.slice(firstLineStart, firstLineEnd))) return
			event.preventDefault()
			const endRef = selEnd > selStart ? selEnd - 1 : selEnd
			const lastNl = value.indexOf('\n', endRef)
			const blockEnd = lastNl === -1 ? value.length : lastNl
			const lines = value.slice(firstLineStart, blockEnd).split('\n')
			let firstDelta = 0
			let newLines
			if (event.shiftKey) {
				newLines = lines.map((ln, i) => {
					let strip = 0
					if (ln.startsWith('\t')) {
						strip = 1
					} else {
						while (strip < 2 && ln[strip] === ' ') strip++
					}
					if (i === 0) firstDelta = -strip
					return ln.slice(strip)
				})
			} else {
				newLines = lines.map((ln) => `${LIST_INDENT}${ln}`)
				firstDelta = LIST_INDENT.length
			}
			const newBlock = newLines.join('\n')
			const next = `${value.slice(0, firstLineStart)}${newBlock}${value.slice(blockEnd)}`
			if (selStart === selEnd) {
				const caret = Math.max(firstLineStart, selStart + firstDelta)
				this.applyTextChange(next, caret, caret)
			} else {
				this.applyTextChange(next, firstLineStart, firstLineStart + newBlock.length)
			}
		},
		/**
		 * Commit a programmatic edit: update the model, emit `input`, then
		 * restore focus + selection on the next tick.
		 *
		 * @param {string} next The new textarea value.
		 * @param {number} selStart The caret/selection start to restore.
		 * @param {number} selEnd The selection end to restore.
		 * @return {void}
		 */
		applyTextChange(next, selStart, selEnd) {
			this.localValue = next
			this.$emit('input', next)
			this.$nextTick(() => {
				const ta = this.$refs.textarea
				if (!ta) return
				ta.focus()
				ta.setSelectionRange(selStart, selEnd)
			})
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
				// Line-prefix mode (headings, list, quote): toggle/replace the
				// marker on the current line rather than stacking it. Operates on
				// the whole line under the caret, ignoring any selection.
				const lineStart = before.lastIndexOf('\n') + 1
				const afterNl = after.indexOf('\n')
				const lineEnd = afterNl === -1 ? this.localValue.length : ta.selectionEnd + afterNl
				const head = this.localValue.slice(0, lineStart)
				const line = this.localValue.slice(lineStart, lineEnd)
				const tail = this.localValue.slice(lineEnd)

				// Strip an existing recognised marker (heading #…, list -/*, quote >)
				// so switching one for another REPLACES it (e.g. `# ` → `## `, never
				// `## #`); re-applying the same marker toggles it off.
				const existing = (line.match(/^(#{1,6} |[-*] |> )/) || [''])[0]
				const body = line.slice(existing.length)
				const newLine = existing === tool.prefix ? body : `${tool.prefix}${body}`

				nextValue = `${head}${newLine}${tail}`
				// Keep the caret/selection in the body, shifted by the marker delta.
				const delta = newLine.length - line.length
				const min = lineStart
				const max = lineStart + newLine.length
				nextSelStart = Math.min(Math.max(ta.selectionStart + delta, min), max)
				nextSelEnd = Math.min(Math.max(ta.selectionEnd + delta, min), max)
			} else {
				// Wrap mode (bold/italic/link/code): toggle. If the selection is
				// already wrapped in this tool's delimiters — either they're part
				// of the selection, or they sit immediately around it — strip them;
				// otherwise add them. Stops `**`/`_` from stacking on repeat presses.
				const p = tool.prefix
				const s = tool.suffix || ''
				const wrappedInside = selected.length >= p.length + s.length
					&& selected.startsWith(p)
					&& selected.endsWith(s)
				const wrappedOutside = s !== '' && before.endsWith(p) && after.startsWith(s)

				if (wrappedInside) {
					const inner = selected.slice(p.length, selected.length - s.length)
					nextValue = `${before}${inner}${after}`
					nextSelStart = before.length
					nextSelEnd = nextSelStart + inner.length
				} else if (wrappedOutside) {
					// Selection is the inner text; the delimiters are just outside it.
					nextValue = `${before.slice(0, before.length - p.length)}${selected}${after.slice(s.length)}`
					nextSelStart = before.length - p.length
					nextSelEnd = nextSelStart + selected.length
				} else {
					const inner = selected || tool.placeholder || ''
					const insertion = `${p}${inner}${s}`
					nextValue = `${before}${insertion}${after}`
					nextSelStart = before.length + p.length
					nextSelEnd = nextSelStart + inner.length
				}
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
	/* Nested list indents are single tabs (see LIST_INDENT); render them
	   compactly rather than the 8-char browser default. */
	tab-size: 2;
	-moz-tab-size: 2;
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
