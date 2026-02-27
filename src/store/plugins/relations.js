import { createSubResourcePlugin } from '../createSubResourcePlugin.js'

/**
 * Relations plugin for the object store.
 *
 * Adds three sub-resources for object relations:
 * - contracts: contractual relations between objects
 * - uses: outgoing references (this object uses other objects)
 * - used: incoming references (other objects use this object)
 *
 * Each sub-resource gets its own state, loading, error, fetch, and clear.
 */

const contractsBase = createSubResourcePlugin('contracts', 'contracts')
const usesBase = createSubResourcePlugin('uses', 'uses')
const usedBase = createSubResourcePlugin('used', 'used')

/**
 * Combined relations plugin that registers contracts, uses, and used sub-resources.
 *
 * @param {object} [options={}] Plugin options
 * @return {Function} Plugin factory
 *
 * @example
 * const useStore = createObjectStore('object', {
 *   plugins: [relationsPlugin()],
 * })
 * const store = useStore()
 * await store.fetchContracts('case', caseId)
 * await store.fetchUses('case', caseId)
 * await store.fetchUsed('case', caseId)
 */
export function relationsPlugin(options = {}) {
	const contracts = contractsBase(options)
	const uses = usesBase(options)
	const used = usedBase(options)

	return {
		name: 'Relations',

		state: () => ({
			...contracts.state(),
			...uses.state(),
			...used.state(),
		}),

		getters: {
			...contracts.getters,
			...uses.getters,
			...used.getters,
		},

		actions: {
			...contracts.actions,
			...uses.actions,
			...used.actions,

			/**
			 * Clear all relation sub-resources.
			 */
			clearRelations() {
				this.clearContracts()
				this.clearUses()
				this.clearUsed()
			},
		},
	}
}
