import { createSubResourcePlugin } from '../createSubResourcePlugin.js'
import { buildHeaders } from '../../utils/headers.js'
import { parseResponseError, networkError } from '../../utils/errors.js'

/**
 * Files plugin for the object store.
 *
 * Extends the generic sub-resource with file-specific actions:
 * upload (multipart), publish, unpublish, and delete.
 *
 * State: files, filesLoading, filesError, tags, tagsLoading, tagsError
 * Actions: fetchFiles, uploadFiles, publishFile, unpublishFile, deleteFile, batchFiles, clearFiles, fetchTags
 * Getters: getFiles, isFilesLoading, getFilesError, getTags, isTagsLoading, getTagsError
 *
 * @param {object} [options={}] Plugin options
 * @param {number} [options.limit=20] Default page size
 * @return {Function} Plugin factory
 *
 * @example
 * const useStore = createObjectStore('object', {
 *   plugins: [filesPlugin()],
 * })
 * const store = useStore()
 * await store.fetchFiles('case', caseId)
 * await store.uploadFiles('case', caseId, formData)
 * await store.publishFile('case', caseId, fileId)
 */
const TAGS_PATH = '/tags'

/**
 * Build the tags API URL from the store base URL (e.g. /apps/openregister/api/objects -> /apps/openregister/api/tags).
 *
 * @param {string} baseUrl Store base URL
 * @return {string} Tags endpoint URL
 */
function buildTagsUrl(baseUrl) {
	return baseUrl.replace(/\/objects\/?$/, '') + TAGS_PATH
}

export function filesPlugin(options = {}) {
	const base = createSubResourcePlugin('files', 'files', options)()

	return {
		...base,

		state: () => ({
			...base.state(),
			tags: [],
			tagsLoading: false,
			tagsError: null,
		}),

		getters: {
			...base.getters,
			getTags: (state) => state.tags || [],
			isTagsLoading: (state) => state.tagsLoading || false,
			getTagsError: (state) => state.tagsError || null,
		},

		actions: {
			...base.actions,

			/**
			 * Fetch the list of tags (e.g. for file labels). API returns a plain array of strings.
			 * Result is stored in state.tags; use getTags getter to read.
			 *
			 * @return {Promise<string[]>} Array of tag strings, or [] on error
			 */
			async fetchTags() {
				this.tagsLoading = true
				this.tagsError = null

				try {
					const url = buildTagsUrl(this._options.baseUrl)
					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.tagsError = await parseResponseError(response, 'tags')
						console.error('Error fetching tags:', this.tagsError)
						return []
					}

					const data = await response.json()
					const tags = Array.isArray(data) ? data : []
					this.tags = tags
					return tags
				} catch (error) {
					this.tagsError = error.name === 'TypeError'
						? networkError(error)
						: { status: null, message: error.message, details: null, isValidation: false, fields: null, toString() { return this.message } }
					console.error('Error fetching tags:', error)
					return []
				} finally {
					this.tagsLoading = false
				}
			},

			/**
			 * Upload files to an object via multipart form data.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {FormData} formData FormData with files[] and optional tags/share fields
			 * @return {Promise<object|null>} Upload response or null on error
			 */
			async uploadFiles(type, objectId, formData) {
				this.filesLoading = true
				this.filesError = null

				try {
					const url = this._buildUrl(type, objectId) + '/filesMultipart'

					const response = await fetch(url, {
						method: 'POST',
						headers: buildHeaders(null),
						body: formData,
					})

					if (!response.ok) {
						this.filesError = await parseResponseError(response, 'files')
						console.error(`Error uploading files for ${type}/${objectId}:`, this.filesError)
						return null
					}

					const data = await response.json()

					await this.fetchFiles(type, objectId)

					return data
				} catch (error) {
					this.filesError = error.name === 'TypeError'
						? networkError(error)
						: { status: null, message: error.message, details: null, isValidation: false, fields: null, toString() { return this.message } }
					console.error(`Error uploading files for ${type}/${objectId}:`, error)
					return null
				} finally {
					this.filesLoading = false
				}
			},

			/**
			 * Publish a file (make it publicly accessible).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {string} fileId The file ID to publish
			 * @return {Promise<boolean>} True if published successfully
			 */
			async publishFile(type, objectId, fileId) {
				this.filesLoading = true
				this.filesError = null

				try {
					const url = this._buildUrl(type, objectId) + `/files/${fileId}/publish`

					const response = await fetch(url, {
						method: 'POST',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.filesError = await parseResponseError(response, 'files')
						return false
					}

					await this.fetchFiles(type, objectId)
					return true
				} catch (error) {
					this.filesError = networkError(error)
					return false
				} finally {
					this.filesLoading = false
				}
			},

			/**
			 * Unpublish a file (revoke public access).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {string} fileId The file ID to unpublish
			 * @return {Promise<boolean>} True if unpublished successfully
			 */
			async unpublishFile(type, objectId, fileId) {
				this.filesLoading = true
				this.filesError = null

				try {
					const url = this._buildUrl(type, objectId) + `/files/${fileId}/depublish`

					const response = await fetch(url, {
						method: 'POST',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.filesError = await parseResponseError(response, 'files')
						return false
					}

					await this.fetchFiles(type, objectId)
					return true
				} catch (error) {
					this.filesError = networkError(error)
					return false
				} finally {
					this.filesLoading = false
				}
			},

			/**
			 * Delete a file from an object.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {string} fileId The file ID to delete
			 * @return {Promise<boolean>} True if deleted successfully
			 */
			async deleteFile(type, objectId, fileId) {
				this.filesLoading = true
				this.filesError = null

				try {
					const url = this._buildUrl(type, objectId) + `/files/${fileId}`

					const response = await fetch(url, {
						method: 'DELETE',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.filesError = await parseResponseError(response, 'files')
						return false
					}

					await this.fetchFiles(type, objectId)
					return true
				} catch (error) {
					this.filesError = networkError(error)
					return false
				} finally {
					this.filesLoading = false
				}
			},

			/**
			 * Apply a batch action across multiple files in ONE request.
			 *
			 * Replaces the N-sequential-call pattern (loop calling
			 * publishFile/unpublishFile/deleteFile per id) with a single POST
			 * to /files/batch. The backend returns 200 when every operation
			 * succeeds, or 207 (multi-status) when some fail; the per-file
			 * outcomes live in `data.results` and the aggregate counts in
			 * `data.summary` (`{ succeeded, failed, total }`).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The parent object ID
			 * @param {('publish'|'depublish'|'delete'|'label')} action The batch action to apply
			 * @param {(string|number)[]} fileIds File IDs to act on (max 100, validated server-side)
			 * @param {object} [params={}] Action-specific parameters (e.g. labels for the 'label' action)
			 * @return {Promise<object|null>} Response body `{ results, summary }`, or null on transport error
			 */
			async batchFiles(type, objectId, action, fileIds, params = {}) {
				this.filesLoading = true
				this.filesError = null

				try {
					const url = this._buildUrl(type, objectId) + '/files/batch'

					const response = await fetch(url, {
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify({
							action,
							fileIds,
							...params,
						}),
					})

					// 200 = all succeeded, 207 = partial success — both are
					// valid responses; the caller inspects data.summary.
					if (!response.ok && response.status !== 207) {
						this.filesError = await parseResponseError(response, 'files')
						return null
					}

					const data = await response.json()
					await this.fetchFiles(type, objectId)
					return data
				} catch (error) {
					this.filesError = networkError(error)
					return null
				} finally {
					this.filesLoading = false
				}
			},
		},
	}
}
