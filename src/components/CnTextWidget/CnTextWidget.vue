<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-text-widget" :style="wrapperStyle">
		<table
			v-if="tableMode"
			class="cn-text-widget__table"
			:style="tableContainerStyle">
			<tbody>
				<tr v-for="(row, rIdx) in tableRows" :key="`r-${rIdx}`">
					<template v-for="(cell, cIdx) in row">
						<th
							v-if="isHeaderCell(rIdx)"
							v-show="!isPlaceholderCellAt(rIdx, cIdx)"
							:key="`c-${rIdx}-${cIdx}`"
							:rowspan="cell.rowSpan || 1"
							:colspan="cell.colSpan || 1"
							:style="headerCellStyle(cIdx)">
							<span
								v-if="cellHasText(cell)"
								v-html="sanitizeCell(cell.text)" /><!-- eslint-disable-line vue/no-v-html -->
							<span
								v-else
								class="cn-text-widget__cell-placeholder">
								{{ emptyCellPlaceholder }}
							</span>
						</th>
						<td
							v-else
							v-show="!isPlaceholderCellAt(rIdx, cIdx)"
							:key="`c-${rIdx}-${cIdx}`"
							:rowspan="cell.rowSpan || 1"
							:colspan="cell.colSpan || 1"
							:style="dataCellStyle(cIdx)">
							<span
								v-if="cellHasText(cell)"
								v-html="sanitizeCell(cell.text)" /><!-- eslint-disable-line vue/no-v-html -->
							<span
								v-else
								class="cn-text-widget__cell-placeholder">
								{{ emptyCellPlaceholder }}
							</span>
						</td>
					</template>
				</tr>
			</tbody>
		</table>
		<div
			v-else-if="hasText"
			class="cn-text-widget__content"
			:class="contentClass"
			:style="contentStyle"
			v-html="sanitizedHtml" /><!-- eslint-disable-line vue/no-v-html -->
		<span
			v-else
			class="cn-text-widget__placeholder"
			:style="contentStyle">
			{{ placeholderText }}
		</span>
	</div>
</template>

<script>
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { translate as t } from '@nextcloud/l10n'
import { isPlaceholderCell } from '../../utils/textTable.js'

// Per-module `Marked` instance so configuration is scoped here and does NOT
// mutate the global `marked` singleton (which would affect any other code in
// the same app that imports `marked`). `gfm: true` enables tables; `breaks:
// false` keeps CommonMark-strict newline behaviour.
const markedInstance = new Marked({
	gfm: true,
	breaks: false,
})

// DOMPurify allow-list hook: author-supplied `target=_blank` links survive
// sanitisation (we add `target` to ADD_ATTR below); the hook then appends
// `rel="noopener noreferrer"` to mitigate reverse-tabnabbing. The hook is
// idempotent and registered once.
let hookRegistered = false
function ensureDomPurifyHook() {
	if (hookRegistered) {
		return
	}
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
			node.setAttribute('rel', 'noopener noreferrer')
		}
	})
	hookRegistered = true
}

