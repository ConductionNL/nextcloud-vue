import { ref, computed, isRef, watch, onMounted } from 'vue'
import { useObjectStore } from '../store/index.js'

/**
 * Composable for managing detail view state with full objectStore integration.
 *
 * When called with `objectType` and `id`, connects to the objectStore and handles
 * fetching on mount, re-fetching on `id` changes, save/delete operations, and
 * optional router navigation — eliminating boilerplate from every detail-view component.
 *
 * Backward-compatible: existing `useDetailView(options)` and `useDetailView()` calls
 * continue to work without modification.
 *
 * @param {string|object} [objectTypeOrOptions] Object type slug (new API) or legacy options object
 * @param {string|import('vue').Ref<string>} [id] Object ID or `'new'` for a new object
 * @param {object} [options] Options (new API only)
 * @param {object|null} [options.router] Vue Router instance — enables post-save/delete navigation
 * @param {string|null} [options.listRouteName] Route name to navigate to after successful delete
 * @param {string|null} [options.detailRouteName] Route name to navigate to after successful create
 * @param {string} [options.nameField] Field shown in error messages
 * @return {object} Reactive state and operation functions
 *
 * @example
 * // New API
 * const { object, isNew, loading, saving, editing,
 *         onSave, confirmDelete, showDeleteDialog } = useDetailView('client', props.id, {
 *   router: useRouter(),
 *   listRouteName: 'ClientList',
 *   detailRouteName: 'ClientDetail',
 * })
 *
 * @example
 * // Legacy API — still works
 * const { objectData, editing, load, save, confirmDelete } = useDetailView({
 *   objectType: 'client',
 *   fetchFn: (type, id) => objectStore.fetchObject(type, id),
 *   saveFn: (type, data) => objectStore.saveObject(type, data),
 *   deleteFn: (type, id) => objectStore.deleteObject(type, id),
 * })
 */
