import { ref } from 'vue'

/**
 * Composable for managing detail view state: loading, editing, deleting.
 *
 * Extracts the load/edit/delete pattern found in every detail view
 * across Pipelinq and Procest.
 *
 * @param {object} options Configuration options
 * @param {string} options.objectType The registered object type slug
 * @param {Function} options.fetchFn (type, id) => Promise<object>
 * @param {Function} options.saveFn (type, data) => Promise<object>
 * @param {Function} options.deleteFn (type, id) => Promise<boolean>
 * @param {Function} [options.onSaved] Callback after successful save
 * @param {Function} [options.onDeleted] Callback after successful delete
 * @return {object} Reactive state and methods
 *
 * @example
 * import { useDetailView } from '@conduction/nextcloud-vue'
 *
 * const { objectData, editing, loading, showDeleteDialog, load, save, confirmDelete, executeDelete } = useDetailView({
 *   objectType: 'client',
 *   fetchFn: (type, id) => objectStore.fetchObject(type, id),
 *   saveFn: (type, data) => objectStore.saveObject(type, data),
 *   deleteFn: (type, id) => objectStore.deleteObject(type, id),
 *   onSaved: (result) => router.push(`/clients/${result.id}`),
 *   onDeleted: () => router.push('/clients'),
 * })
 */
export function useDetailView(options) {
	const objectData = ref({})
	const editing = ref(false)
	const loading = ref(false)
	const saving = ref(false)
	const showDeleteDialog = ref(false)
	const error = ref(null)

	/**
	 * Load an object by ID.
	 * @param {string} id Object ID
	 * @return {Promise<object|null>}
	 */
	async function load(id) {
		loading.value = true
		error.value = null
		try {
			const result = await options.fetchFn(options.objectType, id)
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

	/**
	 * Save the current object data (create or update).
	 * @param {object} [formData] Optional form data override (defaults to objectData)
	 * @return {Promise<object|null>}
	 */
	async function save(formData) {
		saving.value = true
		error.value = null
		try {
			const data = formData || objectData.value
			const result = await options.saveFn(options.objectType, data)
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

	/**
	 * Show the delete confirmation dialog.
	 */
	function confirmDelete() {
		showDeleteDialog.value = true
	}

	/**
	 * Execute the delete operation.
	 * @param {string} [id] Object ID (defaults to objectData.id)
	 * @return {Promise<boolean>}
	 */
	async function executeDelete(id) {
		const deleteId = id || objectData.value.id
		loading.value = true
		error.value = null
		try {
			const success = await options.deleteFn(options.objectType, deleteId)
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
