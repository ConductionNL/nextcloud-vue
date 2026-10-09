<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-object-files"
		:class="{ 'cn-object-files--dragging': dragging }"
		data-testid="cn-object-files"
		@dragover.prevent="onDragOver"
		@dragleave="dragging = false"
		@drop.prevent="onDrop">
		<div class="cn-object-files__toolbar">
			<NcButton
				type="button"
				:disabled="!canUpload || busy"
				data-testid="cn-object-files-upload"
				@click="$refs.picker.click()">
				{{ uploadLabel }}
			</NcButton>
			<input
				ref="picker"
				type="file"
				multiple
				class="cn-object-files__picker"
				tabindex="-1"
				:aria-label="uploadLabel"
				data-testid="cn-object-files-input"
				@change="onPick">
			<NcLoadingIcon v-if="busy" :size="20" />
		</div>

		<p v-if="ctx.id === ''" class="cn-object-files__hint" data-testid="cn-object-files-unsaved">
			{{ t('nextcloud-vue', 'Save this record to add files.') }}
		</p>
		<p v-else-if="error"
			class="cn-object-files__error"
			role="alert"
			data-testid="cn-object-files-error">
			{{ error }}
		</p>
		<p v-else-if="loaded && files.length === 0" class="cn-object-files__empty" data-testid="cn-object-files-empty">
			{{ t('nextcloud-vue', 'No files yet. Drop a file here to add it.') }}
		</p>

		<ul v-if="files.length > 0" class="cn-object-files__list">
			<li v-for="file in files"
				:key="file.id"
				class="cn-object-files__row"
				data-testid="cn-object-files-row">
				<a
					v-if="fileUrl(file)"
					class="cn-object-files__name"
					:href="fileUrl(file)"
					target="_blank"
					rel="noopener">{{ fileName(file) }}</a>
				<span v-else class="cn-object-files__name">{{ fileName(file) }}</span>
				<NcButton
					v-if="!readOnly"
					type="button"
					variant="tertiary"
					:aria-label="t('nextcloud-vue', 'Delete {name}', { name: fileName(file) })"
					data-testid="cn-object-files-delete"
					@click="remove(file)">
					{{ t('nextcloud-vue', 'Delete') }}
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { cnFetchJson } from '../../utils/cnFetch.js'

/**
 * CnObjectFilesWidget — the files of ONE OpenRegister object: list, upload
 * (button or drag-drop) and delete, through
 * `/apps/openregister/api/objects/{register}/{schema}/{id}/files`.
 *
 * On a manifest `detail` page a `files` widget mounts this instead of the
 * placement-folder `CnFilesWidget`, which stays the dashboard widget. The
 * context comes from the loaded object (`objectData['@self']`) when the props
 * are not given. Without an object id (create mode) upload is disabled until
 * the record is saved.
 *
 * Example:
 * ```vue
 * <CnObjectFilesWidget :object-data="pet" />
 * ```
 */
