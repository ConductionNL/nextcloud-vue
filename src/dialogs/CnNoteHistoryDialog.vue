<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnNoteHistoryDialog — what a note said before it was edited.

  Lives in src/dialogs/ per the ADR-004 modal/dialog file-isolation rule:
  NcDialog markup never sits inline in the component that opens it.

  A note is a Nextcloud comment and an edit overwrites its message, so
  OpenRegister keeps every prior text beside the comment. On open this fetches
    GET /apps/openregister/api/objects/{register}/{schema}/{objectId}/notes/{noteId}/versions
  which answers `{ results, total }` with the versions newest first. Each row
  carries the text that was replaced, the author it was attributed to, who
  replaced it and when.

  The list is read-only. Restoring an old text is a new note that references
  the old one, not a rewrite of the record.

  Emits:
  - update:open (false) — when the dialog is closed
-->
<template>
	<NcDialog
		:open="open"
		:name="dialogName"
		:closeOnClickOutside="true"
		size="normal"
		@update:open="$emit('update:open', $event)">
		<div
			class="cn-note-history"
			data-testid="cn-modal"
			data-testid-modal="cn-note-history-dialog">
			<NcLoadingIcon v-if="loading" :name="loadingLabel" />

			<NcEmptyContent v-else-if="failed" :name="errorLabel">
				<template #icon>
					<AlertCircleOutline :size="48" />
				</template>
			</NcEmptyContent>

			<NcEmptyContent v-else-if="versions.length === 0" :name="emptyLabel">
				<template #icon>
					<HistoryIcon :size="48" />
				</template>
			</NcEmptyContent>

			<ol v-else class="cn-note-history__list">
				<li
					v-for="version in versions"
					:key="version.id || version.uuid"
					class="cn-note-history__item"
					data-testid="cn-note-history-version">
					<p class="cn-note-history__meta">
						{{ metaLine(version) }}
					</p>
					<p class="cn-note-history__message">
						{{ version.message }}
					</p>
				</li>
			</ol>
		</div>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import HistoryIcon from 'vue-material-design-icons/History.vue'
import { buildHeaders, prefixUrl } from '../utils/index.js'

export default {
	name: 'CnNoteHistoryDialog',

	components: { NcDialog, NcEmptyContent, NcLoadingIcon, AlertCircleOutline, HistoryIcon },

	props: {
		/** Whether the dialog is open */
		open: { type: Boolean, default: false },
		/** The note whose earlier versions are listed */
		noteId: { type: [String, Number], default: '' },
		/** ID of the object the note hangs on */
		objectId: { type: String, required: true },
		/** OpenRegister register slug */
		register: { type: String, default: '' },
		/** OpenRegister schema slug */
		schema: { type: String, default: '' },
		/** Base URL for the OpenRegister API */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Title of the dialog */
		dialogName: { type: String, default: () => t('nextcloud-vue', 'Earlier versions') },
		/** Text shown while the versions are being fetched */
		loadingLabel: { type: String, default: () => t('nextcloud-vue', 'Loading earlier versions…') },
		/** Text shown when this note was never edited */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'Nobody has changed this note') },
		/** Text shown when the versions could not be read */
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'The earlier versions could not be loaded') },
	},

	emits: ['update:open'],

	data() {
		return {
			versions: [],
			loading: false,
			failed: false,
		}
	},

	watch: {
		open: {
			immediate: true,
			handler(isOpen) {
				if (isOpen) {
					this.fetchVersions()
				}
			},
		},
	},

	methods: {
		/**
		 * Read the note's earlier versions, newest first.
		 *
		 * @return {Promise<void>}
		 */
		async fetchVersions() {
			if (!this.register || !this.schema || !this.noteId) {
				return
			}
			this.loading = true
			this.failed = false
			this.versions = []
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${this.noteId}/versions`),
					{ headers: buildHeaders() },
				)
				if (!response.ok) {
					// A failed read says so. Rendering an empty list here would
					// claim the note was never edited, which is a different
					// statement and the one the reader would believe.
					this.failed = true
					return
				}
				const data = await response.json()
				this.versions = data.results || []
			} catch (err) {
				this.failed = true
				// eslint-disable-next-line no-console
				console.error('CnNoteHistoryDialog: Failed to fetch note versions', err)
			} finally {
				this.loading = false
			}
		},

		/**
		 * The line above a prior text: who wrote it, who replaced it, when.
		 *
		 * @param {object} version One row from the versions endpoint.
		 * @return {string} The rendered line.
		 */
		metaLine(version) {
			const author = version.authorDisplayName || version.author || t('nextcloud-vue', 'Unknown')
			const editor = version.editedByDisplayName || version.editedBy || t('nextcloud-vue', 'Unknown')
			return t('nextcloud-vue', 'Written by {author}, replaced by {editor} on {date}', {
				author,
				editor,
				date: this.formatDate(version.editedAt),
			})
		},

		/**
		 * Render a moment in the reader's own locale.
		 *
		 * @param {string} dateStr An ISO-8601 moment.
		 * @return {string} The formatted moment, or the raw string.
		 */
		formatDate(dateStr) {
			if (!dateStr) {
				return ''
			}
			try {
				return new Date(dateStr).toLocaleString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				})
			} catch {
				return dateStr
			}
		},
	},
}
</script>

<style scoped>
.cn-note-history { padding: 4px 0; }

.cn-note-history__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-note-history__item {
	border-inline-start: 2px solid var(--color-border);
	padding-inline-start: 12px;
}

.cn-note-history__meta {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	margin: 0 0 2px;
}

.cn-note-history__message {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
