<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-note-composer"
		:class="{ 'cn-note-composer--dragging': dragging }"
		data-testid="cn-note-composer"
		@dragover.prevent="dragging = canUpload"
		@dragleave="dragging = false"
		@drop.prevent="onDrop">
		<NcRichContenteditable
			class="cn-note-composer__input"
			:modelValue="modelValue"
			:autoComplete="fetchMentionSuggestions"
			:placeholder="placeholder"
			multiline
			@update:modelValue="$emit('update:modelValue', $event)"
			@paste="onPaste"
			@keydown.enter.ctrl.prevent="$emit('submit')"
			@keydown.enter.meta.prevent="$emit('submit')" />
		<p v-if="uploading"
			class="cn-note-composer__status"
			role="status"
			data-testid="cn-note-composer-uploading">
			{{ t('nextcloud-vue', 'Uploading image…') }}
		</p>
		<p v-if="error"
			class="cn-note-composer__error"
			role="alert"
			data-testid="cn-note-composer-error">
			{{ error }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcRichContenteditable } from '@nextcloud/vue'
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { imageMarkdown, isRecordFileUrl } from '../../utils/noteBody.js'
import { searchNextcloudGroups, searchNextcloudUsers } from '../../utils/userAutocomplete.js'

/**
 * CnNoteComposer — the shared input for writing a note: `@` suggestions for
 * users AND groups, and pasted or dropped images.
 *
 * A group is offered beside users and stored as `@"group/<gid>"`. An image
 * (`image/*` only) pasted or dropped into the box is uploaded to the record's
 * files (`POST .../{id}/filesMultipart`) and its markdown, `![name](url)`, is
 * added to the note. Without a record (no `register`, `schema` and `objectId`)
 * images are not taken and paste does nothing new. Used by `CnNotesTab` and
 * `CnNotesCard`.
 *
 * Example:
 * ```vue
 * <CnNoteComposer v-model="text" register="crm" schema="lead" objectId="L1" @submit="save" />
 * ```
 */
export default {
	name: 'CnNoteComposer',

	components: { NcRichContenteditable },

	props: {
		/** The note text (v-model). */
		modelValue: {
			type: String,
			default: '',
		},

		/** Placeholder shown while the box is empty. */
		placeholder: {
			type: String,
			default: () => t('nextcloud-vue', 'Write a note…'),
		},

		/** Register slug of the record the note belongs to, for image upload. */
		register: {
			type: String,
			default: '',
		},

		/** Schema slug of the record. */
		schema: {
			type: String,
			default: '',
		},

		/** Id of the record. */
		objectId: {
			type: String,
			default: '',
		},

		/** Base URL of the OpenRegister API. */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},
	},

	emits: ['update:modelValue', 'submit', 'uploaded'],

	data() {
		return { uploading: false, error: '', dragging: false }
	},

	computed: {
		/** @return {boolean} Whether an image can be taken: the record is known. */
		canUpload() {
			return !!(this.register && this.schema && this.objectId)
		},

		record() {
			return { apiBase: this.apiBase, register: this.register, schema: this.schema, objectId: this.objectId }
		},
	},

	methods: {
		t,

		/**
		 * `@` suggestions for NcRichContenteditable: users, then groups. A group's
		 * id carries the `group/` prefix so it is stored as `@"group/<gid>"`.
		 *
		 * @param {string} search The partial name typed after `@`.
		 * @param {(suggestions: Array<object>) => void} callback Receives the suggestions.
		 */
		async fetchMentionSuggestions(search, callback) {
			const [users, groups] = await Promise.all([
				searchNextcloudUsers(search, { includeCurrentUser: false }),
				searchNextcloudGroups(search),
			])
			callback([
				...users.map((user) => ({ id: user.id, label: user.label, subline: user.subline, icon: 'icon-user', source: 'users' })),
				...groups.map((group) => ({ id: `group/${group.id}`, label: group.label, subline: t('nextcloud-vue', 'Group'), icon: 'icon-group', source: 'groups' })),
			])
		},

		/**
		 * The image files in a clipboard or drop transfer.
		 *
		 * @param {DataTransfer|null} transfer The transfer.
		 * @return {File[]} Files whose type is `image/*`.
		 */
		imagesIn(transfer) {
			return [...((transfer && transfer.files) || [])].filter((file) => /^image\//.test(file.type || ''))
		},

		onPaste(event) {
			const images = this.canUpload ? this.imagesIn(event && event.clipboardData) : []
			if (images.length === 0) {
				return
			}
			if (event.preventDefault) {
				event.preventDefault()
			}
			this.uploadImages(images)
		},

		onDrop(event) {
			this.dragging = false
			const images = this.canUpload ? this.imagesIn(event.dataTransfer) : []
			if (images.length > 0) {
				this.uploadImages(images)
			}
		},

		/**
		 * Upload images to the record's files and add their markdown to the note.
		 *
		 * @param {File[]} files The images.
		 * @return {Promise<void>}
		 */
		async uploadImages(files) {
			this.uploading = true
			this.error = ''
			let text = this.modelValue
			try {
				for (const file of files) {
					const url = await this.uploadOne(file)
					text = `${text}${text === '' || text.endsWith('\n') ? '' : '\n'}${imageMarkdown(file.name || 'image', url)}`
					this.$emit('update:modelValue', text)
					/**
					 * @event uploaded Emitted after an image was uploaded to the record's files. Payload: the file name and the URL inserted.
					 * @type {{name: string, url: string}}
					 */
					this.$emit('uploaded', { name: file.name, url })
				}
			} catch {
				this.error = t('nextcloud-vue', 'The image could not be added.')
			} finally {
				this.uploading = false
			}
		},

		/**
		 * @param {File} file The image.
		 * @return {Promise<string>} The URL of the stored file, a file of this record.
		 */
		async uploadOne(file) {
			const base = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files`
			const body = new FormData()
			body.append('files[]', file)
			const headers = buildHeaders()
			delete headers['Content-Type']
			const response = await fetch(prefixUrl(`${base}Multipart`), { method: 'POST', headers, body })
			if (!response.ok) {
				throw new Error(`upload failed (${response.status})`)
			}
			const data = await response.json()
			const stored = (data && ((Array.isArray(data.results) && data.results[0]) || (Array.isArray(data.files) && data.files[0]))) || data || {}
			const offered = stored.downloadUrl || stored.accessUrl || stored.url
			const url = typeof offered === 'string' && isRecordFileUrl(offered, this.record)
				? offered
				: prefixUrl(`${base}/${encodeURIComponent(stored.id)}/download`)
			if (stored.id === undefined && typeof offered !== 'string') {
				throw new Error('upload answered no file')
			}
			return url
		},
	},
}
</script>

<style scoped>
.cn-note-composer--dragging {
	outline: 2px dashed var(--color-primary-element);
	outline-offset: 2px;
}

.cn-note-composer__status {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-note-composer__error {
	margin: 4px 0 0;
	color: var(--color-error-text);
}
</style>
