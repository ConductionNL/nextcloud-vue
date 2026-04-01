<template>
	<CnSettingsSection
		:name="name"
		:description="description"
		:doc-url="docUrl"
		:loading="registersLoading"
		loading-message="Loading registers..."
		:error="!!registersError"
		:error-message="registersError || ''"
		:on-retry="loadRegisters">
		<!-- Action buttons -->
		<template #actions>
			<NcButton
				v-if="showSaveButton"
				type="primary"
				:disabled="saving || !hasChanges"
				@click="handleSave">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSave v-else :size="20" />
				</template>
				{{ saving ? 'Saving...' : saveButtonText }}
			</NcButton>
			<NcButton
				v-if="showReimportButton"
				type="secondary"
				:disabled="reimporting"
				@click="$emit('reimport')">
				<template #icon>
					<NcLoadingIcon v-if="reimporting" :size="20" />
					<Refresh v-else :size="20" />
				</template>
				{{ reimporting ? 'Importing...' : reimportButtonText }}
			</NcButton>
			<slot name="actions" />
		</template>

		<!-- Group sections -->
		<div v-if="!registersLoading && !registersError" class="cn-register-mapping">
			<div
				v-for="(group, groupIdx) in groups"
				:key="groupIdx"
				class="cn-register-mapping__group">
				<!-- Group header -->
				<slot name="group-header"
					:group="group"
					:configured-count="configuredCount(groupIdx)"
					:total-count="group.types.length">
					<div class="cn-register-mapping__group-header">
						<h4 class="cn-register-mapping__group-title">
							{{ group.name }}
						</h4>
						<span class="cn-register-mapping__group-status">
							{{ configuredCount(groupIdx) }}/{{ group.types.length }} {{ labels.partiallyConfigured }}
						</span>
					</div>
				</slot>

				<!-- Group description -->
				<p v-if="group.description" class="cn-register-mapping__group-description">
					{{ group.description }}
				</p>

				<!-- Register selector -->
				<div class="cn-register-mapping__register-select">
					<label class="cn-register-mapping__label">{{ labels.register }}</label>
					<NcSelect
						:value="selectedRegister(groupIdx)"
						:options="registerSelectOptions"
						:placeholder="labels.selectRegister"
						:loading="registersLoading"
						label="label"
						track-by="value"
						@input="handleRegisterChange(groupIdx, $event)" />
				</div>

				<!-- Type list -->
				<div v-if="selectedRegister(groupIdx)" class="cn-register-mapping__type-list">
					<!-- Header row -->
					<div class="cn-register-mapping__type-list-header">
						<span>Name</span>
						<span>Schema</span>
						<span />
						<span />
					</div>

					<!-- Type rows -->
					<template v-for="type in group.types">
						<div
							:key="type.slug + '-row'"
							class="cn-register-mapping__type-row"
							:class="{ 'cn-register-mapping__type-row--expanded': isExpanded(groupIdx, type.slug) }"
							@click="toggleExpand(groupIdx, type.slug)">
							<span class="cn-register-mapping__type-name">{{ type.label }}</span>
							<span class="cn-register-mapping__type-schema">
								{{ schemaLabel(groupIdx, type) || labels.notConfigured }}
							</span>
							<span class="cn-register-mapping__type-status">
								<span
									class="cn-register-mapping__status-dot"
									:class="schemaValue(groupIdx, type)
										? 'cn-register-mapping__status-dot--configured'
										: 'cn-register-mapping__status-dot--unconfigured'" />
							</span>
							<span class="cn-register-mapping__type-chevron">
								<ChevronUp v-if="isExpanded(groupIdx, type.slug)" :size="20" />
								<ChevronDown v-else :size="20" />
							</span>
						</div>

						<!-- Expanded detail -->
						<transition :key="type.slug + '-detail'" name="slide">
							<div
								v-if="isExpanded(groupIdx, type.slug)"
								class="cn-register-mapping__type-detail">
								<p v-if="type.description" class="cn-register-mapping__type-description">
									{{ type.description }}
								</p>
								<NcSelect
									:value="selectedSchema(groupIdx, type)"
									:options="schemaSelectOptions(groupIdx)"
									:placeholder="labels.selectSchema"
									label="label"
									track-by="value"
									@input="handleSchemaChange(groupIdx, type, $event)" />
							</div>
						</transition>
					</template>
				</div>

				<!-- No register selected -->
				<NcNoteCard v-else-if="!registersLoading" type="info">
					{{ labels.selectRegister }}
				</NcNoteCard>

				<!-- No schemas available -->
				<NcNoteCard
					v-if="selectedRegister(groupIdx) && schemaSelectOptions(groupIdx).length === 0 && !registersLoading"
					type="warning">
					{{ labels.noSchemas }}
				</NcNoteCard>
			</div>
		</div>

		<!-- Footer -->
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</CnSettingsSection>
</template>

