<template>
	<CnTabbedFormDialog
		ref="dialog"
		:tabs="dialogTabs"
		:item="item"
		:dialog-title="dialogTitle"
		entity-name="Schema"
		:size="size"
		:disable-save="!schemaItem.title"
		:success-text="resolvedSuccessText"
		:cancel-label="cancelLabel"
		:close-label="closeLabel"
		:confirm-label="confirmLabel"
		@confirm="handleConfirm"
		@close="$emit('close')">
		<!-- Metadata Display -->
		<template #above-tabs="{ loading: dialogLoading }">
			<div class="cn-schema-form__detail-grid">
				<div v-if="schemaItem.id"
					class="cn-schema-form__detail-item cn-schema-form__id-card">
					<div class="cn-schema-form__id-card-header">
						<span class="cn-schema-form__detail-label">ID / UUID:</span>
						<NcButton class="cn-schema-form__copy-button"
							@click="copyToClipboard(schemaItem.uuid || schemaItem.id)">
							<template #icon>
								<Check v-if="isCopied" :size="20" />
								<ContentCopy v-else :size="20" />
							</template>
							{{ isCopied ? 'Copied' : 'Copy' }}
						</NcButton>
					</div>
					<span class="cn-schema-form__detail-value">{{ schemaItem.id }}</span>
					<span v-if="schemaItem.uuid && schemaItem.uuid !== schemaItem.id"
						class="cn-schema-form__detail-value cn-schema-form__uuid-value">{{ schemaItem.uuid }}</span>
				</div>
				<div class="cn-schema-form__detail-item cn-schema-form__title-with-badge">
					<NcTextField :disabled="dialogLoading"
						label="Title *"
						:value.sync="schemaItem.title" />
					<span v-if="schemaItem.allOf && schemaItem.allOf.length > 0"
						class="cn-schema-form__statusPill cn-schema-form__statusPill--success">
						allOf
					</span>
					<span v-if="schemaItem.oneOf && schemaItem.oneOf.length > 0"
						class="cn-schema-form__statusPill cn-schema-form__statusPill--info">
						oneOf
					</span>
					<span v-if="schemaItem.anyOf && schemaItem.anyOf.length > 0"
						class="cn-schema-form__statusPill cn-schema-form__statusPill--info">
						anyOf
					</span>
				</div>
				<div v-if="schemaItem.created" class="cn-schema-form__detail-item">
					<span class="cn-schema-form__detail-label">Created:</span>
					<span class="cn-schema-form__detail-value">{{ new Date(schemaItem.created).toLocaleString() }}</span>
				</div>
				<div v-if="schemaItem.updated" class="cn-schema-form__detail-item">
					<span class="cn-schema-form__detail-label">Updated:</span>
					<span class="cn-schema-form__detail-value">{{ new Date(schemaItem.updated).toLocaleString() }}</span>
				</div>
				<div class="cn-schema-form__detail-item">
					<span class="cn-schema-form__detail-label">Version:</span>
					<span class="cn-schema-form__detail-value">{{ schemaItem.version || 'Not set' }}</span>
				</div>
				<div class="cn-schema-form__detail-item">
					<span class="cn-schema-form__detail-label">Owner:</span>
					<span class="cn-schema-form__detail-value">{{ schemaItem.owner || 'Not set' }}</span>
				</div>
			</div>
		</template>

		<!-- Properties Tab -->
		<template #tab-properties="{ loading: dialogLoading }">
			<CnSchemaPropertiesTab
				:schema-item="schemaItem"
				:loading="dialogLoading"
				:selected-property="selectedProperty"
				:properties-modified="propertiesModified"
				:original-properties="originalProperties"
				:type-options-for-select="typeOptionsForSelect"
				:available-schemas="availableSchemas"
				:available-registers="availableRegisters"
				:available-tags-options="availableTagsOptions"
				:user-groups="userGroups"
				:sorted-user-groups="sortedUserGroups"
				:loading-groups="loadingGroups"
				@add-property="addProperty"
				@update:selected-property="selectedProperty = $event"
				@update:property-key="updatePropertyKey($event.oldKey, $event.newKey)"
				@copy-property="copyProperty"
				@delete-property="deleteProperty" />
		</template>

		<!-- Configuration Tab -->
		<template #tab-configuration="{ loading: dialogLoading }">
			<CnSchemaConfigurationTab
				:schema-item="schemaItem"
				:loading="dialogLoading"
				:available-schemas="availableSchemas"
				:property-options="propertyOptions"
				:all-of-schema-names="allOfSchemaNames" />
		</template>

		<!-- Security Tab -->
		<template #tab-security>
			<CnSchemaSecurityTab
				:schema-item="schemaItem"
				:user-groups="userGroups"
				:sorted-user-groups="sortedUserGroups"
				:loading-groups="loadingGroups"
				:has-any-permissions="hasAnyPermissions"
				:is-restrictive-schema="isRestrictiveSchema" />
		</template>

		<!-- Optional Action Buttons (edit mode only) -->
		<template #actions-right="{ loading: dialogLoading, isCreateMode, result: dialogResult }">
			<template v-if="!isCreateMode && dialogResult === null">
				<NcButton
					v-if="showExtendSchema"
					:disabled="dialogLoading"
					@click="$emit('extend-schema')">
					<template #icon>
						<CallSplit :size="20" />
					</template>
					{{ extendSchemaLabel }}
				</NcButton>
				<NcButton
					v-if="showAnalyzeProperties"
					:disabled="dialogLoading"
					@click="$emit('analyze-properties')">
					<template #icon>
						<DatabaseSearch :size="20" />
					</template>
					{{ analyzePropertiesLabel }}
				</NcButton>
				<NcButton
					v-if="showValidateObjects"
					:disabled="dialogLoading"
					@click="$emit('validate-objects')">
					<template #icon>
						<CheckCircle :size="20" />
					</template>
					{{ validateObjectsLabel }}
				</NcButton>
				<NcButton
					v-if="showDeleteObjects"
					v-tooltip="objectCount > 0 ? deleteObjectsTooltip : noDeleteObjectsTooltip"
					:disabled="dialogLoading || objectCount === 0"
					@click="$emit('delete-objects')">
					<template #icon>
						<DeleteSweep :size="20" />
					</template>
					{{ deleteObjectsLabel }}
				</NcButton>
				<NcButton
					v-if="showPublishObjects"
					v-tooltip="objectCount > 0 ? publishObjectsTooltip : noPublishObjectsTooltip"
					:disabled="dialogLoading || objectCount === 0"
					@click="$emit('publish-objects')">
					<template #icon>
						<Upload :size="20" />
					</template>
					{{ publishObjectsLabel }}
				</NcButton>
				<NcButton
					v-if="showDelete"
					v-tooltip="objectCount > 0 ? cannotDeleteTooltip : ''"
					:disabled="dialogLoading || objectCount > 0"
					type="error"
					@click="$emit('delete-schema')">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
					{{ deleteLabel }}
				</NcButton>
			</template>
		</template>
	</CnTabbedFormDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcTextField,
} from '@nextcloud/vue'

