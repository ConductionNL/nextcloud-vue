import { listWatchers, setFavourite, setReadState, setWatcher, setWatching } from '../../utils/recordInteractions.js'

/**
 * Interactions plugin for the object store.
 *
 * Per-user interaction calls on a record: follow (watch, with its
 * notifications switch), the deprecated favourite (a quiet follow), and the
 * followers list. Each write puts the server's answer into the stored object's
 * `@self`, so a list showing the same object agrees with the toggle.
 *
 * Actions: favourite, unfavourite, watch, unwatch, fetchWatchers, addWatcher, removeWatcher, markRead, markUnread.
 * Each returns the outcome `{ ok, status, data, message }` and never throws.
 *
 * @return {object} The plugin definition (name, state, getters, actions)
 *
 * @example
 * const useStore = createObjectStore('object', { plugins: [interactionsPlugin()] })
 * const store = useStore()
 * await store.watch('case', caseId)
 * const { data } = await store.fetchWatchers('case', caseId)
 */
export function interactionsPlugin() {
	return {
		name: 'Interactions',

		state: () => ({}),

		getters: {},

		actions: {
			/**
			 * Merge a patch into the stored object's `@self`.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} patch Keys to merge into `@self`
			 */
			_patchSelf(type, objectId, patch) {
				const stored = this.objects && this.objects[type] && this.objects[type][objectId]
				if (!stored) {
					return
				}
				const next = { ...stored, '@self': { ...(stored['@self'] || {}), ...patch } }
				this.objects = { ...this.objects, [type]: { ...this.objects[type], [objectId]: next } }
			},

			/**
			 * Resolve a type slug to its register and schema.
			 *
			 * @param {string} type The registered object type slug
			 * @return {{register: string, schema: string}} The path segments
			 */
			_interactionTarget(type) {
				const config = this._getTypeConfig(type)
				return { register: config.register, schema: config.schema }
			},

			/**
			 * Star a record: a quiet follow on the server.
			 *
			 * @deprecated A favourite is a follow with notifications off since
			 * OpenRegister's `merge-follow-and-favourites`; use `watch(type, id, { notify: false })`.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome
			 */
			async favourite(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setFavourite(register, schema, objectId, true)
				if (result.ok) {
					this._patchSelf(type, objectId, { favourite: true, watching: true })
				}
				return result
			},

			/**
			 * Unstar a record: unfollow it.
			 *
			 * @deprecated Use `unwatch`.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome
			 */
			async unfavourite(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setFavourite(register, schema, objectId, false)
				if (result.ok) {
					this._patchSelf(type, objectId, { favourite: false, watching: false, watchNotify: undefined })
				}
				return result
			},

			/**
			 * Mark a record read (`PUT .../read-state`).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome
			 */
			async markRead(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setReadState(register, schema, objectId, true)
				if (result.ok) {
					this._patchSelf(type, objectId, { unread: false })
				}
				return result
			},

			/**
			 * Mark a record unread (`DELETE .../read-state`).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome
			 */
			async markUnread(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setReadState(register, schema, objectId, false)
				if (result.ok) {
					this._patchSelf(type, objectId, { unread: true })
				}
				return result
			},

			/**
			 * Follow a record, optionally setting its notifications switch.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {object} [options] Options
			 * @param {boolean} [options.notify] The notifications switch; left out, a new follow notifies
			 * @return {Promise<object>} The outcome
			 * @spec openspec/changes/one-follow-control/specs/record-follow/spec.md#requirement-one-follow-control-with-a-notifications-switch
			 */
			async watch(type, objectId, options = {}) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setWatching(register, schema, objectId, true, options)
				if (result.ok) {
					const notify = result.data && typeof result.data.notify === 'boolean' ? result.data.notify : true
					this._patchSelf(type, objectId, { watching: true, favourite: true, watchNotify: notify })
				}
				return result
			},

			/**
			 * Unfollow a record.
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome
			 */
			async unwatch(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				const result = await setWatching(register, schema, objectId, false)
				if (result.ok) {
					this._patchSelf(type, objectId, { watching: false, favourite: false, watchNotify: undefined })
				}
				return result
			},

			/**
			 * List the followers of a record (needs `update` on it).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @return {Promise<object>} The outcome; `data` is `{ results, total }`
			 */
			async fetchWatchers(type, objectId) {
				const { register, schema } = this._interactionTarget(type)
				return listWatchers(register, schema, objectId)
			},

			/**
			 * Add a colleague as a follower (needs `manage`).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {string} userId The colleague's user id
			 * @return {Promise<object>} The outcome
			 */
			async addWatcher(type, objectId, userId) {
				const { register, schema } = this._interactionTarget(type)
				return setWatcher(register, schema, objectId, userId, true)
			},

			/**
			 * Remove a follower (needs `manage`, or be the user yourself).
			 *
			 * @param {string} type The registered object type slug
			 * @param {string} objectId The object ID
			 * @param {string} userId The follower's user id
			 * @return {Promise<object>} The outcome
			 */
			async removeWatcher(type, objectId, userId) {
				const { register, schema } = this._interactionTarget(type)
				return setWatcher(register, schema, objectId, userId, false)
			},
		},
	}
}