<script>
import { CnSettingsSection } from '../CnSettingsSection/index.js'
import { NcButton, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import { buildHeaders } from '../../utils/headers.js'

/**
 * CnRegisterMapping - OpenRegister register/schema configuration component.
 *
 * Displays and manages register-to-schema mappings for app object types.
 * Self-fetches available registers and schemas from the OpenRegister API.
 * Supports multiple register groups (stacked sections) with expandable
 * type rows for manual schema override.
 *
 * @example Single register (Pipelinq)
 * <CnRegisterMapping
 *   name="Register Configuration"
 *   :groups="[{
 *     name: 'Core Objects',
 *     types: [
 *       { slug: 'client', label: 'Client' },
 *       { slug: 'contact', label: 'Contact' },
 *     ],
 *   }]"
 *   :configuration="config"
 *   :show-reimport-button="true"
 *   save="saveConfig"
 *   reimport="reimport" />
 *
 * @example Multi-register (SoftwareCatalog)
 * <CnRegisterMapping
 *   :groups="[
 *     { name: 'Voorzieningen', registerConfigKey: 'voorzieningen_register', types: [...] },
 *     { name: 'AMEF', registerConfigKey: 'amef_register', types: [...] },
 *   ]"
 *   :configuration="config"
 *   save="saveConfig" />
 */
export default {
	name: 'CnRegisterMapping',

	components: {
		CnSettingsSection,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
		NcSelect,
		ContentSave,
		Refresh,
		ChevronDown,
		ChevronUp,
	},

	props: {
		/** Section title */
		name: {
			type: String,
			default: 'Register Configuration',
		},
		/** Section description */
		description: {
			type: String,
			default: 'Configure OpenRegister schema mappings for your object types',
		},
		/** Documentation URL */
		docUrl: {
			type: String,
			default: '',
		},
		/**
		 * Groups of object types that share a register.
		 * @type {Array<{ name: string, description?: string, registerConfigKey?: string, types: Array<{ slug: string, label: string, description?: string, configKey?: string }> }>}
		 */
		groups: {
			type: Array,
			required: true,
			validator: (groups) => groups.length > 0
				&& groups.every((g) => g.name && Array.isArray(g.types) && g.types.length > 0),
		},
		/** Current configuration values: { register: '5', client_schema: '28', ... } */
		configuration: {
			type: Object,
			default: () => ({}),
		},
		/** Show save button */
		showSaveButton: {
			type: Boolean,
			default: true,
		},
		/** Whether save is in progress */
		saving: {
			type: Boolean,
			default: false,
		},
		/** Show reimport button */
		showReimportButton: {
			type: Boolean,
			default: false,
		},
		/** Whether reimport is in progress */
		reimporting: {
			type: Boolean,
			default: false,
		},
		/** Save button text */
		saveButtonText: {
			type: String,
			default: 'Save Configuration',
		},
		/** Reimport button text */
		reimportButtonText: {
			type: String,
			default: 'Re-import configuration',
		},
		/** Auto-match schema titles to type slugs on register change */
		autoMatch: {
			type: Boolean,
			default: true,
		},
		/** UI labels (i18n) */
		labels: {
			type: Object,
			default: () => ({
				register: 'Register',
				schema: 'Schema',
				configured: 'Configured',
				notConfigured: 'Not configured',
				noSchemas: 'No schemas available in this register',
				selectRegister: 'Select a register',
				selectSchema: 'Select a schema',
				allConfigured: 'All types configured',
				partiallyConfigured: 'configured',
			}),
		},
	},

	emits: ['update:configuration', 'save', 'reimport'],

	data() {
		return {
			// Fetched data
			registers: [],
			schemasByRegister: {},
			registersLoading: false,
			registersError: null,
			// Local state
			localConfig: {},
			expandedRows: {},
		}
	},

	computed: {
		/** Register options for NcSelect */
		registerSelectOptions() {
			return this.registers.map((r) => ({
				label: r.title || r.slug || `Register ${r.id}`,
				value: String(r.id),
			}))
		},

		/** Whether local config differs from prop */
		hasChanges() {
			return JSON.stringify(this.localConfig) !== JSON.stringify(this.configuration)
		},
	},

	watch: {
		configuration: {
			handler(newVal) {
				this.localConfig = { ...newVal }
			},
			immediate: true,
			deep: true,
		},
	},

	async mounted() {
		await this.loadRegisters()
	},

	methods: {
		/**
		 * Get the config key for a group's register.
		 *
		 * @param {number} groupIdx Group index
		 * @return {string} Config key
		 */
		registerConfigKey(groupIdx) {
			const group = this.groups[groupIdx]
			if (group.registerConfigKey) return group.registerConfigKey
			if (this.groups.length === 1) return 'register'
			return group.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_register'
		},

		/**
		 * Get the config key for a type's schema.
		 *
		 * @param {object} type Type definition
		 * @return {string} Config key
		 */
		schemaConfigKey(type) {
			return type.configKey || type.slug + '_schema'
		},

		/**
		 * Get the selected register option for a group.
		 *
		 * @param {number} groupIdx Group index
		 * @return {object|null} NcSelect option
		 */
		selectedRegister(groupIdx) {
			const key = this.registerConfigKey(groupIdx)
			const value = String(this.localConfig[key] || '')
			if (!value) return null
			return this.registerSelectOptions.find((o) => o.value === value) || null
		},

		/**
		 * Get the selected schema option for a type.
		 *
		 * @param {number} groupIdx Group index
		 * @param {object} type Type definition
		 * @return {object|null} NcSelect option
		 */
		selectedSchema(groupIdx, type) {
			const key = this.schemaConfigKey(type)
			const value = String(this.localConfig[key] || '')
			if (!value) return null
			const options = this.schemaSelectOptions(groupIdx)
			return options.find((o) => o.value === value) || null
		},

		/**
		 * Get the schema value (ID) for a type.
		 *
		 * @param {number} groupIdx Group index
		 * @param {object} type Type definition
		 * @return {string} Schema ID or empty string
		 */
		schemaValue(groupIdx, type) {
			const key = this.schemaConfigKey(type)
			return this.localConfig[key] || ''
		},

		/**
		 * Get the display label for a type's current schema.
		 *
		 * @param {number} groupIdx Group index
		 * @param {object} type Type definition
		 * @return {string} Schema label or empty string
		 */
		schemaLabel(groupIdx, type) {
			const selected = this.selectedSchema(groupIdx, type)
			if (selected) return selected.label
			const value = this.schemaValue(groupIdx, type)
			return value ? `Schema ${value}` : ''
		},

		/**
		 * Get schema options for a group's selected register.
		 *
		 * @param {number} groupIdx Group index
		 * @return {Array<{label: string, value: string}>} NcSelect options
		 */
		schemaSelectOptions(groupIdx) {
			const reg = this.selectedRegister(groupIdx)
			if (!reg) return []
			const schemas = this.schemasByRegister[reg.value] || []
			return schemas.map((s) => ({
				label: s.title || s.slug || `Schema ${s.id}`,
				value: String(s.id),
			}))
		},

		/**
		 * Count configured types in a group.
		 *
		 * @param {number} groupIdx Group index
		 * @return {number} Count
		 */
		configuredCount(groupIdx) {
			const group = this.groups[groupIdx]
			return group.types.filter((type) => !!this.schemaValue(groupIdx, type)).length
		},

		/**
		 * Check if a type row is expanded.
		 *
		 * @param {number} groupIdx Group index
		 * @param {string} slug Type slug
		 * @return {boolean}
		 */
		isExpanded(groupIdx, slug) {
			return !!this.expandedRows[groupIdx + '-' + slug]
		},

		/**
		 * Toggle a type row expansion.
		 *
		 * @param {number} groupIdx Group index
		 * @param {string} slug Type slug
		 */
		toggleExpand(groupIdx, slug) {
			const key = groupIdx + '-' + slug
			this.expandedRows = {
				...this.expandedRows,
				[key]: !this.expandedRows[key],
			}
		},

		/**
		 * Handle register selection change for a group.
		 *
		 * @param {number} groupIdx Group index
		 * @param {object|null} option NcSelect option
		 */
		async handleRegisterChange(groupIdx, option) {
			const key = this.registerConfigKey(groupIdx)
			const value = option?.value || ''

			this.localConfig = { ...this.localConfig, [key]: value }

			// Clear schema selections for this group
			const group = this.groups[groupIdx]
			for (const type of group.types) {
				const schemaKey = this.schemaConfigKey(type)
				this.localConfig = { ...this.localConfig, [schemaKey]: '' }
			}

			// Fetch schemas for the new register
			if (value) {
				await this.loadSchemasForRegister(value)

				// Auto-match schemas
				if (this.autoMatch) {
					this.autoMatchSchemas(groupIdx)
				}
			}

			this.$emit('update:configuration', { ...this.localConfig })
		},

		/**
		 * Handle schema selection change for a type.
		 *
		 * @param {number} groupIdx Group index
		 * @param {object} type Type definition
		 * @param {object|null} option NcSelect option
		 */
		handleSchemaChange(groupIdx, type, option) {
			const key = this.schemaConfigKey(type)
			const value = option?.value || ''

			this.localConfig = { ...this.localConfig, [key]: value }
			this.$emit('update:configuration', { ...this.localConfig })
		},

		/**
		 * Auto-match schema titles to type slugs/labels (case-insensitive).
		 *
		 * @param {number} groupIdx Group index
		 */
		autoMatchSchemas(groupIdx) {
			const group = this.groups[groupIdx]
			const options = this.schemaSelectOptions(groupIdx)

			for (const type of group.types) {
				const schemaKey = this.schemaConfigKey(type)
				// Skip if already has a value
				if (this.localConfig[schemaKey]) continue

				const slug = type.slug.toLowerCase()
				const label = type.label.toLowerCase()

				const match = options.find((o) => {
					const optLabel = o.label.toLowerCase()
					return optLabel === slug || optLabel === label
						|| optLabel.includes(slug) || slug.includes(optLabel)
				})

				if (match) {
					this.localConfig = { ...this.localConfig, [schemaKey]: match.value }
				}
			}
		},

		/** Emit save event with current config */
		handleSave() {
			this.$emit('save', { ...this.localConfig })
		},

		/**
		 * Fetch all registers from OpenRegister API.
		 */
		async loadRegisters() {
			this.registersLoading = true
			this.registersError = null

			try {
				const response = await fetch('/apps/openregister/api/registers?_extend[]=schemas', {
					method: 'GET',
					headers: buildHeaders(),
				})

				if (!response.ok) {
					this.registersError = `Failed to fetch registers: ${response.statusText}`
					return
				}

				const data = await response.json()
				const results = data.results || data
				this.registers = Array.isArray(results) ? results : []

				// Cache expanded schemas
				for (const reg of this.registers) {
					if (Array.isArray(reg.schemas) && reg.schemas.length > 0) {
						const schemas = reg.schemas.filter((s) => s && typeof s === 'object' && s.id)
						if (schemas.length > 0) {
							this.schemasByRegister = {
								...this.schemasByRegister,
								[String(reg.id)]: schemas,
							}
						}
					}
				}
			} catch (error) {
				this.registersError = error.message || 'Network error fetching registers'
			} finally {
				this.registersLoading = false
			}
		},

		/**
		 * Fetch schemas for a specific register.
		 *
		 * @param {string} registerId Register ID
		 */
		async loadSchemasForRegister(registerId) {
			const id = String(registerId)

			// Return cached
			if (this.schemasByRegister[id]?.length > 0) return

			try {
				const response = await fetch(
					`/apps/openregister/api/registers/${id}?_extend[]=schemas`,
					{ method: 'GET', headers: buildHeaders() },
				)
				if (!response.ok) return

				const data = await response.json()
				const schemas = (data.schemas || []).filter((s) => s && typeof s === 'object' && s.id)
				this.schemasByRegister = { ...this.schemasByRegister, [id]: schemas }
			} catch {
				// Silently fail — register already selected, schemas just won't populate
			}
		},
	},
}
</script>

<style scoped>
.cn-register-mapping__group {
	margin-bottom: 24px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 20px;
	background: var(--color-background-hover);
}

.cn-register-mapping__group:last-child {
	margin-bottom: 0;
}

.cn-register-mapping__group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.cn-register-mapping__group-title {
	font-size: 16px;
	font-weight: 600;
	margin: 0;
	color: var(--color-main-text);
}

.cn-register-mapping__group-status {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-register-mapping__group-description {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	margin: 0 0 12px 0;
}

.cn-register-mapping__label {
	display: block;
	font-weight: 500;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	margin-bottom: 4px;
}

.cn-register-mapping__register-select {
	margin-bottom: 16px;
	max-width: 400px;
}

.cn-register-mapping__type-list {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	overflow: hidden;
	background: var(--color-main-background);
}

.cn-register-mapping__type-list-header {
	display: grid;
	grid-template-columns: 1fr 1fr 40px 32px;
	align-items: center;
	padding: 8px 16px;
	font-size: 12px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-background-hover);
}

.cn-register-mapping__type-row {
	display: grid;
	grid-template-columns: 1fr 1fr 40px 32px;
	align-items: center;
	padding: 10px 16px;
	border-bottom: 1px solid var(--color-border);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.cn-register-mapping__type-row:hover {
	background: var(--color-background-hover);
}

.cn-register-mapping__type-row--expanded {
	background: var(--color-background-hover);
}

.cn-register-mapping__type-name {
	font-weight: 500;
	color: var(--color-main-text);
}

.cn-register-mapping__type-schema {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-register-mapping__type-status {
	display: flex;
	justify-content: center;
}

.cn-register-mapping__type-chevron {
	display: flex;
	justify-content: center;
	color: var(--color-text-maxcontrast);
}

.cn-register-mapping__status-dot {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
}

.cn-register-mapping__status-dot--configured {
	background-color: var(--color-success);
}

.cn-register-mapping__status-dot--unconfigured {
	background-color: var(--color-warning);
}

.cn-register-mapping__type-detail {
	padding: 12px 16px 16px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-main-background);
}

.cn-register-mapping__type-description {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	margin: 0 0 8px 0;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
	transition: all 0.2s ease;
	max-height: 200px;
	overflow: hidden;
}

.slide-enter,
.slide-leave-to {
	max-height: 0;
	padding-top: 0;
	padding-bottom: 0;
	opacity: 0;
}

/* Last row in list should not have bottom border */
.cn-register-mapping__type-list > :last-child {
	border-bottom: none;
}

@media (max-width: 768px) {
	.cn-register-mapping__type-list-header {
		display: none;
	}

	.cn-register-mapping__type-row {
		grid-template-columns: 1fr auto 32px;
	}

	.cn-register-mapping__type-schema {
		display: none;
	}

	.cn-register-mapping__register-select {
		max-width: none;
	}
}
</style>