import CnTabbedFormDialog from '../CnTabbedFormDialog/CnTabbedFormDialog.vue'
import CnSchemaPropertiesTab from './CnSchemaPropertiesTab.vue'
import CnSchemaConfigurationTab from './CnSchemaConfigurationTab.vue'
import CnSchemaSecurityTab from './CnSchemaSecurityTab.vue'

import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Check from 'vue-material-design-icons/Check.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CallSplit from 'vue-material-design-icons/CallSplit.vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import CheckCircle from 'vue-material-design-icons/CheckCircle.vue'
import DeleteSweep from 'vue-material-design-icons/DeleteSweep.vue'
import Upload from 'vue-material-design-icons/Upload.vue'

/**
 * CnSchemaFormDialog — Generic JSON Schema editor dialog.
 *
 * Provides a full-featured form for creating and editing JSON Schemas with
 * properties table, configuration, and security (RBAC) tabs. Uses CnTabbedFormDialog.
 *
 * The dialog does NOT perform saves — it emits a `confirm` event with the schema data.
 * The parent performs the actual API call and calls `setResult()` via a ref.
 *
 * @event confirm Emitted when the user confirms. Payload: cleaned schema data object.
 * @event close Emitted when the dialog should be closed.
 * @event extend-schema Emitted when the Extend Schema button is clicked.
 * @event analyze-properties Emitted when the Analyze Properties button is clicked.
 * @event validate-objects Emitted when the Validate Objects button is clicked.
 * @event delete-objects Emitted when the Delete Objects button is clicked.
 * @event publish-objects Emitted when the Publish Objects button is clicked.
 * @event delete-schema Emitted when the Delete button is clicked.
 */
