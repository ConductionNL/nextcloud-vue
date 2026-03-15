/**
 * Selection plugin for the object store.
 *
 * Adds selection management across all object types: select individual
 * objects by ID, check whether an entire collection is selected, and
 * toggle all-selected in one call.
 *
 * State added:
 *   - `selectedObjects` — Array of selected object IDs (strings)
 *
 * Getters added:
 *   - `isAllSelected(type)` — true when every object in the collection is selected
 *
 * Actions added:
 *   - `setSelectedObjects(ids)` — replace selection with an array of IDs
 *   - `clearSelectedObjects()` — deselect everything
 *   - `toggleSelectAllObjects(type)` — toggle between all-selected and none-selected
 *
 * @example
 * import { createObjectStore, selectionPlugin } from '@conduction/nextcloud-vue'
 *
 * const useMyStore = createObjectStore('myapp', {
 *   plugins: [selectionPlugin()],
 * })
 *
 * const store = useMyStore()
 * store.setSelectedObjects(['abc', 'def'])
 * store.toggleSelectAllObjects('invoice')
 * console.log(store.isAllSelected('invoice')) // true | false
 *
 * @return {object} Plugin definition
 */
export function selectionPlugin() {
	return {
		name: 'selection',

		state: () => ({
			/**
			 * IDs of currently selected objects.
			 * @type {string[]}
			 */
			selectedObjects: [],
		}),

		getters: {
			/**
			 * Check if all objects in a type's collection are selected.
			 * Returns false when the collection is empty.
			 *
			 * @param {object} state pinia injected state
			 *
			 * @return {Function} (type: string) => boolean
			 */
			isAllSelected: (state) => (type) => {
				const collection = state.collections?.[type] || []
				if (!collection.length) return false
				return collection.every((r) => {
					const id = r.id ?? r['@self']?.id
					return id != null && state.selectedObjects.includes(id)
				})
			},
		},

		actions: {
			/**
			 * Replace the selection with the given array of IDs.
			 *
			 * @param {string[]} ids Object IDs to select
			 */
			setSelectedObjects(ids) {
				this.selectedObjects = Array.isArray(ids) ? ids : []
			},

			/**
			 * Clear all selected objects.
			 */
			clearSelectedObjects() {
				this.selectedObjects = []
			},

			/**
			 * Toggle selection of all objects in a type's collection.
			 * If all objects are already selected the selection is cleared;
			 * otherwise every object in the collection is selected.
			 *
			 * @param {string} type The registered type slug
			 */
			toggleSelectAllObjects(type) {
				const collection = this.getCollection(type)
				const ids = collection.map((r) => r.id ?? r['@self']?.id).filter(Boolean)
				if (this.isAllSelected(type)) {
					this.selectedObjects = []
				} else {
					this.selectedObjects = [...ids]
				}
			},
		},
	}
}