/**
 * CnTextWidget — renders user-authored multi-line text (or a small table)
 * inside a dashboard cell. Text content is passed through DOMPurify before
 * injection via `v-html` so common formatting tags survive while XSS vectors
 * (`<script>`, `on*` attributes, `javascript:` URLs) are stripped.
 *
 * Persisted shape: `{text, fontSize, color, backgroundColor, textAlign,
 * contentMode, tableMode, tableData}`. Defaults: `fontSize='14px'`,
 * `color='var(--color-main-text)'`, `backgroundColor='transparent'`,
 * `textAlign='left'`. `contentMode` absent means the legacy `'html'` branch;
 * the literal `'markdown'` parses via marked (GFM tables) then sanitises
 * through the same allow-list — a single trust boundary protects both modes.
 *
 * When `tableMode === true`, the renderer draws an HTML `<table>` from
 * `tableData` instead: header rows promote row 0 to `<th>`, per-column
 * alignment is applied inline, and `colSpan` / `rowSpan` become native HTML
 * attributes. Merge-swallowed cells are hidden via `v-show` so the visual
 * grid stays rectangular.
 *
 * Registered as the `text` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnTextWidget',

	props: {
		/**
		 * Persisted widget content blob: `{text, fontSize, color,
		 * backgroundColor, textAlign, contentMode, tableMode, tableData}`.
		 * All keys are optional; missing keys collapse to documented defaults.
		 *
		 * @type {{text: string, fontSize: string, color: string, backgroundColor: string, textAlign: string, contentMode: string, tableMode: boolean, tableData: object}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/** The author text, or '' when absent / non-string. */
		text() {
			return typeof this.content?.text === 'string' ? this.content.text : ''
		},

		/** Whether the text has any non-whitespace content. */
		hasText() {
			return this.text.trim() !== ''
		},

		/** Resolved content mode — only `'markdown'` switches the branch. */
		contentMode() {
			return this.content?.contentMode === 'markdown' ? 'markdown' : 'html'
		},

		/** CSS class selecting the markdown vs html content-spacing rules. */
		contentClass() {
			return this.contentMode === 'markdown'
				? 'cn-text-widget__content--markdown'
				: 'cn-text-widget__content--html'
		},

		/**
		 * The HTML to render: either the raw author HTML (sanitised) or the
		 * markdown rendering of the author text (sanitised). Both branches go
		 * through DOMPurify, which strips `<script>`, `<style>`, `<link>`,
		 * `on*` attributes, and `javascript:` URLs.
		 *
		 * @return {string} sanitised HTML safe for `v-html` injection.
		 */
		sanitizedHtml() {
			let html
			if (this.contentMode === 'markdown') {
				try {
					html = markedInstance.parse(this.text)
					if (typeof html !== 'string') {
						html = String(html)
					}
				} catch (err) {
					// Defensive: fall back to the raw text rather than crash
					// the dashboard if the parser throws.
					html = this.text
				}
			} else {
				html = this.text
			}
			return DOMPurify.sanitize(html, {
				ADD_ATTR: ['target'],
			})
		},

		/** Localised placeholder shown when there is no text content. */
		placeholderText() {
			return t('nextcloud-vue', 'No text content')
		},

		/** Localised placeholder shown inside an empty table cell. */
		emptyCellPlaceholder() {
			return t('nextcloud-vue', 'Empty cell')
		},

		/** Resolved font size (default `14px`). */
		fontSize() {
			return this.content?.fontSize || '14px'
		},

		/** Resolved text colour (default theme main text). */
		color() {
			return this.content?.color || 'var(--color-main-text)'
		},

		/** Resolved background colour (default transparent). */
		backgroundColor() {
			return this.content?.backgroundColor || 'transparent'
		},

		/** Resolved text alignment (default `left`). */
		textAlign() {
			return this.content?.textAlign || 'left'
		},

		/** Whether the renderer is in table mode. */
		tableMode() {
			return this.content?.tableMode === true
		},

		/** The persisted tableData object, or null. */
		tableData() {
			return this.content?.tableData || null
		},

		/** The table rows array (empty when no table data). */
		tableRows() {
			return Array.isArray(this.tableData?.rows) ? this.tableData.rows : []
		},

		/** Whether row 0 should render as a header row. */
		headerRow() {
			return this.tableData?.headerRow === true
		},

		/** Per-column text-alignment array. */
		columnAlignments() {
			const aligns = this.tableData?.columnAlignments
			return Array.isArray(aligns) ? aligns : []
		},

		/** Inline style for the flex wrapper. */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				padding: '16px',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				overflow: 'auto',
				'background-color': this.backgroundColor,
			}
		},

		/** Inline style for the text / placeholder content. */
		contentStyle() {
			const base = {
				'font-size': this.fontSize,
				'text-align': this.textAlign,
				color: this.color,
				width: '100%',
				'overflow-wrap': 'break-word',
			}
			if (!this.hasText) {
				base['font-style'] = 'italic'
				base.color = 'var(--color-text-maxcontrast)'
			}
			return base
		},

		/** Inline style for the table container. */
		tableContainerStyle() {
			return {
				'font-size': this.fontSize,
				color: this.color,
				width: '100%',
			}
		},
	},

	created() {
		ensureDomPurifyHook()
	},

	methods: {
		/**
		 * Run cell text through DOMPurify so the table-mode render path has
		 * the same XSS-stripping guarantees as the text-mode path.
		 *
		 * @param {string} text raw cell text (may contain HTML).
		 * @return {string} sanitised HTML safe to render via `v-html`.
		 */
		sanitizeCell(text) {
			return DOMPurify.sanitize(typeof text === 'string' ? text : '')
		},

		/**
		 * Whether the given row index renders as `<th>` (header row).
		 *
		 * @param {number} rIdx the 0-based row index.
		 * @return {boolean} true when row 0 and the header flag is set.
		 */
		isHeaderCell(rIdx) {
			return this.headerRow && rIdx === 0
		},

		/**
		 * Whether a cell is covered by another cell's `rowSpan` / `colSpan`
		 * and so must be hidden to keep the grid rectangular.
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @return {boolean} true when the cell is a covered placeholder.
		 */
		isPlaceholderCellAt(rIdx, cIdx) {
			return isPlaceholderCell(this.tableRows, rIdx, cIdx)
		},

		/**
		 * Whether a cell has any non-whitespace text.
		 *
		 * @param {object} cell the cell object.
		 * @return {boolean} true when the cell has text.
		 */
		cellHasText(cell) {
			return typeof cell?.text === 'string' && cell.text.trim() !== ''
		},

		/**
		 * Inline style for a data cell at a given column.
		 *
		 * @param {number} cIdx the column index.
		 * @return {object} the cell style object.
		 */
		dataCellStyle(cIdx) {
			return {
				'text-align': this.columnAlignments[cIdx] || 'left',
				border: '1px solid var(--color-border)',
				padding: '8px',
			}
		},

		/**
		 * Inline style for a header cell at a given column.
		 *
		 * @param {number} cIdx the column index.
		 * @return {object} the header cell style object.
		 */
		headerCellStyle(cIdx) {
			return {
				...this.dataCellStyle(cIdx),
				'background-color': 'var(--color-background-hover)',
				'font-weight': 'bold',
			}
		},
	},
}
</script>