export default {
	name: 'CnSchemaFormDialog',
	components: {
		NcTextField,
		NcButton,
		CnTabbedFormDialog,
		CnSchemaPropertiesTab,
		CnSchemaConfigurationTab,
		CnSchemaSecurityTab,
		// Icons
		ContentCopy,
		Check,
		TrashCanOutline,
		CallSplit,
		DatabaseSearch,
		CheckCircle,
		DeleteSweep,
		Upload,
	},
	props: {
		/** Existing schema item for edit mode. Pass null for create mode. */
		item: { type: Object, default: null },
		/** Dialog title. Defaults to "Create Schema" or "Edit Schema". */
		dialogTitle: { type: String, default: '' },
		/** NcDialog size */
		size: { type: String, default: 'large' },
		/** Available schemas for references and composition. Array of { id, title, description, reference } */
		availableSchemas: { type: Array, default: () => [] },
		/** Available registers. Array of { id, label } */
		availableRegisters: { type: Array, default: () => [] },
		/** User groups for RBAC. Array of { id, displayname } */
		userGroups: { type: Array, default: () => [] },
		/** Available tags for file property configuration */
		availableTags: { type: Array, default: () => [] },
		/** Whether user groups are still loading */
		loadingGroups: { type: Boolean, default: false },
		/** Number of objects attached to this schema (used for action button disable logic) */
		objectCount: { type: Number, default: 0 },
		// Optional action button visibility
		/** Show "Extend Schema" button */
		showExtendSchema: { type: Boolean, default: false },
		/** Show "Analyze Properties" button */
		showAnalyzeProperties: { type: Boolean, default: false },
		/** Show "Validate Objects" button */
		showValidateObjects: { type: Boolean, default: false },
		/** Show "Delete Objects" button */
		showDeleteObjects: { type: Boolean, default: false },
		/** Show "Publish Objects" button */
		showPublishObjects: { type: Boolean, default: false },
		/** Show "Delete" button */
		showDelete: { type: Boolean, default: false },
		// Labels (pre-translated strings with English defaults)
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Confirm button label. Defaults to "Create" or "Save". */
		confirmLabel: { type: String, default: '' },
		/** Success message. Defaults to "Schema saved successfully." */
		successText: { type: String, default: '' },
		extendSchemaLabel: { type: String, default: () => t('nextcloud-vue', 'Extend schema') },
		analyzePropertiesLabel: { type: String, default: () => t('nextcloud-vue', 'Analyze properties') },
		validateObjectsLabel: { type: String, default: () => t('nextcloud-vue', 'Validate objects') },
		deleteObjectsLabel: { type: String, default: () => t('nextcloud-vue', 'Delete objects') },
		publishObjectsLabel: { type: String, default: () => t('nextcloud-vue', 'Publish objects') },
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		deleteObjectsTooltip: { type: String, default: () => t('nextcloud-vue', 'Delete all objects in this schema') },
		publishObjectsTooltip: { type: String, default: () => t('nextcloud-vue', 'Publish all objects in this schema') },
		/** Tooltip for the Delete Objects button when no objects exist */
		noDeleteObjectsTooltip: { type: String, default: () => t('nextcloud-vue', 'No objects to delete') },
		/** Tooltip for the Publish Objects button when no objects exist */
		noPublishObjectsTooltip: { type: String, default: () => t('nextcloud-vue', 'No objects to publish') },
		cannotDeleteTooltip: { type: String, default: () => t('nextcloud-vue', 'Cannot delete: objects are still attached') },
	},
	data() {
		return {
			isCopied: false,
			selectedProperty: null,
			propertiesModified: false,
			originalProperties: null,
			schemaItem: {
				title: '',
				version: '0.0.0',
				description: '',
				summary: '',
				slug: '',
				properties: {},
				configuration: {
					objectNameField: '',
					objectDescriptionField: '',
					objectImageField: '',
					objectSummaryField: '',
					allowFiles: false,
					allowedTags: [],
					autoPublish: false,
				},
				authorization: {},
				hardValidation: false,
				immutable: false,
				searchable: true,
				maxDepth: 0,
			},
		}
	},
	computed: {
		/**
		 * Tab definitions for CnTabbedFormDialog.
		 *
		 * @return {Array} Tab configuration
		 */
		dialogTabs() {
			return [
				{ id: 'properties', title: 'Properties' },
				{ id: 'configuration', title: 'Configuration' },
				{ id: 'security', title: 'Security' },
			]
		},
		sortedUserGroups() {
			return this.userGroups
				.filter(group => group.id !== 'admin' && group.id !== 'public' && group.id !== 'authenticated')
				.sort((a, b) => {
					const nameA = a.displayname || a.id
					const nameB = b.displayname || b.id
					return nameA.localeCompare(nameB)
				})
		},
		hasAnyPermissions() {
			const auth = this.schemaItem.authorization || {}
			return Object.keys(auth).some(action =>
				Array.isArray(auth[action]) && auth[action].length > 0,
			)
		},
		isRestrictiveSchema() {
			const auth = this.schemaItem.authorization || {}
			const actions = ['create', 'read', 'update', 'delete']
			return actions.some(action =>
				Array.isArray(auth[action]) && auth[action].length > 0
					&& !auth[action].includes('public'),
			)
		},
		typeOptionsForSelect() {
			return [
				{ id: 'string', label: 'String' },
				{ id: 'number', label: 'Number' },
				{ id: 'integer', label: 'Integer' },
				{ id: 'boolean', label: 'Boolean' },
				{ id: 'array', label: 'Array' },
				{ id: 'object', label: 'Object' },
				{ id: 'dictionary', label: 'Dictionary' },
				{ id: 'file', label: 'File' },
				{ id: 'oneOf', label: 'One Of' },
			]
		},
		propertyOptions() {
			const properties = this.schemaItem.properties || {}
			return ['', ...Object.keys(properties)]
		},
		availableTagsOptions() {
			return this.availableTags.map(tag => ({
				id: tag,
				label: tag,
			}))
		},
		/**
		 * Resolved success text for backwards compatibility (includes trailing period).
		 *
		 * @return {string}
		 */
		resolvedSuccessText() {
			if (this.successText) return this.successText
			return 'Schema saved successfully.'
		},
		allOfSchemaNames() {
			if (!this.schemaItem.allOf || !Array.isArray(this.schemaItem.allOf) || this.schemaItem.allOf.length === 0) {
				return []
			}

			return this.schemaItem.allOf
				.map(ref => {
					const schemaId = typeof ref === 'object' ? ref.id : ref
					const schema = this.availableSchemas.find(s => s.id === schemaId)
					return schema ? (schema.title || `Schema ${schema.id}`) : schemaId
				})
				.filter(name => name)
		},
	},
	watch: {
		item: {
			immediate: true,
			handler() {
				this.initializeSchemaItem()
			},
		},
		'schemaItem.properties': {
			handler(newProperties) {
				if (newProperties) {
					Object.keys(newProperties).forEach(key => {
						const property = newProperties[key]
						if (property) {
							// Initialize nested objects if they don't exist
							if (property.type === 'array' && !property.items) {
								this.$set(this.schemaItem.properties[key], 'items', { type: 'string' })
							}
							if (property.type === 'object' && !property.objectConfiguration) {
								this.$set(this.schemaItem.properties[key], 'objectConfiguration', { handling: 'nested-object' })
							}
							if (property.type === 'array' && property.items && property.items.type === 'object' && !property.items.objectConfiguration) {
								this.$set(this.schemaItem.properties[key].items, 'objectConfiguration', { handling: 'nested-object' })
							}

							// Convert property type from object to string
							if (property.type && typeof property.type === 'object' && property.type.id) {
								this.$set(this.schemaItem.properties[key], 'type', property.type.id)
							}

							// Convert property format from object to string
							if (property.format && typeof property.format === 'object' && property.format.id) {
								this.$set(this.schemaItem.properties[key], 'format', property.format.id)
							}

							// Convert array item type from object to string
							if (property.items && property.items.type && typeof property.items.type === 'object' && property.items.type.id) {
								this.$set(this.schemaItem.properties[key].items, 'type', property.items.type.id)
							}

							// Convert object handling from object to string
							if (property.objectConfiguration && property.objectConfiguration.handling
								&& typeof property.objectConfiguration.handling === 'object' && property.objectConfiguration.handling.id) {
								this.$set(this.schemaItem.properties[key].objectConfiguration, 'handling', property.objectConfiguration.handling.id)
							}

							// Convert register from object to ID
							if (property.objectConfiguration && property.objectConfiguration.register
								&& typeof property.objectConfiguration.register === 'object' && property.objectConfiguration.register.id) {
								this.$set(this.schemaItem.properties[key].objectConfiguration, 'register', property.objectConfiguration.register.id)
							}

							// Convert array item object handling from object to string
							if (property.items && property.items.objectConfiguration && property.items.objectConfiguration.handling
								&& typeof property.items.objectConfiguration.handling === 'object' && property.items.objectConfiguration.handling.id) {
								this.$set(this.schemaItem.properties[key].items.objectConfiguration, 'handling', property.items.objectConfiguration.handling.id)
							}

							// Convert array item register from object to ID
							if (property.items && property.items.objectConfiguration && property.items.objectConfiguration.register
								&& typeof property.items.objectConfiguration.register === 'object' && property.items.objectConfiguration.register.id) {
								this.$set(this.schemaItem.properties[key].items.objectConfiguration, 'register', property.items.objectConfiguration.register.id)
							}

							// Ensure $ref is always a string
							this.ensureRefIsString(this.schemaItem.properties, key)

							// Ensure inversedBy is always a string for regular properties
							if (property.inversedBy && typeof property.inversedBy === 'object' && property.inversedBy.id) {
								this.$set(this.schemaItem.properties[key], 'inversedBy', property.inversedBy.id)
							}

							// Ensure inversedBy is always a string for array items
							if (property.items && property.items.inversedBy && typeof property.items.inversedBy === 'object' && property.items.inversedBy.id) {
								this.$set(this.schemaItem.properties[key].items, 'inversedBy', property.items.inversedBy.id)
							}
						}
					})
				}
				this.checkPropertiesModified()
			},
			deep: true,
		},
	},
	methods: {
		findSchemaBySlug(schemaSlug) {
			if (!schemaSlug) return undefined
			return this.availableSchemas.find(schema =>
				(schema.slug && schema.slug.toLowerCase() === schemaSlug.toLowerCase())
				|| schema.id === schemaSlug
				|| schema.title === schemaSlug,
			)
		},

		ensureRefIsString(obj, key) {
			if (!obj || !key) return

			if (obj[key] && typeof obj[key].$ref === 'object' && obj[key].$ref !== null) {
				if (obj[key].$ref.id) {
					obj[key].$ref = obj[key].$ref.id
				} else {
					obj[key].$ref = ''
				}
			}

			if (obj[key] && obj[key].items && typeof obj[key].items.$ref === 'object' && obj[key].items.$ref !== null) {
				if (obj[key].items.$ref.id) {
					obj[key].items.$ref = obj[key].items.$ref.id
				} else {
					obj[key].items.$ref = ''
				}
			}
		},

		initializeSchemaItem() {
			// Reset CnTabbedFormDialog state if available (not yet mounted on first call)
			if (this.$refs.dialog) {
				this.$refs.dialog.resetDialog()
			}

			if (this.item && this.item.id) {
				this.schemaItem = {
					...this.schemaItem,
					...JSON.parse(JSON.stringify(this.item)),
				}

				// Ensure configuration object exists
				if (!this.schemaItem.configuration) {
					this.schemaItem.configuration = {
						objectNameField: '',
						objectDescriptionField: '',
						objectImageField: '',
						objectSummaryField: '',
						allowFiles: false,
						allowedTags: [],
					}
				} else {
					if (!this.schemaItem.configuration.objectNameField) {
						this.schemaItem.configuration.objectNameField = ''
					}
					if (!this.schemaItem.configuration.objectDescriptionField) {
						this.schemaItem.configuration.objectDescriptionField = ''
					}
					if (!this.schemaItem.configuration.objectImageField) {
						this.schemaItem.configuration.objectImageField = ''
					}
					if (!this.schemaItem.configuration.objectSummaryField) {
						this.schemaItem.configuration.objectSummaryField = ''
					}
					if (this.schemaItem.configuration.allowFiles === undefined) {
						this.schemaItem.configuration.allowFiles = false
					}
					if (!this.schemaItem.configuration.allowedTags) {
						this.schemaItem.configuration.allowedTags = []
					}
					if (this.schemaItem.configuration.autoPublish === undefined) {
						this.schemaItem.configuration.autoPublish = false
					}
				}

				// Ensure authorization object exists
				if (!this.schemaItem.authorization) {
					this.schemaItem.authorization = {}
				}

				// Ensure existing properties have facetable set to false by default
				Object.keys(this.schemaItem.properties || {}).forEach(key => {
					if (this.schemaItem.properties[key].facetable === undefined) {
						this.$set(this.schemaItem.properties[key], 'facetable', false)
					}

					if (this.schemaItem.properties[key].enum && Array.isArray(this.schemaItem.properties[key].enum)) {
						this.$set(this.schemaItem.properties[key], 'enum', [...this.schemaItem.properties[key].enum])
					}

					const property = this.schemaItem.properties[key]
					if (property.type === 'array' && property.items && property.items.type === 'object' && !property.items.objectConfiguration) {
						this.$set(this.schemaItem.properties[key].items, 'objectConfiguration', { handling: 'nested-object' })
					}
				})

				// Ensure all $ref values are strings and migrate old structure
				Object.keys(this.schemaItem.properties || {}).forEach(key => {
					this.ensureRefIsString(this.schemaItem.properties, key)
					this.migratePropertyToNewStructure(key)
				})

				this.originalProperties = JSON.parse(JSON.stringify(this.schemaItem.properties || {}))
			} else {
				this.schemaItem.configuration = {
					objectNameField: '',
					objectDescriptionField: '',
					objectImageField: '',
					objectSummaryField: '',
					allowFiles: false,
					allowedTags: [],
					autoPublish: false,
				}
				this.originalProperties = {}
			}
			this.propertiesModified = false
		},

		checkPropertiesModified() {
			if (!this.originalProperties) return false

			const currentProperties = JSON.stringify(this.schemaItem.properties || {})
			const originalProperties = JSON.stringify(this.originalProperties)

			this.propertiesModified = currentProperties !== originalProperties
		},

		async copyToClipboard(text) {
			try {
				await navigator.clipboard.writeText(text)
				this.isCopied = true
				setTimeout(() => { this.isCopied = false }, 2000)
			} catch (err) {
				console.error('Failed to copy text:', err)
			}
		},

		addProperty() {
			let newPropertyName = 'new'
			let counter = 1

			while (this.schemaItem.properties[newPropertyName]) {
				counter++
				newPropertyName = `new_${counter}`
			}

			this.$set(this.schemaItem.properties, newPropertyName, {
				type: 'string',
				format: '',
				title: newPropertyName,
				description: '',
				facetable: false,
			})

			this.checkPropertiesModified()
			this.selectedProperty = newPropertyName
		},

		updatePropertyKey(oldKey, newKey) {
			if (!newKey || newKey === oldKey) return
			if (this.schemaItem.properties[newKey] && newKey !== oldKey) return

			const propertyData = { ...this.schemaItem.properties[oldKey] }

			this.$set(this.schemaItem.properties, newKey, propertyData)
			this.$delete(this.schemaItem.properties, oldKey)

			this.selectedProperty = newKey
			this.checkPropertiesModified()
		},

		deleteProperty(key) {
			this.$delete(this.schemaItem.properties, key)

			if (this.selectedProperty === key) {
				this.selectedProperty = null
			}

			this.checkPropertiesModified()
		},

		copyProperty(key) {
			if (this.schemaItem.properties[key]) {
				const originalProperty = JSON.parse(JSON.stringify(this.schemaItem.properties[key]))

				let newPropertyName = `${key}_copy`
				let counter = 1

				while (this.schemaItem.properties[newPropertyName]) {
					counter++
					newPropertyName = `${key}_copy_${counter}`
				}

				const originalTitle = originalProperty.title || key
				this.$set(this.schemaItem.properties, newPropertyName, {
					...originalProperty,
					title: `${originalTitle} (copy)`,
				})

				this.checkPropertiesModified()
				this.selectedProperty = newPropertyName
			}
		},

		/**
		 * Handle confirm from CnTabbedFormDialog.
		 * Cleans schema data and emits confirm with the cleaned payload.
		 */
		handleConfirm() {
			const cleanedSchemaItem = JSON.parse(JSON.stringify(this.schemaItem))
			Object.keys(cleanedSchemaItem.properties || {}).forEach(key => {
				this.ensureRefIsString(cleanedSchemaItem.properties, key)

				if (cleanedSchemaItem.properties[key].register
					&& cleanedSchemaItem.properties[key].objectConfiguration
					&& cleanedSchemaItem.properties[key].objectConfiguration.register) {
					delete cleanedSchemaItem.properties[key].register
				}

				if (cleanedSchemaItem.properties[key].items
					&& cleanedSchemaItem.properties[key].items.register
					&& cleanedSchemaItem.properties[key].items.objectConfiguration
					&& cleanedSchemaItem.properties[key].items.objectConfiguration.register) {
					delete cleanedSchemaItem.properties[key].items.register
				}
			})

			this.$emit('confirm', cleanedSchemaItem)
		},

		/**
		 * Set the result of the save operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData - result data
		 * @public
		 */
		setResult(resultData) {
			this.$refs.dialog.setResult(resultData)
			if (resultData.success) {
				this.originalProperties = JSON.parse(JSON.stringify(this.schemaItem.properties || {}))
				this.propertiesModified = false
			}
		},

		migratePropertyToNewStructure(key) {
			if (!this.schemaItem.properties[key]) return

			const property = this.schemaItem.properties[key]

			if (property.$ref && property.register && !property.objectConfiguration?.register) {
				if (!property.objectConfiguration) {
					this.$set(this.schemaItem.properties[key], 'objectConfiguration', { handling: 'related-object' })
				}

				const registerId = typeof property.register === 'object' && property.register.id
					? property.register.id
					: property.register

				this.$set(this.schemaItem.properties[key].objectConfiguration, 'register', registerId)

				if (property.$ref) {
					let schemaSlug = property.$ref
					if (schemaSlug.includes('/')) {
						schemaSlug = schemaSlug.substring(schemaSlug.lastIndexOf('/') + 1)
					}

					const referencedSchema = this.findSchemaBySlug(schemaSlug)
					if (referencedSchema) {
						this.$set(this.schemaItem.properties[key].objectConfiguration, 'schema', referencedSchema.id)
					}
				}
			}

			if (property.items && property.items.$ref && property.items.register && !property.items.objectConfiguration?.register) {
				if (!property.items.objectConfiguration) {
					this.$set(this.schemaItem.properties[key].items, 'objectConfiguration', { handling: 'related-object' })
				}

				const registerId = typeof property.items.register === 'object' && property.items.register.id
					? property.items.register.id
					: property.items.register

				this.$set(this.schemaItem.properties[key].items.objectConfiguration, 'register', registerId)

				if (property.items.$ref) {
					let schemaSlug = property.items.$ref
					if (schemaSlug.includes('/')) {
						schemaSlug = schemaSlug.substring(schemaSlug.lastIndexOf('/') + 1)
					}

					const referencedSchema = this.findSchemaBySlug(schemaSlug)
					if (referencedSchema) {
						this.$set(this.schemaItem.properties[key].items.objectConfiguration, 'schema', referencedSchema.id)
					}
				}
			}
		},
	},
}
</script>
