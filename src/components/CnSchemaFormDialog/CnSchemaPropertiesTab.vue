<template>
	<Fragment>
		<div class="cn-schema-form__scrollable">
			<CnDataTable
				:columns="tableColumns"
				:rows="propertyRows"
				row-key="_id"
				:selectable="false"
				:row-class="getRowClass"
				:cell-class="getCellClass"
				:empty-text="'No properties found. Click &quot;Add property&quot; to create one.'"
				@row-click="onRowClick">
				<template #actions-header>
					<NcButton
						type="primary"
						:disabled="loading"
						@click="$emit('add-property')">
						<template #icon>
							<Plus :size="20" />
						</template>
						Add property
					</NcButton>
				</template>

				<template #column-_key="{ row }">
					<div v-if="selectedProperty === row._key" class="cn-schema-form__name-input-container" @click.stop>
						<AlertOutline v-if="isPropertyModified(row._key)"
							:size="16"
							class="cn-schema-form__warning-icon"
							:title="'Property has been modified. Changes will only take effect after the schema is saved.'" />
						<NcTextField
							ref="propertyNameInput"
							:value="row._key"
							label="(technical) Property Name"
							@update:value="onPropertyKeyUpdate(row._key, $event)"
							@click.stop />
					</div>
					<div v-else class="cn-schema-form__name-display-container">
						<AlertOutline v-if="isPropertyModified(row._key)"
							:size="16"
							class="cn-schema-form__warning-icon"
							:title="'Property has been modified. Changes will only take effect after the schema is saved.'" />
						<div class="cn-schema-form__name-with-chips">
							<span class="cn-schema-form__property-name">{{ row._key }}</span>
							<div class="cn-schema-form__inline-chips">
								<span v-if="isPropertyRequired(schema, row._key)"
									class="cn-schema-form__property-chip cn-schema-form__chip-primary">Required</span>
								<span v-if="row.immutable"
									class="cn-schema-form__property-chip cn-schema-form__chip-secondary">Immutable</span>
								<span v-if="row.deprecated"
									class="cn-schema-form__property-chip cn-schema-form__chip-warning">Deprecated</span>
								<span v-if="row.visible === false"
									class="cn-schema-form__property-chip cn-schema-form__chip-secondary">Hidden in view</span>
								<span v-if="row.hideOnCollection"
									class="cn-schema-form__property-chip cn-schema-form__chip-secondary">Hidden in Collection</span>
								<span v-if="row.hideOnForm"
									class="cn-schema-form__property-chip cn-schema-form__chip-secondary">Hidden in Form</span>
								<span v-if="row.const !== undefined"
									class="cn-schema-form__property-chip cn-schema-form__chip-success">Constant</span>
								<span v-if="row.enum && row.enum.length > 0"
									class="cn-schema-form__property-chip cn-schema-form__chip-success">Enumeration ({{ row.enum.length }})</span>
								<span v-if="row.facetable === true || (typeof row.facetable === 'object' && row.facetable !== null)"
									class="cn-schema-form__property-chip cn-schema-form__chip-info">Facetable</span>
								<span v-if="hasCustomTableSettings(row._key)"
									class="cn-schema-form__property-chip cn-schema-form__chip-table">Table</span>
							</div>
						</div>
					</div>
				</template>

				<template #column-type="{ row }">
					<NcSelect
						v-if="selectedProperty === row._key"
						v-model="schema.properties[row._key].type"
						:options="typeOptionsForSelect"
						input-label="Property Type"
						@click.stop />
					<span v-else>{{ row.type }}</span>
				</template>

				<template #row-actions="{ row }">
					<CnSchemaPropertyActions
						:property-key="row._key"
						:property="schema.properties[row._key]"
						:schema-item="schema"
						:original-properties="originalProperties"
						:available-schemas="availableSchemas"
						:available-registers="availableRegisters"
						:available-tags-options="availableTagsOptions"
						:user-groups="userGroups"
						:sorted-user-groups="sortedUserGroups"
						:loading-groups="loadingGroups"
						@copy-property="$emit('copy-property', $event)"
						@delete-property="$emit('delete-property', $event)" />
				</template>
			</CnDataTable>
		</div>
		<CnNoteCard v-if="propertiesModified && !loading" type="warning" class="cn-schema-form__properties-warning">
			<p>Properties have been modified. Changes will only take effect after the schema is saved.</p>
		</CnNoteCard>
	</Fragment>
</template>

<!-- eslint-disable jsdoc/valid-types -->
<script>
import { NcButton, NcTextField, NcSelect } from '@nextcloud/vue'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnNoteCard } from '../CnNoteCard/index.js'
import CnSchemaPropertyActions from './CnSchemaPropertyActions.vue'

import Plus from 'vue-material-design-icons/Plus.vue'
import AlertOutline from 'vue-material-design-icons/AlertOutline.vue'

/**
 * CnSchemaPropertiesTab — Properties table tab for CnSchemaFormDialog.
 *
 * Renders the properties of a JSON Schema in a CnDataTable with inline editing
 * for property name and type, plus an actions dropdown per row.
 *
 * @event add-property Emitted when "Add property" button is clicked.
 * @event update:selected-property Emitted when row selection changes. Payload: key or null.
 * @event update:property-key Emitted when property is renamed. Payload: { oldKey, newKey }.
 * @event copy-property Emitted when copy action is triggered. Payload: key.
 * @event delete-property Emitted when delete action is triggered. Payload: key.
 */
