<template>
	<NcActions>
		<NcActionCaption name="Actions" />
		<NcActionButton :aria-label="'Copy ' + propertyKey" @click="$emit('copy-property', propertyKey)">
			<template #icon>
				<ContentCopy :size="16" />
			</template>
			Copy Property
		</NcActionButton>
		<NcActionButton :aria-label="'Delete ' + propertyKey" @click="$emit('delete-property', propertyKey)">
			<template #icon>
				<TrashCanOutline :size="16" />
			</template>
			Delete Property
		</NcActionButton>

		<NcActionSeparator />
		<NcActionCaption name="General" />
		<NcActionCheckbox
			:checked="isPropertyRequired(schema, propertyKey)"
			@update:checked="updatePropertyRequired(propertyKey, $event)">
			Required
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="property.immutable || false"
			@update:checked="updatePropertySetting(propertyKey, 'immutable', $event)">
			Immutable
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="property.deprecated || false"
			@update:checked="updatePropertySetting(propertyKey, 'deprecated', $event)">
			Deprecated
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="property.visible !== false"
			@update:checked="updatePropertySetting(propertyKey, 'visible', $event)">
			Visible to end users
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="property.hideOnCollection || false"
			@update:checked="updatePropertySetting(propertyKey, 'hideOnCollection', $event)">
			Hide in collection view
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="property.hideOnForm || false"
			@update:checked="updatePropertySetting(propertyKey, 'hideOnForm', $event)">
			Hide in form view
		</NcActionCheckbox>
		<NcActionCheckbox
			:checked="isFacetableEnabled(property)"
			@update:checked="toggleFacetable(propertyKey, $event)">
			Facetable
		</NcActionCheckbox>
		<NcActionCheckbox
			v-if="isFacetableEnabled(property)"
			:checked="getFacetConfig(property).aggregated !== false"
			@update:checked="updateFacetConfigField(propertyKey, property, 'aggregated', $event)">
			Aggregated across schemas
		</NcActionCheckbox>
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).title || ''"
			label="Facet Title"
			@update:value="updateFacetConfigField(propertyKey, property, 'title', $event)" />
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).description || ''"
			label="Facet Description"
			@update:value="updateFacetConfigField(propertyKey, property, 'description', $event)" />
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).order != null ? String(getFacetConfig(property).order) : ''"
			type="number"
			label="Facet Order"
			@update:value="updateFacetConfigField(propertyKey, property, 'order', $event)" />

		<NcActionSeparator />
		<NcActionCaption name="Properties" />
		<NcActionInput
			:value="property.title || ''"
			label="Title"
			@update:value="updatePropertySetting(propertyKey, 'title', $event)" />
		<NcActionInput
			v-if="getFormatOptionsForType(property.type).length > 0"
			v-model="schema.properties[propertyKey].format"
			type="multiselect"
			:options="getFormatOptionsForType(property.type)"
			input-label="Format"
			label="Format" />
		<NcActionInput
			:value="property.description || ''"
			label="Description"
			@update:value="updatePropertySetting(propertyKey, 'description', $event)" />
		<NcActionInput
			:value="property.example || ''"
			label="Example"
			@update:value="updatePropertySetting(propertyKey, 'example', $event)" />
		<NcActionInput
			:value="property.order || 0"
			type="number"
			label="Order"
			@update:value="updatePropertySetting(propertyKey, 'order', Number($event))" />

		<!-- Const and Enum Configuration -->
		<NcActionSeparator />
		<NcActionCaption name="Value Constraints" />
		<NcActionInput
			:value="property.const || ''"
			label="Constant"
			@update:value="updatePropertySetting(propertyKey, 'const', $event === '' ? undefined : $event)" />
		<template v-if="property.enum && property.enum.length > 0">
			<NcActionCaption :name="'Current Enum Values (' + property.enum.length + ')'" />
			<NcActionButton
				v-for="(enumValue, index) in property.enum"
				:key="`enum-chip-${index}-${enumValue}`"
				:aria-label="'Remove ' + enumValue"
				class="cn-schema-form__enum-action-chip"
				@click="removeEnumValue(propertyKey, index)">
				<template #icon>
					<Close :size="16" />
				</template>
				{{ String(enumValue) }}
			</NcActionButton>
		</template>
		<NcActionInput
			:value="enumInputValue"
			label="Add Enum Value"
			placeholder="Type value and press Enter"
			@update:value="enumInputValue = $event"
			@keydown.enter.prevent="addEnumValueAndClear(propertyKey)" />

		<!-- Default Value Configuration -->
		<NcActionSeparator />
		<NcActionCaption name="Default Value Configuration" />
		<template v-if="property.type === 'string'">
			<NcActionInput
				:value="property.default || ''"
				label="Default Value"
				@update:value="updatePropertySetting(propertyKey, 'default', $event === '' ? undefined : $event)" />
		</template>
		<template v-else-if="property.type === 'number' || property.type === 'integer'">
			<NcActionInput
				:value="property.default || 0"
				type="number"
				label="Default Value"
				@update:value="updatePropertySetting(propertyKey, 'default', Number($event))" />
		</template>
		<template v-else-if="property.type === 'boolean'">
			<NcActionCheckbox
				:checked="property.default === true"
				@update:checked="updatePropertySetting(propertyKey, 'default', $event)">
				Default Value
			</NcActionCheckbox>
		</template>
		<template v-else-if="property.type === 'array' && property.items && property.items.type === 'string'">
			<NcActionInput
				:value="getArrayDefaultAsString(property.default)"
				label="Default Values (comma separated)"
				placeholder="value1, value2, value3"
				@update:value="updateArrayDefault(propertyKey, $event)" />
		</template>
		<template v-else-if="property.type === 'object'">
			<NcActionInput
				:value="typeof property.default === 'object' ? JSON.stringify(property.default, null, 2) : (property.default || '{}')"
				label="Default Value (JSON)"
				@update:value="updateObjectDefault(propertyKey, $event)" />
		</template>

		<!-- Default Behavior Toggle -->
		<template v-if="property.default !== undefined && property.default !== null && property.default !== ''">
			<NcActionCheckbox
				:checked="property.defaultBehavior === 'falsy'"
				@update:checked="updatePropertySetting(propertyKey, 'defaultBehavior', $event ? 'falsy' : 'false')">
				Apply default for empty values
			</NcActionCheckbox>
			<NcActionCaption
				v-if="property.defaultBehavior === 'falsy'"
				name="ℹ️ Default will be applied when value is missing, null, or empty string"
				style="color: var(--color-text-lighter); font-size: 11px;" />
			<NcActionCaption
				v-else
				name="ℹ️ Default will only be applied when value is missing or null"
				style="color: var(--color-text-lighter); font-size: 11px;" />
		</template>

		<!-- Type-specific configurations -->
		<template v-if="property.type === 'string'">
			<NcActionSeparator />
			<NcActionCaption name="String Configuration" />
			<NcActionInput
				:value="property.minLength || 0"
				type="number"
				label="Minimum Length"
				@update:value="updatePropertySetting(propertyKey, 'minLength', Number($event))" />
			<NcActionInput
				:value="property.maxLength || 0"
				type="number"
				label="Maximum Length"
				@update:value="updatePropertySetting(propertyKey, 'maxLength', Number($event))" />
			<NcActionInput
				:value="property.pattern || ''"
				label="Pattern (regex)"
				@update:value="updatePropertySetting(propertyKey, 'pattern', $event)" />
		</template>

		<template v-if="property.type === 'number' || property.type === 'integer'">
			<NcActionSeparator />
			<NcActionCaption name="Number Configuration" />
			<NcActionInput
				:value="property.minimum || 0"
				type="number"
				label="Minimum Value"
				@update:value="updatePropertySetting(propertyKey, 'minimum', Number($event))" />
			<NcActionInput
				:value="property.maximum || 0"
				type="number"
				label="Maximum Value"
				@update:value="updatePropertySetting(propertyKey, 'maximum', Number($event))" />
			<NcActionInput
				:value="property.multipleOf || 0"
				type="number"
				label="Multiple Of"
				@update:value="updatePropertySetting(propertyKey, 'multipleOf', Number($event))" />
			<NcActionCheckbox
				:checked="property.exclusiveMin || false"
				@update:checked="updatePropertySetting(propertyKey, 'exclusiveMin', $event)">
				Exclusive Minimum
			</NcActionCheckbox>
			<NcActionCheckbox
				:checked="property.exclusiveMax || false"
				@update:checked="updatePropertySetting(propertyKey, 'exclusiveMax', $event)">
				Exclusive Maximum
			</NcActionCheckbox>
		</template>

		<template v-if="property.type === 'array'">
			<NcActionSeparator />
			<NcActionCaption name="Array Configuration" />
			<NcActionInput
				v-model="schema.properties[propertyKey].items.type"
				type="multiselect"
				:options="[
					{ id: 'string', label: 'String' },
					{ id: 'number', label: 'Number' },
					{ id: 'integer', label: 'Integer' },
					{ id: 'object', label: 'Object' },
					{ id: 'boolean', label: 'Boolean' },
					{ id: 'file', label: 'File' }
				]"
				input-label="Array Item Type"
				label="Array Item Type" />
			<NcActionInput
				:value="property.minItems || 0"
				type="number"
				label="Minimum Items"
				@update:value="updatePropertySetting(propertyKey, 'minItems', Number($event))" />
			<NcActionInput
				:value="property.maxItems || 0"
				type="number"
				label="Maximum Items"
				@update:value="updatePropertySetting(propertyKey, 'maxItems', Number($event))" />

			<!-- Show object configuration for array items when item type is object -->
			<template v-if="property.items && property.items.type === 'object'">
				<NcActionSeparator />
				<NcActionCaption name="Array Item Object Configuration" />
				<NcActionInput
					v-model="schema.properties[propertyKey].items.objectConfiguration.handling"
					type="multiselect"
					:options="objectHandlingOptions"
					input-label="Object Handling"
					label="Object Handling" />
				<NcActionInput
					:value="schema.properties[propertyKey].items.$ref"
					type="multiselect"
					:options="availableSchemas"
					input-label="Schema Reference"
					label="Schema Reference"
					@update:value="updateArrayItemSchemaReference(propertyKey, $event)" />
				<NcActionCaption
					v-if="isArrayItemRefInvalid(propertyKey)"
					:name="`⚠️ Invalid Schema Reference: Expected string, got number (${schema.properties[propertyKey].items.$ref}). This will be sent to backend as-is.`"
					style="color: var(--color-error); font-weight: bold;" />
				<NcActionInput
					:value="getArrayItemRegisterValue(propertyKey)"
					type="multiselect"
					:options="availableRegisters"
					input-label="Register"
					label="Register (Required when schema is selected)"
					:required="!!schema.properties[propertyKey].items.$ref"
					:disabled="!schema.properties[propertyKey].items.$ref"
					@update:value="updateArrayItemRegisterReference(propertyKey, $event)" />
				<NcActionInput
					v-model="schema.properties[propertyKey].items.inversedBy"
					type="multiselect"
					:options="getInversedByOptionsForArrayItems(propertyKey)"
					input-label="Inversed By Property"
					label="Inversed By"
					:disabled="!schema.properties[propertyKey].items.$ref"
					@update:value="updateInversedByForArrayItems(propertyKey, $event)" />
				<NcActionInput
					:value="getArrayItemQueryParams(propertyKey)"
					label="Query Parameters"
					placeholder="e.g. gemmaType=referentiecomponent&_extend=aanbevolenStandaarden"
					@update:value="updateArrayItemQueryParams(propertyKey, $event)" />
				<NcActionCheckbox
					:checked="property.items.writeBack || false"
					@update:checked="updateArrayItemObjectConfigurationSetting(propertyKey, 'writeBack', $event)">
					Write Back
				</NcActionCheckbox>
				<NcActionCheckbox
					:checked="property.items.removeAfterWriteBack || false"
					@update:checked="updateArrayItemObjectConfigurationSetting(propertyKey, 'removeAfterWriteBack', $event)">
					Remove After Write Back
				</NcActionCheckbox>
				<NcActionCheckbox
					:checked="property.items.cascadeDelete || false"
					@update:checked="updateArrayItemObjectConfigurationSetting(propertyKey, 'cascadeDelete', $event)">
					Cascade Delete
				</NcActionCheckbox>
			</template>
		</template>

		<template v-if="property.type === 'object'">
			<NcActionSeparator />
			<NcActionCaption name="Object Configuration" />
			<NcActionInput
				v-model="schema.properties[propertyKey].objectConfiguration.handling"
				type="multiselect"
				:options="objectHandlingOptions"
				input-label="Object Handling"
				label="Object Handling" />
			<NcActionInput
				:value="schema.properties[propertyKey].$ref"
				type="multiselect"
				:options="availableSchemas"
				input-label="Schema Reference"
				label="Schema Reference"
				@update:value="updateSchemaReference(propertyKey, $event)" />
			<NcActionCaption
				v-if="isRefInvalid(propertyKey)"
				:name="`⚠️ Invalid Schema Reference: Expected string, got number (${schema.properties[propertyKey].$ref}). This will be sent to backend as-is.`"
				style="color: var(--color-error); font-weight: bold;" />
			<NcActionInput
				:value="getRegisterValue(propertyKey)"
				type="multiselect"
				:options="availableRegisters"
				input-label="Register"
				label="Register (Required when schema is selected)"
				:required="!!schema.properties[propertyKey].$ref"
				:disabled="!schema.properties[propertyKey].$ref"
				@update:value="updateRegisterReference(propertyKey, $event)" />
			<NcActionInput
				v-model="schema.properties[propertyKey].inversedBy"
				type="multiselect"
				:options="getInversedByOptions(propertyKey)"
				input-label="Inversed By Property"
				label="Inversed By"
				:disabled="!schema.properties[propertyKey].$ref"
				@update:value="updateInversedBy(propertyKey, $event)" />
			<NcActionInput
				:value="getObjectQueryParams(propertyKey)"
				label="Query Parameters"
				placeholder="e.g. gemmaType=referentiecomponent&_extend=aanbevolenStandaarden"
				@update:value="updateObjectQueryParams(propertyKey, $event)" />
			<NcActionCheckbox
				:checked="property.writeBack || false"
				@update:checked="updatePropertySetting(propertyKey, 'writeBack', $event)">
				Write Back
			</NcActionCheckbox>
			<NcActionCheckbox
				:checked="property.removeAfterWriteBack || false"
				@update:checked="updatePropertySetting(propertyKey, 'removeAfterWriteBack', $event)">
				Remove After Write Back
			</NcActionCheckbox>
			<NcActionCheckbox
				:checked="property.cascadeDelete || false"
				@update:checked="updatePropertySetting(propertyKey, 'cascadeDelete', $event)">
				Cascade Delete
			</NcActionCheckbox>
		</template>

		<!-- File Configuration -->
		<template v-if="property.type === 'file' || (property.type === 'array' && property.items && property.items.type === 'file')">
			<NcActionSeparator />
			<NcActionCaption name="File Configuration" />
			<NcActionCheckbox
				:checked="getFilePropertySetting(propertyKey, 'autoPublish')"
				@update:checked="updateFilePropertySetting(propertyKey, 'autoPublish', $event)">
				Auto-Publish Files
			</NcActionCheckbox>
			<NcActionCaption
				v-if="getFilePropertySetting(propertyKey, 'autoPublish')"
				name="ℹ️ Files uploaded to this property will be automatically publicly shared"
				style="color: var(--color-text-lighter); font-size: 11px;" />
			<NcActionInput
				:value="(property.allowedTypes || []).join(', ')"
				label="Allowed MIME Types (comma separated)"
				placeholder="image/png, image/jpeg, application/pdf"
				@update:value="updateFileProperty(propertyKey, 'allowedTypes', $event)" />
			<NcActionInput
				:value="property.maxSize || ''"
				type="number"
				label="Maximum File Size (bytes)"
				placeholder="5242880"
				@update:value="updateFileProperty(propertyKey, 'maxSize', $event)" />
			<NcActionInput
				:value="getFilePropertyTags(propertyKey, 'allowedTags')"
				type="multiselect"
				:options="availableTagsOptions"
				input-label="Allowed Tags"
				label="Allowed Tags (select from available tags)"
				multiple
				@update:value="updateFilePropertyTags(propertyKey, 'allowedTags', $event)" />
			<NcActionInput
				:value="getFilePropertyTags(propertyKey, 'autoTags')"
				type="multiselect"
				:options="availableTagsOptions"
				input-label="Auto Tags"
				label="Auto Tags (automatically applied to uploaded files)"
				multiple
				@update:value="updateFilePropertyTags(propertyKey, 'autoTags', $event)" />
		</template>

		<!-- Property-level Table Configuration -->
		<NcActionSeparator />
		<NcActionCaption name="Table" />
		<NcActionCheckbox
			:checked="getPropertyTableSetting(propertyKey, 'default')"
			@update:checked="updatePropertyTableSetting(propertyKey, 'default', $event)">
			Default
		</NcActionCheckbox>

		<!-- Property-level Security Configuration -->
		<NcActionSeparator />
		<NcActionCaption name="Property Security" />

		<template v-if="!loadingGroups">
			<!-- Current Property Permissions List -->
			<div v-for="permission in getPropertyPermissionsList(propertyKey)" :key="`${propertyKey}-perm-text-${permission.group}`">
				<NcActionText
					class="cn-schema-form__property-permission-text">
					{{ permission.group }} ({{ permission.rights }})
				</NcActionText>
				<NcActionButton
					v-if="permission.groupId !== 'admin'"
					:key="`${propertyKey}-perm-remove-${permission.group}`"
					:aria-label="`Remove ${permission.group} permissions`"
					class="cn-schema-form__property-permission-remove-btn"
					@click="removePropertyGroupPermissions(propertyKey, permission.group)">
					<template #icon>
						<Close :size="16" />
					</template>
					Remove {{ permission.group }}
				</NcActionButton>
			</div>

			<!-- Show inheritance status if no specific permissions -->
			<NcActionCaption
				v-if="!hasPropertyAnyPermissions(propertyKey)"
				name="📄 Inherits schema permissions"
				style="color: var(--color-success); font-size: 11px;" />

			<!-- Add Permission Interface -->
			<NcActionSeparator />
			<NcActionInput
				v-model="propertyNewPermissionGroup"
				type="multiselect"
				:options="getAvailableGroupsForProperty()"
				input-label="Group"
				label="Add Group Permission"
				placeholder="Select group..." />

			<template v-if="propertyNewPermissionGroup">
				<NcActionCaption name="Select Permissions:" />
				<NcActionCheckbox
					:checked="propertyNewPermissionCreate"
					@update:checked="propertyNewPermissionCreate = $event">
					Create (C)
				</NcActionCheckbox>
				<NcActionCheckbox
					:checked="propertyNewPermissionRead"
					@update:checked="propertyNewPermissionRead = $event">
					Read (R)
				</NcActionCheckbox>
				<NcActionCheckbox
					:checked="propertyNewPermissionUpdate"
					@update:checked="propertyNewPermissionUpdate = $event">
					Update (U)
				</NcActionCheckbox>
				<NcActionCheckbox
					:checked="propertyNewPermissionDelete"
					@update:checked="propertyNewPermissionDelete = $event">
					Delete (D)
				</NcActionCheckbox>

				<NcActionButton
					v-if="hasAnyPropertyNewPermissionSelected()"
					@click="addPropertyGroupPermissions(propertyKey)">
					<template #icon>
						<Plus :size="16" />
					</template>
					Add Permission
				</NcActionButton>
			</template>
		</template>
		<template v-else>
			<NcActionCaption name="Loading groups..." />
		</template>
	</NcActions>
