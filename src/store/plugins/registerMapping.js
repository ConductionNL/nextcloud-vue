import { buildHeaders } from '../../utils/headers.js'

/**
 * Register mapping plugin for the object store.
 *
 * Adds state and actions for fetching OpenRegister registers and their
 * schemas, used by CnRegisterMapping to populate dropdowns.
 *
 * State: registers, registerSchemas, registersLoading, registersError
 * Actions: fetchRegisters, fetchSchemasForRegister, clearRegisterMapping
 * Getters: getRegisters, registerOptions, schemaOptions, isRegistersLoading, getRegistersError
 *
 * @return {Function} Plugin factory
 *
 * @example
 * const useStore = createObjectStore('object', {
 *   plugins: [registerMappingPlugin()],
 * })
 * const store = useStore()
 * await store.fetchRegisters()
 * const options = store.registerOptions       // [{ label, value }]
 * const schemas = store.schemaOptions('5')    // [{ label, value }]
 */
export function registerMappingPlugin() {
	return {
		name: 'RegisterMapping',

		state: () => ({
			/** @type {Array} All available registers from OpenRegister */
			registers: [],
			/** @type {Object<string, Array>} Schemas keyed by register ID */
			registerSchemas: {},
			/** @type {boolean} Whether registers are being fetched */
			registersLoading: false,
			/** @type {string|null} Error message from last fetch */
			registersError: null,
		}),

		getters: {
			/**
			 * @param state
			 * @return {Array} Raw register list
			 */
			getRegisters: (state) => state.registers,

			/**
			 * @param state
			 * @return {boolean} Whether registers are loading
			 */
			isRegistersLoading: (state) => state.registersLoading,

			/**
			 * @param state
			 * @return {string|null} Last error
			 */
			getRegistersError: (state) => state.registersError,

			/**
			 * Registers as NcSelect-compatible options.
			 *
			 * @param state
			 * @return {Array<{label: string, value: string}>}
			 */
			registerOptions: (state) => state.registers.map((r) => ({
				label: r.title || r.slug || `Register ${r.id}`,
				value: String(r.id),
			})),
		},

		actions: {
			/**
			 * Get schemas for a register as NcSelect options.
			 *
			 * @param {string|number} registerId Register ID
			 * @return {Array<{label: string, value: string}>}
			 */
			schemaOptions(registerId) {
				const id = String(registerId)
				return (this.registerSchemas[id] || []).map((s) => ({
					label: s.title || s.slug || `Schema ${s.id}`,
					value: String(s.id),
				}))
			},

			/**
			 * Fetch all registers from OpenRegister with expanded schemas.
			 *
			 * @param {boolean} [withSchemas] Include schemas in response
			 * @return {Promise<Array>} Fetched registers
			 */
			async fetchRegisters(withSchemas = true) {
				this.registersLoading = true
				this.registersError = null

				try {
					let url = '/apps/openregister/api/registers'
					if (withSchemas) {
						url += '?_extend[]=schemas'
					}

					const response = await fetch(url, {
						method: 'GET',
						headers: buildHeaders(),
					})

					if (!response.ok) {
						this.registersError = `Failed to fetch registers: ${response.statusText}`
						return []
					}

					const data = await response.json()
					const results = data.results || data
					this.registers = Array.isArray(results) ? results : []

					// Cache expanded schemas by register ID
					if (withSchemas) {
						for (const reg of this.registers) {
							if (Array.isArray(reg.schemas) && reg.schemas.length > 0) {
								this.registerSchemas = {
									...this.registerSchemas,
									[String(reg.id)]: reg.schemas.filter(
										(s) => s && typeof s === 'object' && s.id,
									),
								}
							}
						}
					}

					return this.registers
				} catch (error) {
					this.registersError = error.message || 'Network error fetching registers'
					return []
				} finally {
					this.registersLoading = false
				}
			},

			/**
			 * Fetch schemas for a specific register.
			 * Returns cached data if already fetched via expanded registers.
			 *
			 * @param {string|number} registerId Register ID
			 * @return {Promise<Array>} Schemas for the register
			 */
			async fetchSchemasForRegister(registerId) {
				const id = String(registerId)

				// Return cached if available and non-empty
				if (this.registerSchemas[id]?.length > 0) {
					return this.registerSchemas[id]
				}

				// Check registers array for expanded schemas
				const register = this.registers.find((r) => String(r.id) === id)
				if (register?.schemas?.length > 0) {
					const schemas = register.schemas.filter(
						(s) => s && typeof s === 'object' && s.id,
					)
					if (schemas.length > 0) {
						this.registerSchemas = { ...this.registerSchemas, [id]: schemas }
						return schemas
					}
				}

				// Fetch from API as fallback
				try {
					const response = await fetch(
						`/apps/openregister/api/registers/${id}?_extend[]=schemas`,
						{ method: 'GET', headers: buildHeaders() },
					)
					if (!response.ok) return []

					const data = await response.json()
					const schemas = (data.schemas || []).filter(
						(s) => s && typeof s === 'object' && s.id,
					)
					this.registerSchemas = { ...this.registerSchemas, [id]: schemas }
					return schemas
				} catch {
					return []
				}
			},

			/**
			 * Clear all register mapping state.
			 */
			clearRegisterMapping() {
				this.registers = []
				this.registerSchemas = {}
				this.registersLoading = false
				this.registersError = null
			},
		},
	}
}