export function useDetailView(objectTypeOrOptions, id, options) {
	// Backward compat: if first arg is an object or absent, delegate to legacy implementation
	if (!objectTypeOrOptions || typeof objectTypeOrOptions === 'object') {
		return useLegacyDetailView(objectTypeOrOptions || {})
	}

	// ── New API ──────────────────────────────────────────────────────────
	const objectType = objectTypeOrOptions
	const opts = options || {}
	const router = opts.router || null
	const listRouteName = opts.listRouteName || null
	const detailRouteName = opts.detailRouteName || null

	// Normalise `id` to a ref so we can watch it
	const idRef = isRef(id) ? id : ref(id)

	const objectStore = useObjectStore()

	// ── State refs ───────────────────────────────────────────────────────
	const editing = ref(false)
	const saving = ref(false)
	const showDeleteDialog = ref(false)
	const error = ref(null)
	const validationErrors = ref(null)

	// ── Computed refs from the store ─────────────────────────────────────

	const isNew = computed(() => !idRef.value || idRef.value === 'new')

	const object = computed(() => {
		if (isNew.value) return {}
		return objectStore.getObject(objectType, idRef.value) || {}
	})

	const loading = computed(() => objectStore.loading[objectType] || false)

	// ── Operations ───────────────────────────────────────────────────────

	/**
	 * Save the object. Handles create (POST) and update (PUT) branches.
	 * On 422 validation error the `validationErrors` ref is populated.
	 * On successful create with `detailRouteName` set, the router navigates to the detail route.
	 * On successful update, `editing` is set to false and the object is re-fetched.
	 *
	 * @param {object} formData Data to save
	 * @return {Promise<object|null>} Saved object or null on error
	 */
	async function onSave(formData) {
		saving.value = true
		error.value = null
		validationErrors.value = null

		try {
			const dataToSave = isNew.value ? formData : { ...formData, id: idRef.value }
			const result = await objectStore.saveObject(objectType, dataToSave)

			if (!result) {
				// Store already set error; surface it
				error.value = objectStore.errors[objectType]?.message || 'Failed to save'
				return null
			}

			if (isNew.value && router && detailRouteName) {
				router.push({ name: detailRouteName, params: { id: result.id } })
			} else {
				editing.value = false
				await objectStore.fetchObject(objectType, idRef.value)
			}

			return result
		} catch (err) {
			if (err?.response?.status === 422 || err?.status === 422) {
				const data = err?.response?.data || err?.data || {}
				validationErrors.value = data.errors || data
			} else {
				error.value = err.message || 'Failed to save'
			}
			return null
		} finally {
			saving.value = false
		}
	}

	/**
	 * Delete the current object. On success, navigate to `listRouteName` if configured.
	 * On failure, `error` ref is set.
	 *
	 * @return {Promise<boolean>} True if deleted successfully
	 */
	async function confirmDelete() {
		error.value = null
		try {
			const success = await objectStore.deleteObject(objectType, idRef.value)
			if (success) {
				showDeleteDialog.value = false
				if (router && listRouteName) {
					router.push({ name: listRouteName })
				}
			} else {
				error.value = objectStore.errors[objectType]?.message || 'Failed to delete'
			}
			return success
		} catch (err) {
			error.value = err.message || 'Failed to delete'
			return false
		}
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	async function fetchIfNeeded(currentId) {
		if (!currentId || currentId === 'new') return
		await objectStore.fetchObject(objectType, currentId)
	}

	onMounted(() => {
		fetchIfNeeded(idRef.value)
	})

	watch(idRef, (newId) => {
		fetchIfNeeded(newId)
	})

	// ── Return value ─────────────────────────────────────────────────────

	return {
		// Store-derived
		object,
		loading,
		// Computed state
		isNew,
		// Local state
		editing,
		saving,
		showDeleteDialog,
		error,
		validationErrors,
		// Operations
		onSave,
		confirmDelete,
	}
}

// ── Legacy implementation ─────────────────────────────────────────────────────

/**
 * Legacy `useDetailView(options)` implementation.
 * Preserved verbatim for backward compatibility.
 *
 * @param {object} options Legacy options object
 * @param {string} [options.objectType] The registered object type slug
 * @param {Function} [options.fetchFn] (type, id) => Promise<object>
 * @param {Function} [options.saveFn] (type, data) => Promise<object>
 * @param {Function} [options.deleteFn] (type, id) => Promise<boolean>
 * @param {Function} [options.onSaved] Callback after successful save
 * @param {Function} [options.onDeleted] Callback after successful delete
 * @return {object} Reactive state and methods
 */
function useLegacyDetailView(options) {
	const objectData = ref({})
	const editing = ref(false)
	const loading = ref(false)
	const saving = ref(false)
	const showDeleteDialog = ref(false)
	const error = ref(null)

	async function load(id) {
		loading.value = true
		error.value = null
		try {
			const result = options.fetchFn
				? await options.fetchFn(options.objectType, id)
				: null
			if (result) {
				objectData.value = { ...result }
			}
			return result
		} catch (err) {
			error.value = err.message || 'Failed to load'
			return null
		} finally {
			loading.value = false
		}
	}

	async function save(formData) {
		saving.value = true
		error.value = null
		try {
			const data = formData || objectData.value
			const result = options.saveFn
				? await options.saveFn(options.objectType, data)
				: null
			if (result) {
				objectData.value = { ...result }
				editing.value = false
				if (options.onSaved) {
					options.onSaved(result)
				}
			}
			return result
		} catch (err) {
			error.value = err.message || 'Failed to save'
			return null
		} finally {
			saving.value = false
		}
	}

	function confirmDelete() {
		showDeleteDialog.value = true
	}

	async function executeDelete(id) {
		const deleteId = id || objectData.value.id
		loading.value = true
		error.value = null
		try {
			const success = options.deleteFn
				? await options.deleteFn(options.objectType, deleteId)
				: false
			if (success) {
				showDeleteDialog.value = false
				if (options.onDeleted) {
					options.onDeleted()
				}
			}
			return success
		} catch (err) {
			error.value = err.message || 'Failed to delete'
			return false
		} finally {
			loading.value = false
		}
	}

	return {
		objectData,
		editing,
		loading,
		saving,
		showDeleteDialog,
		error,
		load,
		save,
		confirmDelete,
		executeDelete,
	}
}
