<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		v-if="dialog"
		:name="fileName"
		size="large"
		@closing="$emit('close')">
		<div class="cn-file-preview" data-testid="cn-file-preview">
			<NcLoadingIcon v-if="loading" :name="loadingLabel" />
			<NcNoteCard v-else-if="failed" type="error">
				{{ failedLabel }}
			</NcNoteCard>
			<template v-else>
				<NcNoteCard v-if="unreadable" type="warning" data-testid="cn-file-preview-unreadable">
					{{ unreadableLabel }}
				</NcNoteCard>
				<template v-if="mode === 'table'">
					<div class="cn-file-preview__scroll">
						<table class="cn-file-preview__table">
							<thead>
								<tr>
									<th v-for="(cell, c) in header" :key="c" scope="col">
										{{ cell }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(row, r) in body" :key="r">
									<td v-for="(cell, c) in row" :key="c">
										{{ cell }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p class="cn-file-preview__count" data-testid="cn-file-preview-count">
						{{ countLabel }}
					</p>
				</template>
				<pre v-else class="cn-file-preview__text" data-testid="cn-file-preview-text">{{ text }}</pre>
				<p v-if="truncatedText && mode !== 'table'" class="cn-file-preview__count">
					{{ truncatedLabel }}
				</p>
			</template>
		</div>
		<template #actions>
			<NcButton
				v-if="filesUrl"
				:href="filesUrl"
				target="_blank"
				rel="noopener noreferrer">
				{{ openInFilesLabel }}
			</NcButton>
			<NcButton
				v-if="contentUrl"
				variant="primary"
				:href="contentUrl"
				:download="fileName">
				{{ downloadLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { fileContentUrl, previewKindOf } from '../../composables/useFileOpener.js'
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { parseDelimited } from '../../utils/parseDelimited.js'

/**
 * CnFilePreview — an in-page preview of a data file the Nextcloud Viewer does
 * not show: the first rows of a CSV or TSV as a table, JSON and XML as
 * formatted read-only text, plain text as is. It fetches at most the first
 * megabyte, offers Download and Open in Files, and renders every cell as text,
 * never as HTML. A file that cannot be read as a table shows its raw text with
 * a sentence saying so.
 *
 * ```vue
 * <CnFilePreview :file="{ name: 'data.csv', accessUrl: '/s/abc/download', id: 12 }" @close="file = null" />
 * ```
 */
export default {
	name: 'CnFilePreview',

	components: { NcButton, NcDialog, NcLoadingIcon, NcNoteCard },

	props: {
		/**
		 * The file row: `name`, a content URL (`accessUrl`, `downloadUrl` or
		 * `url`), optionally `type` (mime), `size` and `id` (for Open in Files).
		 *
		 * @type {{name?: string, title?: string, type?: string, mimetype?: string, size?: number, id?: number|string, accessUrl?: string, downloadUrl?: string, url?: string}}
		 */
		file: {
			type: Object,
			required: true,
		},

		/** Rows shown for a CSV or TSV, the header excluded. */
		maxRows: {
			type: Number,
			default: 100,
		},

		/** Bytes fetched at most. */
		maxBytes: {
			type: Number,
			default: 1048576,
		},

		/** Wrap the preview in a dialog. Pass `false` to embed it. */
		dialog: {
			type: Boolean,
			default: true,
		},
	},

	emits: [
		/**
		 * Emitted when the dialog is closed.
		 *
		 * @event close
		 */
		'close',
	],

	data() {
		return {
			loading: true,
			failed: false,
			unreadable: false,
			text: '',
			header: [],
			body: [],
			mode: 'text',
			bytesRead: 0,
			totalBytes: 0,
			sampleTruncated: false,
		}
	},

	computed: {
		fileName() {
			return this.file?.name || this.file?.title || ''
		},

		kind() {
			return previewKindOf(this.file) || 'text'
		},

		contentUrl() {
			return fileContentUrl(this.file)
		},

		filesUrl() {
			const id = this.file?.id ?? this.file?.fileId
			return id ? generateUrl('/f/{fileid}', { fileid: id }) : ''
		},

		truncatedText() {
			return this.sampleTruncated
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		failedLabel() {
			return t('nextcloud-vue', 'The preview could not be loaded.')
		},

		unreadableLabel() {
			return t('nextcloud-vue', 'This file could not be read as a table, so the raw text is shown.')
		},

		downloadLabel() {
			return t('nextcloud-vue', 'Download')
		},

		openInFilesLabel() {
			return t('nextcloud-vue', 'Open in Files')
		},

		truncatedLabel() {
			return t('nextcloud-vue', 'Only the first part of the file is shown.')
		},

		/** "Showing the first 100 of about 40,000 rows" or "Showing all 12 rows". */
		countLabel() {
			const shown = this.body.length
			if (!this.sampleTruncated) {
				return t('nextcloud-vue', 'Showing all {count} rows', { count: shown })
			}
			const size = this.totalBytes || Number(this.file?.size) || 0
			const perRow = this.bytesRead > 0 && shown > 0 ? this.bytesRead / (shown + 1) : 0
			const estimate = perRow > 0 && size > 0 ? Math.max(shown, Math.round(size / perRow) - 1) : 0
			if (estimate > shown) {
				return t('nextcloud-vue', 'Showing the first {shown} of about {total} rows', {
					shown,
					total: estimate.toLocaleString(),
				})
			}
			return t('nextcloud-vue', 'Showing the first {shown} rows', { shown })
		},
	},

	watch: {
		file: 'load',
	},

	created() {
		this.load()
	},

	methods: {
		/** Fetch the first megabyte and shape it for display. */
		async load() {
			this.loading = true
			this.failed = false
			this.unreadable = false
			const url = this.contentUrl
			if (!url) {
				this.failed = true
				this.loading = false
				return
			}
			try {
				const response = await fetch(prefixUrl(url), {
					headers: { ...buildHeaders(null), Range: `bytes=0-${this.maxBytes - 1}` },
					credentials: 'same-origin',
				})
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`)
				}
				const full = await response.text()
				const cut = full.length > this.maxBytes
				const raw = cut ? full.slice(0, this.maxBytes) : full
				this.bytesRead = raw.length
				const range = response.headers?.get?.('Content-Range') || ''
				const total = Number(range.split('/')[1])
				this.totalBytes = Number.isFinite(total) && total > 0 ? total : 0
				const size = this.totalBytes || Number(this.file?.size) || 0
				this.sampleTruncated = cut || size > raw.length
				this.shape(raw)
			} catch {
				this.failed = true
			}
			this.loading = false
		},

		/**
		 * Turn the fetched text into a table or formatted text.
		 *
		 * @param {string} raw The fetched text.
		 */
		shape(raw) {
			if (this.kind === 'csv' || this.kind === 'tsv') {
				const parsed = parseDelimited(raw, this.kind === 'tsv' ? '\t' : ',', this.maxRows + 1)
				if (!parsed.balanced || parsed.rows.length === 0) {
					this.mode = 'text'
					this.text = raw
					this.unreadable = true
					return
				}
				this.mode = 'table'
				this.header = parsed.rows[0]
				this.body = parsed.rows.slice(1, this.maxRows + 1)
				this.sampleTruncated = this.sampleTruncated || parsed.truncated
				return
			}
			this.mode = 'text'
			this.text = this.kind === 'json' ? this.formatJson(raw) : raw
		},

		/**
		 * Pretty-print JSON; text that does not parse is returned as is.
		 *
		 * @param {string} raw The JSON text.
		 * @return {string} The formatted text.
		 */
		formatJson(raw) {
			try {
				return JSON.stringify(JSON.parse(raw), null, 2)
			} catch {
				return raw
			}
		},
	},
}
</script>

<style scoped>
.cn-file-preview {
	min-height: 120px;
}

.cn-file-preview__scroll {
	max-height: 60vh;
	overflow: auto;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
}

.cn-file-preview__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}

.cn-file-preview__table th,
.cn-file-preview__table td {
	padding: 6px 10px;
	text-align: start;
	border-bottom: 1px solid var(--color-border);
	white-space: nowrap;
}

.cn-file-preview__table th {
	position: sticky;
	top: 0;
	background: var(--color-background-dark);
	font-weight: 600;
}

.cn-file-preview__count {
	margin: 8px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-file-preview__text {
	max-height: 60vh;
	overflow: auto;
	margin: 0;
	padding: 12px;
	background: var(--color-background-dark);
	border-radius: var(--border-radius-large, 8px);
	font-size: 12px;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