export default {
	name: 'CnObjectFilesWidget',

	components: { NcButton, NcLoadingIcon },

	// The detail host passes its whole prop bag (content, store, objectType); only the object context is read.
	inheritAttrs: false,

	props: {
		/** Register slug or id. Empty: read from `objectData['@self'].register`. */
		register: {
			type: String,
			default: '',
		},

		/** Schema slug or id. Empty: read from `objectData['@self'].schema`. */
		schema: {
			type: String,
			default: '',
		},

		/** Object id. Empty: read from `objectData['@self'].id`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The loaded object; its `@self` supplies the context the props leave empty.
		 *
		 * @type {object}
		 */
		objectData: {
			type: Object,
			default: () => ({}),
		},

		/** Hide upload and delete. */
		readOnly: {
			type: Boolean,
			default: false,
		},

		/** Object API base (before `/{register}/{schema}/{id}/files`). */
		apiBase: {
			type: String,
			default: '/apps/openregister/api/objects',
		},

		/** Label of the upload button. Empty: "Upload file". */
		uploadLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Upload file'),
		},
	},

	emits: ['uploaded', 'deleted', 'error'],

	data() {
		return { files: [], loaded: false, busy: false, error: '', dragging: false }
	},

	computed: {
		self() {
			return (this.objectData && this.objectData['@self']) || {}
		},

		ctx() {
			const pick = (own, key) => String(own || (this.self[key] ?? '') || '')
			return { register: pick(this.register, 'register'), schema: pick(this.schema, 'schema'), id: pick(this.objectId, 'id') }
		},

		canUpload() {
			return !this.readOnly && this.ctx.id !== '' && this.ctx.register !== '' && this.ctx.schema !== ''
		},

		endpoint() {
			const { register, schema, id } = this.ctx
			return `${this.apiBase}/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(id)}/files`
		},
	},

	watch: {
		endpoint() {
			this.load()
		},
	},

	created() {
		this.load()
	},

	methods: {
		t,

		fileName(file) {
			return String(file.title || file.name || file.path || file.id)
		},

		fileUrl(file) {
			return file.downloadUrl || file.accessUrl || file.url || ''
		},

		async load() {
			if (this.ctx.id === '' || this.ctx.register === '' || this.ctx.schema === '') {
				this.files = []
				return
			}
			this.busy = true
			this.error = ''
			try {
				const data = await cnFetchJson(this.endpoint)
				this.files = Array.isArray(data) ? data : ((data && data.results) || [])
				this.loaded = true
			} catch (error) {
				this.fail(error)
			} finally {
				this.busy = false
			}
		},

		readAsDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(String(reader.result))
				reader.onerror = () => reject(reader.error)
				reader.readAsDataURL(file)
			})
		},

		async upload(list) {
			if (!this.canUpload || list.length === 0) {
				return
			}
			this.busy = true
			this.error = ''
			try {
				for (const file of list) {
					const content = await this.readAsDataUrl(file)
					await cnFetchJson(this.endpoint, { method: 'POST', body: JSON.stringify({ name: file.name, content }) })
				}
				/**
				 * @event uploaded Emitted after files were attached to the object.
				 * @type {string[]}
				 */
				this.$emit('uploaded', list.map((f) => f.name))
				await this.load()
			} catch (error) {
				this.fail(error)
			} finally {
				this.busy = false
			}
		},

		async remove(file) {
			this.busy = true
			this.error = ''
			try {
				await cnFetchJson(`${this.endpoint}/${encodeURIComponent(file.id)}`, { method: 'DELETE' })
				/**
				 * @event deleted Emitted after a file was removed from the object. Payload: the file id.
				 * @type {string|number}
				 */
				this.$emit('deleted', file.id)
				await this.load()
			} catch (error) {
				this.fail(error)
			} finally {
				this.busy = false
			}
		},

		fail(error) {
			this.error = t('nextcloud-vue', 'The files could not be updated. Try again.')
			/**
			 * @event error Emitted when listing, uploading or deleting failed. Payload: the error.
			 * @type {Error}
			 */
			this.$emit('error', error)
		},

		onPick(event) {
			this.upload([...event.target.files])
			event.target.value = ''
		},

		onDragOver() {
			this.dragging = this.canUpload
		},

		onDrop(event) {
			this.dragging = false
			this.upload([...((event.dataTransfer && event.dataTransfer.files) || [])])
		},
	},
}
</script>

<style scoped>
.cn-object-files {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
	border: 2px dashed transparent;
	border-radius: var(--border-radius-large);
}

.cn-object-files--dragging {
	border-color: var(--color-primary-element);
	background: var(--color-background-hover);
}

.cn-object-files__picker {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	overflow: hidden;
}

.cn-object-files__toolbar {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-object-files__hint,
.cn-object-files__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-object-files__error {
	color: var(--color-error-text);
	margin: 0;
}

.cn-object-files__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-object-files__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 4px 0;
	border-bottom: 1px solid var(--color-border);
}
</style>
