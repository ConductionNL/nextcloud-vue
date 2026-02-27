import { createSubResourcePlugin } from '../createSubResourcePlugin.js'
import { buildHeaders } from '../../utils/headers.js'
import { parseResponseError, networkError } from '../../utils/errors.js'

/**
 * Files plugin for the object store.
 *
 * Extends the generic sub-resource with file-specific actions:
 * upload (multipart), publish, unpublish, and delete.
 *
 * State: files, filesLoading, filesError
 * Actions: fetchFiles, uploadFiles, publishFile, unpublishFile, deleteFile, clearFiles
 * Getters: getFiles, isFilesLoading, getFilesError
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
export function filesPlugin(options = {}) {
	const base = createSubResourcePlugin('files', 'files', options)()

	return {
		...base,

		actions: {
			...base.actions,

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
		},
	}
}