</template>

<script>
import {
	NcActions,
	NcActionButton,
	NcActionCheckbox,
	NcActionInput,
	NcActionCaption,
	NcActionSeparator,
	NcActionText,
} from '@nextcloud/vue'

import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'

/**
 * CnSchemaPropertyActions — NcActions dropdown for a single schema property.
 *
 * Renders all configuration sections (General, Properties, Value Constraints,
 * Default Value, type-specific configs, File, Table, Security) inside an
 * NcActions popover menu.
 *
 * Mutates schemaItem directly (passed by reference from parent).
 *
 * @event copy-property Emitted when copy is clicked. Payload: property key.
 * @event delete-property Emitted when delete is clicked. Payload: property key.
 */
export default {
	name: 'CnSchemaPropertyActions',
	components: {
		NcActions,
		NcActionButton,
		NcActionCheckbox,
		NcActionInput,
		NcActionCaption,
		NcActionSeparator,
		NcActionText,
		ContentCopy,
		TrashCanOutline,
		Close,
		Plus,
	},
	props: {
		/** The property name/key in the schema */
		propertyKey: { type: String, required: true },
		/** The property definition object */
		property: { type: Object, required: true },
		/** Full schemaItem (for direct mutations and required array checks) */
		schemaItem: { type: Object, required: true },
		/** Original properties snapshot for table setting comparison */
		originalProperties: { type: Object, default: () => ({}) },
		/** Available schemas for $ref selects */
		availableSchemas: { type: Array, default: () => [] },
		/** Available registers for register selects */
		availableRegisters: { type: Array, default: () => [] },
		/** Available tags for file property configuration, pre-mapped to [{id, label}] */
		availableTagsOptions: { type: Array, default: () => [] },
		/** User groups for property-level RBAC */
		userGroups: { type: Array, default: () => [] },
		/** Filtered/sorted user groups (excludes admin/public) */
		sortedUserGroups: { type: Array, default: () => [] },
		/** Whether user groups are still loading */
		loadingGroups: { type: Boolean, default: false },
	},
	data() {
		return {
			enumInputValue: '',
			propertyNewPermissionGroup: null,
			propertyNewPermissionCreate: false,
			propertyNewPermissionRead: false,
			propertyNewPermissionUpdate: false,
			propertyNewPermissionDelete: false,
			objectHandlingOptions: [
				{ id: 'nested-object', label: 'Nested Object' },
				{ id: 'related-object', label: 'Related Object' },
				{ id: 'nested-schema', label: 'Nested Schema' },
				{ id: 'related-schema', label: 'Related Schema' },
				{ id: 'uri', label: 'URI' },
			],
		}
	},
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
	},
	methods: {
		// --- General helpers ---

		isPropertyRequired(schema, key) {
			const isInSchemaRequired = schema.required && schema.required.includes(key)
			const hasPropertyRequired = schema.properties && schema.properties[key] && schema.properties[key].required === true
			return isInSchemaRequired || hasPropertyRequired
		},

		findSchemaBySlug(schemaSlug) {
			if (!schemaSlug) return undefined
			return this.availableSchemas.find(schema =>
				(schema.slug && schema.slug.toLowerCase() === schemaSlug.toLowerCase())
				|| schema.id === schemaSlug
				|| schema.title === schemaSlug,
			)
		},

		checkPropertiesModified() {
			// Bubble up to parent — the parent's deep watcher handles this
			// This is a no-op placeholder; modifications are detected by the parent's watcher
		},

		// --- Property setting updates ---

		updatePropertySetting(key, setting, value) {
			if (this.schema.properties[key]) {
				const settingValue = typeof value === 'object' && value?.id ? value.id : value
				this.$set(this.schema.properties[key], setting, settingValue)
				this.ensureRefIsString(this.schema.properties, key)
			}
		},

		updatePropertyRequired(key, isRequired) {
			if (this.schema.properties[key]) {
				if (isRequired) {
					this.$set(this.schema.properties[key], 'required', true)
				} else {
					this.$delete(this.schema.properties[key], 'required')
				}
			}

			if (!this.schema.required) {
				this.$set(this.schema, 'required', [])
			}

			const currentRequired = [...this.schema.required]
			if (isRequired && !currentRequired.includes(key)) {
				currentRequired.push(key)
			} else if (!isRequired && currentRequired.includes(key)) {
				const index = currentRequired.indexOf(key)
				currentRequired.splice(index, 1)
			}

			this.schema.required = currentRequired
		},

		// --- Facet ---

		isFacetableEnabled(property) {
			return property.facetable === true
				|| (typeof property.facetable === 'object' && property.facetable !== null)
		},

		getFacetConfig(property) {
			if (typeof property.facetable === 'object' && property.facetable !== null) {
				return {
					aggregated: property.facetable.aggregated ?? true,
					title: property.facetable.title ?? '',
					description: property.facetable.description ?? '',
					order: property.facetable.order ?? null,
				}
			}
			return { aggregated: true, title: '', description: '', order: null }
		},

		toggleFacetable(key, enabled) {
			if (enabled) {
				this.$set(this.schema.properties[key], 'facetable', true)
			} else {
				this.$set(this.schema.properties[key], 'facetable', false)
			}
		},

		updateFacetConfigField(key, property, field, value) {
			const config = this.getFacetConfig(property)

			if (field === 'aggregated') {
				config.aggregated = value
			} else if (field === 'order') {
				config.order = value !== '' && value != null ? Number(value) : null
			} else {
				config[field] = value
			}

			const hasCustomConfig = !config.aggregated
				|| (config.title && config.title.trim())
				|| (config.description && config.description.trim())
				|| (config.order != null)

			if (hasCustomConfig) {
				this.$set(this.schema.properties[key], 'facetable', {
					aggregated: config.aggregated,
					title: config.title?.trim() || null,
					description: config.description?.trim() || null,
					order: config.order,
				})
			} else {
				this.$set(this.schema.properties[key], 'facetable', true)
			}
		},

		// --- Format options ---

		getFormatOptionsForType(type) {
			const formatMap = {
				string: [
					{ id: 'text', label: 'Text' },
					{ id: 'markdown', label: 'Markdown' },
					{ id: 'html', label: 'HTML' },
					{ id: 'date-time', label: 'Date Time' },
					{ id: 'date', label: 'Date' },
					{ id: 'time', label: 'Time' },
					{ id: 'duration', label: 'Duration' },
					{ id: 'email', label: 'Email' },
					{ id: 'idn-email', label: 'IDN Email' },
					{ id: 'hostname', label: 'Hostname' },
					{ id: 'idn-hostname', label: 'IDN Hostname' },
					{ id: 'ipv4', label: 'IPv4' },
					{ id: 'ipv6', label: 'IPv6' },
					{ id: 'uri', label: 'URI' },
					{ id: 'uri-reference', label: 'URI Reference' },
					{ id: 'iri', label: 'IRI' },
					{ id: 'iri-reference', label: 'IRI Reference' },
					{ id: 'uuid', label: 'UUID' },
					{ id: 'uri-template', label: 'URI Template' },
					{ id: 'json-pointer', label: 'JSON Pointer' },
					{ id: 'relative-json-pointer', label: 'Relative JSON Pointer' },
					{ id: 'regex', label: 'Regex' },
					{ id: 'binary', label: 'Binary' },
					{ id: 'byte', label: 'Byte' },
					{ id: 'password', label: 'Password' },
					{ id: 'rsin', label: 'RSIN' },
					{ id: 'kvk', label: 'KVK' },
					{ id: 'bsn', label: 'BSN' },
					{ id: 'oidn', label: 'OIDN' },
					{ id: 'telephone', label: 'Telephone' },
					{ id: 'accessUrl', label: 'Access URL' },
					{ id: 'shareUrl', label: 'Share URL' },
					{ id: 'downloadUrl', label: 'Download URL' },
					{ id: 'extension', label: 'Extension' },
					{ id: 'filename', label: 'Filename' },
					{ id: 'semver', label: 'Semantic Version' },
					{ id: 'url', label: 'URL' },
					{ id: 'color', label: 'Color' },
					{ id: 'color-hex', label: 'Color Hex' },
					{ id: 'color-hex-alpha', label: 'Color Hex Alpha' },
					{ id: 'color-rgb', label: 'Color RGB' },
					{ id: 'color-rgba', label: 'Color RGBA' },
					{ id: 'color-hsl', label: 'Color HSL' },
					{ id: 'color-hsla', label: 'Color HSLA' },
				],
				number: [],
				integer: [],
				boolean: [],
				array: [],
				object: [],
			}
			return formatMap[type] || []
		},

		// --- Enum ---

		addEnumValue(key, value) {
			if (!value || !value.trim()) return

			const trimmedValue = value.trim()

			if (this.schema.properties[key]) {
				if (!this.schema.properties[key].enum) {
					this.$set(this.schema.properties[key], 'enum', [])
				}

				if (!this.schema.properties[key].enum.includes(trimmedValue)) {
					const newEnum = [...this.schema.properties[key].enum, trimmedValue]
					this.$set(this.schema.properties[key], 'enum', newEnum)
				}
			}
		},

		addEnumValueAndClear(key) {
			if (this.enumInputValue && this.enumInputValue.trim()) {
				this.addEnumValue(key, this.enumInputValue)
				this.enumInputValue = ''
			}
		},

		removeEnumValue(key, index) {
			if (this.schema.properties[key] && this.schema.properties[key].enum) {
				const newEnum = this.schema.properties[key].enum.filter((_, i) => i !== index)

				if (newEnum.length === 0) {
					this.$delete(this.schema.properties[key], 'enum')
				} else {
					this.$set(this.schema.properties[key], 'enum', newEnum)
				}
			}
		},

		// --- Default values ---

		getArrayDefaultAsString(defaultValue) {
			if (!defaultValue || !Array.isArray(defaultValue)) {
				return ''
			}
			return defaultValue.join(', ')
		},

		updateArrayDefault(key, value) {
			if (!this.schema.properties[key]) return

			if (!value || value.trim() === '') {
				this.$set(this.schema.properties[key], 'default', undefined)
			} else {
				const arrayValues = value.split(',').map(item => item.trim()).filter(item => item !== '')
				this.$set(this.schema.properties[key], 'default', arrayValues)
			}
		},

		updateObjectDefault(key, value) {
			if (!this.schema.properties[key]) return

			if (!value || value.trim() === '' || value.trim() === '{}') {
				this.$set(this.schema.properties[key], 'default', undefined)
				return
			}

			try {
				const parsedValue = JSON.parse(value)
				this.$set(this.schema.properties[key], 'default', parsedValue)
			} catch (e) {
				console.warn('Invalid JSON for default value:', e.message)
			}
		},

		// --- Schema references ---

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

		isRefInvalid(key) {
			const property = this.schema.properties[key]
			if (!property || !property.$ref) return false
			const rawRef = typeof property.$ref === 'object' ? property.$ref.id : property.$ref
			return typeof rawRef === 'number'
		},

		isArrayItemRefInvalid(key) {
			const property = this.schema.properties[key]
			if (!property || !property.items || !property.items.$ref) return false
			const rawRef = typeof property.items.$ref === 'object' ? property.items.$ref.id : property.items.$ref
			return typeof rawRef === 'number'
		},

		updateSchemaReference(key, value) {
			if (!this.schema.properties[key]) return

			const schemaRef = typeof value === 'object' && value?.id ? value.id : value
			this.$set(this.schema.properties[key], '$ref', schemaRef)

			if (!this.schema.properties[key].objectConfiguration) {
				this.$set(this.schema.properties[key], 'objectConfiguration', { handling: 'related-object' })
			}

			if (schemaRef) {
				let schemaSlug = schemaRef
				if (schemaRef.includes('/')) {
					schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
				}

				const referencedSchema = this.findSchemaBySlug(schemaSlug)
				if (referencedSchema) {
					this.$set(this.schema.properties[key].objectConfiguration, 'schema', referencedSchema.id)
				}

				if (this.schema.properties[key].register && !this.schema.properties[key].objectConfiguration.register) {
					const oldRegister = this.schema.properties[key].register
					const registerId = typeof oldRegister === 'object' && oldRegister.id ? oldRegister.id : oldRegister
					this.$set(this.schema.properties[key].objectConfiguration, 'register', registerId)
				}
			} else {
				this.$delete(this.schema.properties[key].objectConfiguration, 'schema')
				this.$delete(this.schema.properties[key].objectConfiguration, 'register')
			}
		},

		updateArrayItemSchemaReference(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			const schemaRef = typeof value === 'object' && value?.id ? value.id : value
			this.$set(this.schema.properties[key].items, '$ref', schemaRef)

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.$set(this.schema.properties[key].items, 'objectConfiguration', { handling: 'related-object' })
			}

			if (schemaRef) {
				let schemaSlug = schemaRef
				if (schemaRef.includes('/')) {
					schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
				}

				const referencedSchema = this.findSchemaBySlug(schemaSlug)
				if (referencedSchema) {
					this.$set(this.schema.properties[key].items.objectConfiguration, 'schema', referencedSchema.id)
				}
			} else {
				this.$delete(this.schema.properties[key].items.objectConfiguration, 'schema')
				this.$delete(this.schema.properties[key].items.objectConfiguration, 'register')
			}
		},

		// --- Register references ---

		updateRegisterReference(key, value) {
			if (!this.schema.properties[key]) return

			if (!this.schema.properties[key].objectConfiguration) {
				this.$set(this.schema.properties[key], 'objectConfiguration', { handling: 'related-object' })
			}

			const registerId = typeof value === 'object' && value?.id ? value.id : value

			if (registerId) {
				this.$set(this.schema.properties[key].objectConfiguration, 'register', registerId)
				if (this.schema.properties[key].register) {
					this.$delete(this.schema.properties[key], 'register')
				}
			} else {
				this.$delete(this.schema.properties[key].objectConfiguration, 'register')
			}
		},

		updateArrayItemRegisterReference(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.$set(this.schema.properties[key].items, 'objectConfiguration', { handling: 'related-object' })
			}

			const registerId = typeof value === 'object' && value?.id ? value.id : value

			if (registerId) {
				this.$set(this.schema.properties[key].items.objectConfiguration, 'register', registerId)
			} else {
				this.$delete(this.schema.properties[key].items.objectConfiguration, 'register')
			}
		},

		getRegisterValue(key) {
			if (!this.schema.properties[key]) return null

			const property = this.schema.properties[key]
			if (property.objectConfiguration && property.objectConfiguration.register !== undefined) {
				return property.objectConfiguration.register
			}
			if (property.register !== undefined) {
				return property.register
			}
			return null
		},

		getArrayItemRegisterValue(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return null

			const items = this.schema.properties[key].items
			if (items.objectConfiguration && items.objectConfiguration.register !== undefined) {
				return items.objectConfiguration.register
			}
			if (items.register !== undefined) {
				return items.register
			}
			return null
		},

		// --- InversedBy ---

		getInversedByOptions(key) {
			const property = this.schema.properties[key]
			if (!property || !property.$ref) return []

			const rawRef = typeof property.$ref === 'object' ? property.$ref.id : property.$ref
			if (typeof rawRef === 'number') return []

			const schemaRef = String(rawRef)
			let schemaSlug = schemaRef
			if (schemaRef.includes('/')) {
				schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
			}

			const referencedSchema = this.findSchemaBySlug(schemaSlug)
			if (!referencedSchema || !referencedSchema.properties) return []

			return Object.keys(referencedSchema.properties).map(propKey => ({
				id: propKey,
				label: referencedSchema.properties[propKey].title || propKey,
			}))
		},

		getInversedByOptionsForArrayItems(key) {
			const property = this.schema.properties[key]
			if (!property || !property.items || !property.items.$ref) return []

			const rawRef = typeof property.items.$ref === 'object' ? property.items.$ref.id : property.items.$ref
			if (typeof rawRef === 'number') return []

			const schemaRef = String(rawRef)
			let schemaSlug = schemaRef
			if (schemaRef.includes('/')) {
				schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
			}

			const referencedSchema = this.findSchemaBySlug(schemaSlug)
			if (!referencedSchema || !referencedSchema.properties) return []

			return Object.keys(referencedSchema.properties).map(propKey => ({
				id: propKey,
				label: referencedSchema.properties[propKey].title || propKey,
			}))
		},

		updateInversedBy(key, value) {
			if (this.schema.properties[key]) {
				const inversedByValue = typeof value === 'object' && value?.id ? value.id : value
				this.$set(this.schema.properties[key], 'inversedBy', inversedByValue)
			}
		},

		updateInversedByForArrayItems(key, value) {
			if (this.schema.properties[key] && this.schema.properties[key].items) {
				const inversedByValue = typeof value === 'object' && value?.id ? value.id : value
				this.$set(this.schema.properties[key].items, 'inversedBy', inversedByValue)
			}
		},

		// --- Array item object config ---

		updateArrayItemObjectConfigurationSetting(key, setting, value) {
			if (this.schema.properties[key]) {
				if (!this.schema.properties[key].items) {
					this.$set(this.schema.properties[key], 'items', {})
				}
				if (!this.schema.properties[key].items.objectConfiguration) {
					this.$set(this.schema.properties[key].items, 'objectConfiguration', {})
				}
				const settingValue = typeof value === 'object' && value?.id ? value.id : value
				this.$set(this.schema.properties[key].items, setting, settingValue)
			}
		},

		// --- Query params ---

		getObjectQueryParams(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].objectConfiguration) return ''
			return this.schema.properties[key].objectConfiguration.queryParams || ''
		},

		updateObjectQueryParams(key, value) {
			if (!this.schema.properties[key]) return

			if (!this.schema.properties[key].objectConfiguration) {
				this.$set(this.schema.properties[key], 'objectConfiguration', { handling: 'related-object' })
			}

			if (value && value.trim()) {
				this.$set(this.schema.properties[key].objectConfiguration, 'queryParams', value.trim())
			} else {
				this.$delete(this.schema.properties[key].objectConfiguration, 'queryParams')
			}
		},

		getArrayItemQueryParams(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items || !this.schema.properties[key].items.objectConfiguration) return ''
			return this.schema.properties[key].items.objectConfiguration.queryParams || ''
		},

		updateArrayItemQueryParams(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.$set(this.schema.properties[key].items, 'objectConfiguration', { handling: 'related-object' })
			}

			if (value && value.trim()) {
				this.$set(this.schema.properties[key].items.objectConfiguration, 'queryParams', value.trim())
			} else {
				this.$delete(this.schema.properties[key].items.objectConfiguration, 'queryParams')
			}
		},

		// --- File properties ---

		getFilePropertySetting(key, setting) {
			const property = this.schema.properties[key]
			if (!property) return false

			if (property.type === 'file') return property[setting] || false
			if (property.type === 'array' && property.items) return property.items[setting] || false
			return false
		},

		updateFilePropertySetting(key, setting, value) {
			if (this.schema.properties[key]) {
				if (this.schema.properties[key].type === 'file') {
					this.$set(this.schema.properties[key], setting, value)
				} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
					this.$set(this.schema.properties[key].items, setting, value)
				}
			}
		},

		updateFileProperty(key, setting, value) {
			if (this.schema.properties[key]) {
				if (['allowedTypes', 'allowedTags', 'autoTags'].includes(setting)) {
					const arrayValue = value ? value.split(',').map(item => item.trim()).filter(item => item !== '') : []
					if (this.schema.properties[key].type === 'file') {
						this.$set(this.schema.properties[key], setting, arrayValue)
					} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
						this.$set(this.schema.properties[key].items, setting, arrayValue)
					}
				} else if (setting === 'maxSize') {
					const numValue = value ? Number(value) : undefined
					if (this.schema.properties[key].type === 'file') {
						this.$set(this.schema.properties[key], setting, numValue)
					} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
						this.$set(this.schema.properties[key].items, setting, numValue)
					}
				}
			}
		},

		getFilePropertyTags(key, setting) {
			const property = this.schema.properties[key]
			if (!property) return []

			let tags = []
			if (property.type === 'file') {
				tags = property[setting] || []
			} else if (property.type === 'array' && property.items) {
				tags = property.items[setting] || []
			}

			return tags.map(tag => ({
				id: tag,
				label: tag,
			}))
		},

		updateFilePropertyTags(key, setting, selectedOptions) {
			if (this.schema.properties[key]) {
				const tags = selectedOptions ? selectedOptions.map(option => option.id || option) : []

				if (this.schema.properties[key].type === 'file') {
					this.$set(this.schema.properties[key], setting, tags)
				} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
					this.$set(this.schema.properties[key].items, setting, tags)
				}
			}
		},

		// --- Table config ---

		getPropertyTableSetting(key, setting) {
			if (!this.schema.properties[key] || !this.schema.properties[key].table) return false
			return this.schema.properties[key].table[setting] === true
		},

		getOriginalPropertyTableSetting(key, setting) {
			return this.originalProperties?.[key]?.table?.[setting]
		},

		updatePropertyTableSetting(key, setting, value) {
			if (!this.schema.properties[key]) return

			if (!this.schema.properties[key].table) {
				this.$set(this.schema.properties[key], 'table', {})
			}

			this.$set(this.schema.properties[key].table, setting, value)

			const wasTrueOriginally = this.getOriginalPropertyTableSetting(key, setting) === true
			const becameExplicitFalse = value === false
			const shouldKeepExplicitFalse = setting === 'default' && becameExplicitFalse && wasTrueOriginally

			if (this.isTableConfigDefault(key) && !shouldKeepExplicitFalse) {
				this.$delete(this.schema.properties[key], 'table')
			}
		},

		isTableConfigDefault(key) {
			const table = this.schema.properties[key]?.table
			if (!table) return true

			const defaults = { default: false }
			return Object.keys(table).every(setting =>
				table[setting] === defaults[setting],
			)
		},

		hasCustomTableSettings(key) {
			return !this.isTableConfigDefault(key)
		},

		// --- Property-level RBAC ---

		hasPropertyAnyPermissions(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].authorization) return false
			const auth = this.schema.properties[key].authorization
			return Object.keys(auth).some(action =>
				Array.isArray(auth[action]) && auth[action].length > 0,
			)
		},

		getDisplayGroupName(groupId) {
			if (groupId === 'public') return 'Public'
			if (groupId === 'authenticated') return 'Authenticated'
			if (groupId === 'admin') return 'Admin'

			const group = this.userGroups.find(g => g.id === groupId)
			return group ? (group.displayname || group.id) : groupId
		},

		getPropertyPermissionsList(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].authorization) return []

			const auth = this.schema.properties[key].authorization
			const permissionsList = []
			const processedGroups = new Set()

			Object.keys(auth).forEach(action => {
				if (Array.isArray(auth[action])) {
					auth[action].forEach(groupId => {
						if (!processedGroups.has(groupId)) {
							const rights = []
							if (auth.create && auth.create.includes(groupId)) rights.push('C')
							if (auth.read && auth.read.includes(groupId)) rights.push('R')
							if (auth.update && auth.update.includes(groupId)) rights.push('U')
							if (auth.delete && auth.delete.includes(groupId)) rights.push('D')

							permissionsList.push({
								group: this.getDisplayGroupName(groupId),
								groupId,
								rights: rights.length > 0 ? rights.join(',') : 'none',
							})
							processedGroups.add(groupId)
						}
					})
				}
			})

			permissionsList.push({
				group: 'Admin',
				groupId: 'admin',
				rights: 'C,R,U,D',
			})

			return permissionsList.sort((a, b) => {
				if (a.groupId === 'public') return -1
				if (b.groupId === 'public') return 1
				if (a.groupId === 'authenticated') return -1
				if (b.groupId === 'authenticated') return 1
				if (a.groupId === 'admin') return 1
				if (b.groupId === 'admin') return -1
				return a.group.localeCompare(b.group)
			})
		},

		getAvailableGroupsForProperty() {
			return [
				{ id: 'public', label: 'Public (Unauthenticated)' },
				{ id: 'authenticated', label: 'Authenticated' },
				...this.sortedUserGroups.map(group => ({
					id: group.id,
					label: group.displayname || group.id,
				})),
			]
		},

		hasAnyPropertyNewPermissionSelected() {
			return this.propertyNewPermissionCreate
				   || this.propertyNewPermissionRead
				   || this.propertyNewPermissionUpdate
				   || this.propertyNewPermissionDelete
		},

		hasPropertyGroupPermission(key, groupId, action) {
			if (!this.schema.properties[key] || !this.schema.properties[key].authorization) return false
			const auth = this.schema.properties[key].authorization
			if (!auth[action] || !Array.isArray(auth[action])) return false
			return auth[action].includes(groupId)
		},

		updatePropertyGroupPermission(key, groupId, action, hasPermission) {
			if (!this.schema.properties[key]) return

			if (!this.schema.properties[key].authorization) {
				this.$set(this.schema.properties[key], 'authorization', {})
			}

			if (!this.schema.properties[key].authorization[action]) {
				this.$set(this.schema.properties[key].authorization, action, [])
			}

			const currentPermissions = this.schema.properties[key].authorization[action]
			const groupIndex = currentPermissions.indexOf(groupId)

			if (hasPermission && groupIndex === -1) {
				currentPermissions.push(groupId)
			} else if (!hasPermission && groupIndex !== -1) {
				currentPermissions.splice(groupIndex, 1)
			}

			if (currentPermissions.length === 0) {
				this.$delete(this.schema.properties[key].authorization, action)
			}

			if (Object.keys(this.schema.properties[key].authorization).length === 0) {
				this.$delete(this.schema.properties[key], 'authorization')
			}
		},

		addPropertyGroupPermissions(key) {
			if (!this.propertyNewPermissionGroup) return

			const groupId = typeof this.propertyNewPermissionGroup === 'object'
				? this.propertyNewPermissionGroup.id
				: this.propertyNewPermissionGroup

			if (!this.schema.properties[key].authorization) {
				this.$set(this.schema.properties[key], 'authorization', {})
			}

			if (this.propertyNewPermissionCreate) {
				this.updatePropertyGroupPermission(key, groupId, 'create', true)
			}
			if (this.propertyNewPermissionRead) {
				this.updatePropertyGroupPermission(key, groupId, 'read', true)
			}
			if (this.propertyNewPermissionUpdate) {
				this.updatePropertyGroupPermission(key, groupId, 'update', true)
			}
			if (this.propertyNewPermissionDelete) {
				this.updatePropertyGroupPermission(key, groupId, 'delete', true)
			}

			this.resetPropertyPermissionForm()
		},

		removePropertyGroupPermissions(key, displayName) {
			const permission = this.getPropertyPermissionsList(key).find(p => p.group === displayName)
			if (!permission || permission.groupId === 'admin') return

			const groupId = permission.groupId

			if (!this.schema.properties[key] || !this.schema.properties[key].authorization) return

			;['create', 'read', 'update', 'delete'].forEach(action => {
				this.updatePropertyGroupPermission(key, groupId, action, false)
			})
		},

		resetPropertyPermissionForm() {
			this.propertyNewPermissionGroup = null
			this.propertyNewPermissionCreate = false
			this.propertyNewPermissionRead = false
			this.propertyNewPermissionUpdate = false
			this.propertyNewPermissionDelete = false
		},
	},
}
</script>
