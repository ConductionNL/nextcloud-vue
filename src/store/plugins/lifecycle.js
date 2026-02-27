import { buildHeaders } from '../../utils/headers.js'
import { parseResponseError, networkError } from '../../utils/errors.js'

/**
 * Lifecycle plugin for the object store.
 *
 * Adds object lifecycle actions: lock, unlock, publish, depublish, revert, merge.
 * These operate on the object itself (not sub-resources) but share the same
 * URL pattern: POST /{register}/{schema}/{objectId}/{action}
 *
 * State: lifecycleLoading, lifecycleError
 * Actions: lockObject, unlockObject, publishObject, depublishObject, revertObject, mergeObjects
 *
 * @return {Function} Plugin factory
 *
 * @example
 * const useStore = createObjectStore('object', {
 *   plugins: [lifecyclePlugin()],
 * })
 * const store = useStore()
 * await store.lockObject('case', caseId, { process: 'review', duration: 3600 })
 * await store.publishObject('case', caseId, { date: '2025-01-01' })
 */
export function lifecyclePlugin() {
	return {
		name: 'Lifecycle',

		state: () => ({
			lifecycleLoading: false,
			lifecycleError: null,
		}),

		getters: {
			isLifecycleLoading: (state) => state.lifecycleLoading,
			getLifecycleError: (state) => state.lifecycleError,
		},

		actions: {
			/**
			 * Perform a lifecycle action on an object.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {string} action The lifecycle action endpoint (e.g. 'lock', 'publish')
			 * @param {object} [body=null] Optional request body
			 * @return {Promise<object|null>} Response data or null on error
			 */
			async _lifecycleAction(type, objectId, action, body = null) {
				this.lifecycleLoading = true
				this.lifecycleError = null

				try {
					const url = this._buildUrl(type, objectId) + '/' + action
					const options = {
						method: 'POST',
						headers: buildHeaders(),
					}
					if (body) {
						options.body = JSON.stringify(body)
					}

					const response = await fetch(url, options)

					if (!response.ok) {
						this.lifecycleError = await parseResponseError(response, action)
						console.error(`Error performing ${action} on ${type}/${objectId}:`, this.lifecycleError)
						return null
					}

					const data = await response.json()

					if (this.objects[type] && data.id) {
						this.objects[type][data.id] = data
					}

					return data
				} catch (error) {
					this.lifecycleError = error.name === 'TypeError'
						? networkError(error)
						: { status: null, message: error.message, details: null, isValidation: false, fields: null, toString() { return this.message } }
					console.error(`Error performing ${action} on ${type}/${objectId}:`, error)
					return null
				} finally {
					this.lifecycleLoading = false
				}
			},

			/**
			 * Lock an object to prevent concurrent edits.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} options Lock options
			 * @param {string} [options.process] Lock reason/process name
			 * @param {number} [options.duration] Lock duration in seconds
			 * @return {Promise<object|null>} Updated object or null on error
			 */
			async lockObject(type, objectId, options = {}) {
				return this._lifecycleAction(type, objectId, 'lock', options)
			},

			/**
			 * Unlock an object.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object|null>} Updated object or null on error
			 */
			async unlockObject(type, objectId) {
				return this._lifecycleAction(type, objectId, 'unlock')
			},

			/**
			 * Publish an object (make it publicly accessible).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} [options={}] Publish options
			 * @param {string} [options.date] Publish date (ISO 8601)
			 * @return {Promise<object|null>} Updated object or null on error
			 */
			async publishObject(type, objectId, options = {}) {
				return this._lifecycleAction(type, objectId, 'publish', options)
			},

			/**
			 * Depublish an object (revoke public access).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} [options={}] Depublish options
			 * @param {string} [options.date] Depublish date (ISO 8601)
			 * @return {Promise<object|null>} Updated object or null on error
			 */
			async depublishObject(type, objectId, options = {}) {
				return this._lifecycleAction(type, objectId, 'depublish', options)
			},

			/**
			 * Revert an object to a previous version.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} options Revert options
			 * @param {string} [options.datetime] Target datetime
			 * @param {string} [options.auditTrailId] Audit trail entry ID to revert to
			 * @param {number} [options.version] Target version number
			 * @param {boolean} [options.overwriteVersion] Overwrite current version
			 * @return {Promise<object|null>} Updated object or null on error
			 */
			async revertObject(type, objectId, options = {}) {
				return this._lifecycleAction(type, objectId, 'revert', options)
			},

			/**
			 * Merge two objects together.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} sourceId The source object ID (will be merged into target)
			 * @param {object} options Merge options
			 * @param {string} options.target Target object ID
			 * @param {string} [options.fileAction] How to handle files ('move'|'copy'|'skip')
			 * @param {string} [options.relationAction] How to handle relations
			 * @param {string} [options.referenceAction] How to handle references
			 * @return {Promise<object|null>} Merge result or null on error
			 */
			async mergeObjects(type, sourceId, options = {}) {
				return this._lifecycleAction(type, sourceId, 'merge', options)
			},

			/**
			 * Clear lifecycle state.
			 */
			clearLifecycle() {
				this.lifecycleLoading = false
				this.lifecycleError = null
			},
		},
	}
}