export default {
	name: 'CnSchemaPropertiesTab',
	components: {
		NcButton,
		NcTextField,
		NcSelect,
		CnDataTable,
		CnNoteCard,
		CnSchemaPropertyActions,
		Plus,
		AlertOutline,
	},
	props: {
		/** The full schema item (needs .properties, .required) */
		schemaItem: { type: Object, required: true },
		/** Disable state */
		loading: { type: Boolean, default: false },
		/** Currently selected property key */
		selectedProperty: { type: String, default: null },
		/** Whether any properties have been modified */
		propertiesModified: { type: Boolean, default: false },
		/** Original properties snapshot for modification detection */
		originalProperties: { type: Object, default: () => ({}) },
		/** Type options for the inline NcSelect */
		typeOptionsForSelect: { type: Array, default: () => [] },
		/** Available schemas for references */
		availableSchemas: { type: Array, default: () => [] },
		/** Available registers */
		availableRegisters: { type: Array, default: () => [] },
		/** Available tags for file property config */
		availableTagsOptions: { type: Array, default: () => [] },
		/** User groups for RBAC */
		userGroups: { type: Array, default: () => [] },
		/** Filtered/sorted user groups */
		sortedUserGroups: { type: Array, default: () => [] },
		/** Whether groups are loading */
		loadingGroups: { type: Boolean, default: false },
	},
	data() {
		return {
			propertyStableIds: {},
			nextPropertyId: 1,
			isRenaming: false,
			tableColumns: [
				{ key: '_key', label: 'Name', sortable: false },
				{ key: 'type', label: 'Type', sortable: false },
			],
		}
	},
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
		sortedProperties() {
			const properties = this.schema.properties || {}
			return Object.entries(properties)
				.sort(([, propA], [, propB]) => {
					const orderA = propA.order || 0
					const orderB = propB.order || 0
					if (orderA > 0 && orderB > 0) {
						return orderA - orderB
					}
					if (orderA > 0) return -1
					if (orderB > 0) return 1
					const createdA = propA.created || ''
					const createdB = propB.created || ''
					return createdA.localeCompare(createdB)
				})
		},
		propertyRows() {
			return this.sortedProperties.map(([key, prop]) => ({
				_id: this.getStablePropertyId(key),
				_key: key,
				...prop,
			}))
		},
	},
	watch: {
		selectedProperty(newKey) {
			if (newKey !== null) {
				// Skip focus+select when the change comes from a rename —
				// onPropertyKeyUpdate handles its own cursor positioning.
				if (this.isRenaming) {
					this.isRenaming = false
					return
				}
				this.$nextTick(() => {
					if (this.$refs.propertyNameInput) {
						const inputs = Array.isArray(this.$refs.propertyNameInput)
							? this.$refs.propertyNameInput
							: [this.$refs.propertyNameInput]
						if (inputs[0]) {
							const input = inputs[0].$el.querySelector('input')
							if (input) {
								input.focus()
								input.select()
							}
						}
					}
				})
			}
		},
	},
	methods: {
		getStablePropertyId(propertyName) {
			if (!this.propertyStableIds[propertyName]) {
				this.propertyStableIds[propertyName] = this.nextPropertyId++
			}
			return this.propertyStableIds[propertyName]
		},

		isPropertyRequired(schema, key) {
			const isInSchemaRequired = schema.required && schema.required.includes(key)
			const hasPropertyRequired = schema.properties && schema.properties[key] && schema.properties[key].required === true
			return isInSchemaRequired || hasPropertyRequired
		},

		isPropertyModified(key) {
			if (!this.originalProperties) return false
			const currentProperty = JSON.stringify(this.schema.properties[key] || {})
			const originalProperty = JSON.stringify(this.originalProperties[key] || {})
			return currentProperty !== originalProperty
		},

		hasCustomTableSettings(key) {
			const table = this.schema.properties[key]?.table
			if (!table) return false
			const defaults = { default: false }
			return !Object.keys(table).every(setting => table[setting] === defaults[setting])
		},

		getRowClass(row) {
			const classes = []
			if (this.selectedProperty === row._key) {
				classes.push('cn-schema-form__selected-row')
			}
			if (this.isPropertyModified(row._key)) {
				classes.push('cn-schema-form__modified-row')
			}
			return classes.join(' ')
		},

		getCellClass(row) {
			return this.selectedProperty === row._key ? 'cn-schema-form__editing-cell' : ''
		},

		onRowClick(row) {
			if (this.selectedProperty === row._key) return
			this.$emit('update:selected-property', row._key)
		},

		onPropertyKeyUpdate(oldKey, newKey) {
			if (!newKey || newKey === oldKey) return
			if (this.schema.properties[newKey] && newKey !== oldKey) return

			this.isRenaming = true

			// Transfer stable ID
			if (this.propertyStableIds[oldKey]) {
				this.propertyStableIds[newKey] = this.propertyStableIds[oldKey]
				delete this.propertyStableIds[oldKey]
			}

			this.$emit('update:property-key', { oldKey, newKey })

			// Refocus after rename
			this.$nextTick(() => {
				if (this.$refs.propertyNameInput) {
					const inputs = Array.isArray(this.$refs.propertyNameInput)
						? this.$refs.propertyNameInput
						: [this.$refs.propertyNameInput]
					if (inputs[0]) {
						const input = inputs[0].$el.querySelector('input')
						if (input) {
							input.focus()
							input.setSelectionRange(input.value.length, input.value.length)
						}
					}
				}
			})
		},
	},
}
</script>