<style scoped>
.cn-text-widget {
	width: 100%;
	height: 100%;
}

.cn-text-widget__content,
.cn-text-widget__placeholder {
	/* Safety net — ensures long URLs / words inside the sanitised HTML wrap
	   rather than overflowing horizontally. */
	overflow-wrap: break-word;
	word-wrap: break-word;
	max-width: 100%;
}

/* Restore inline-emphasis semantics inside rendered content. Nextcloud's
   server CSS styles bare <em> as muted (var(--color-text-maxcontrast)) and can
   drop the italic, so `_x_` / `**_x_**` looked greyed-out and non-italic. Force
   italic <em> / bold <strong> that inherit the widget's own text colour. */
.cn-text-widget :deep(em),
.cn-text-widget :deep(i) {
	font-style: italic;
	color: inherit;
}

.cn-text-widget :deep(strong),
.cn-text-widget :deep(b) {
	font-weight: bold;
	color: inherit;
}

/* Nextcloud's server CSS strips list markers/indent (`list-style: none`,
   no padding), so rendered `<ul>`/`<ol>` looked like plain text. Restore
   bullets/numbers and indentation, including nested levels. */
.cn-text-widget :deep(ul),
.cn-text-widget :deep(ol) {
	margin: 4px 0;
	padding-left: 1.5em;
}

.cn-text-widget :deep(ul) {
	list-style: disc outside;
}

.cn-text-widget :deep(ol) {
	list-style: decimal outside;
}

.cn-text-widget :deep(ul ul) {
	list-style-type: circle;
}

.cn-text-widget :deep(ul ul ul) {
	list-style-type: square;
}

.cn-text-widget :deep(li) {
	display: list-item;
}

/* Nextcloud's server CSS flattens heading sizes (e.g. h1 → 100%, so it fell
   back to the ~14px body size while h2 stayed 1.8em), leaving them oddly
   scaled. Apply a consistent em-based scale that grows with the widget's own
   font size. */
.cn-text-widget :deep(h1) {
	font-size: 2em;
}

.cn-text-widget :deep(h2) {
	font-size: 1.5em;
}

.cn-text-widget :deep(h3) {
	font-size: 1.25em;
}

.cn-text-widget :deep(h4) {
	font-size: 1.1em;
}

.cn-text-widget :deep(h5) {
	font-size: 1em;
}

.cn-text-widget :deep(h6) {
	font-size: 0.85em;
}

.cn-text-widget__content--markdown :deep(h1),
.cn-text-widget__content--markdown :deep(h2),
.cn-text-widget__content--markdown :deep(h3),
.cn-text-widget__content--markdown :deep(h4),
.cn-text-widget__content--markdown :deep(h5),
.cn-text-widget__content--markdown :deep(h6) {
	margin: 8px 0 4px;
	font-weight: 600;
	line-height: 1.3;
}

.cn-text-widget__content--markdown :deep(p),
.cn-text-widget__content--markdown :deep(ul),
.cn-text-widget__content--markdown :deep(ol),
.cn-text-widget__content--markdown :deep(blockquote) {
	margin: 4px 0;
}

.cn-text-widget__content--markdown :deep(code) {
	padding: 1px 4px;
	border-radius: 3px;
	background: var(--color-background-hover);
	font-family: var(--font-monospace, monospace);
	font-size: 0.95em;
}

.cn-text-widget__content--markdown :deep(pre) {
	padding: 8px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	overflow: auto;
}

.cn-text-widget__content--markdown :deep(pre) :deep(code) {
	padding: 0;
	background: transparent;
}

.cn-text-widget__content--markdown :deep(blockquote) {
	padding-left: 8px;
	border-left: 3px solid var(--color-border);
	color: var(--color-text-maxcontrast);
}

.cn-text-widget__content--markdown :deep(table) {
	border-collapse: collapse;
	margin: 4px 0;
}

.cn-text-widget__content--markdown :deep(th),
.cn-text-widget__content--markdown :deep(td) {
	padding: 4px 8px;
	border: 1px solid var(--color-border);
}

.cn-text-widget__table {
	border-collapse: collapse;
	width: 100%;
}

.cn-text-widget__table th,
.cn-text-widget__table td {
	overflow-wrap: break-word;
	word-wrap: break-word;
	vertical-align: top;
}

.cn-text-widget__cell-placeholder {
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>
