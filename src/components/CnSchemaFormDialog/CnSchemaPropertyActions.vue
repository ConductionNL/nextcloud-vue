<template>
	<NcActions>
		<NcActionCaption :name="t('nextcloud-vue', 'Actions')" />
		<NcActionButton :aria-label="t('nextcloud-vue', 'Copy {key}', { key: propertyKey })" @click="$emit('copy-property', propertyKey)">
			<template #icon>
				<ContentCopy :size="16" />
			</template>
			{{ t('nextcloud-vue', 'Copy property') }}
		</NcActionButton>
		<NcActionButton :aria-label="t('nextcloud-vue', 'Delete {key}', { key: propertyKey })" @click="$emit('delete-property', propertyKey)">
			<template #icon>
				<TrashCanOutline :size="16" />
			</template>
			{{ t('nextcloud-vue', 'Delete property') }}
		</NcActionButton>

		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'General')" />
		<NcActionCheckbox
			:model-value="isPropertyRequired(schema, propertyKey)"
			@update:model-value="updatePropertyRequired(propertyKey, $event)">
			{{ t('nextcloud-vue', 'Required') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="property.immutable || false"
			@update:model-value="updatePropertySetting(propertyKey, 'immutable', $event)">
			{{ t('nextcloud-vue', 'Immutable') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="property.deprecated || false"
			@update:model-value="updatePropertySetting(propertyKey, 'deprecated', $event)">
			{{ t('nextcloud-vue', 'Deprecated') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="property.visible !== false"
			@update:model-value="updatePropertySetting(propertyKey, 'visible', $event)">
			{{ t('nextcloud-vue', 'Visible to end users') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="property.hideOnCollection || false"
			@update:model-value="updatePropertySetting(propertyKey, 'hideOnCollection', $event)">
			{{ t('nextcloud-vue', 'Hide in collection view') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="property.hideOnForm || false"
			@update:model-value="updatePropertySetting(propertyKey, 'hideOnForm', $event)">
			{{ t('nextcloud-vue', 'Hide in form view') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			:model-value="isFacetableEnabled(property)"
			@update:model-value="toggleFacetable(propertyKey, $event)">
			{{ t('nextcloud-vue', 'Facetable') }}
		</NcActionCheckbox>
		<NcActionCheckbox
			v-if="isFacetableEnabled(property)"
			:model-value="getFacetConfig(property).aggregated !== false"
			@update:model-value="updateFacetConfigField(propertyKey, property, 'aggregated', $event)">
			{{ t('nextcloud-vue', 'Aggregated across schemas') }}
		</NcActionCheckbox>
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).title || ''"
			:label="t('nextcloud-vue', 'Facet title')"
			@update:value="updateFacetConfigField(propertyKey, property, 'title', $event)" />
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).description || ''"
			:label="t('nextcloud-vue', 'Facet description')"
			@update:value="updateFacetConfigField(propertyKey, property, 'description', $event)" />
		<NcActionInput
			v-if="isFacetableEnabled(property)"
			:value="getFacetConfig(property).order != null ? String(getFacetConfig(property).order) : ''"
			type="number"
			:label="t('nextcloud-vue', 'Facet order')"
			@update:value="updateFacetConfigField(propertyKey, property, 'order', $event)" />

		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'Properties')" />
		<NcActionInput
			:value="property.title || ''"
			:label="t('nextcloud-vue', 'Title')"
			@update:value="updatePropertySetting(propertyKey, 'title', $event)" />
		<NcActionInput
			v-if="getFormatOptionsForType(property.type).length > 0"
			v-model="schema.properties[propertyKey].format"
			type="multiselect"
			:options="getFormatOptionsForType(property.type)"
			:input-label="t('nextcloud-vue', 'Format')"
			:label="t('nextcloud-vue', 'Format')" />
		<NcActionInput
			:value="property.description || ''"
			:label="t('nextcloud-vue', 'Description')"
			@update:value="updatePropertySetting(propertyKey, 'description', $event)" />
		<NcActionInput
			:value="property.example || ''"
			:label="t('nextcloud-vue', 'Example')"
			@update:value="updatePropertySetting(propertyKey, 'example', $event)" />
		<NcActionInput
			:value="property.order || 0"
			type="number"
			:label="t('nextcloud-vue', 'Order')"
			@update:value="updatePropertySetting(propertyKey, 'order', Number($event))" />

		<!-- Const and Enum Configuration -->
		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'Value constraints')" />
		<NcActionInput
			:value="property.const || ''"
			:label="t('nextcloud-vue', 'Constant')"
			@update:value="updatePropertySetting(propertyKey, 'const', $event === '' ? undefined : $event)" />
		<template v-if="property.enum && property.enum.length > 0">
			<NcActionCaption :name="t('nextcloud-vue', 'Current enum values ({count})', { count: property.enum.length })" />
			<NcActionButton
				v-for="(enumValue, index) in property.enum"
				:key="`enum-chip-${index}-${enumValue}`"
				:aria-label="t('nextcloud-vue', 'Remove {value}', { value: enumValue })"
				class="cn-schema-form__enum-action-chip"
				@click="removeEnumValue(propertyKey, index)">
				<template #icon>
					<Close :size="16" />
				</template>
				{{ String(enumValue) }}
			</NcActionButton>
		</template>
		<!--
			Use @submit, not @keydown.enter: NcActionInput wraps the field and its
			trailing arrow button in a <form> and emits `submit` for BOTH Enter and
			an arrow click. Listening only for keydown.enter left the arrow — the
			visible affordance most users reach for — doing nothing. Mirrors the
			note-add input in CnRelatedObjectsWidget.
		-->
		<NcActionInput
			:value="enumInputValue"
			:label="t('nextcloud-vue', 'Add enum value')"
			:placeholder="t('nextcloud-vue', 'Type a value and press Enter or the arrow')"
			@update:value="enumInputValue = $event"
			@submit="addEnumValueAndClear(propertyKey)" />

		<!-- Default Value Configuration -->
		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'Default value configuration')" />
		<template v-if="property.type === 'string'">
			<NcActionInput
				:value="property.default || ''"
				:label="t('nextcloud-vue', 'Default value')"
				@update:value="updatePropertySetting(propertyKey, 'default', $event === '' ? undefined : $event)" />
		</template>
		<template v-else-if="property.type === 'number' || property.type === 'integer'">
			<NcActionInput
				:value="property.default || 0"
				type="number"
				:label="t('nextcloud-vue', 'Default value')"
				@update:value="updatePropertySetting(propertyKey, 'default', Number($event))" />
		</template>
		<template v-else-if="property.type === 'boolean'">
			<NcActionCheckbox
				:model-value="property.default === true"
				@update:model-value="updatePropertySetting(propertyKey, 'default', $event)">
				{{ t('nextcloud-vue', 'Default value') }}
			</NcActionCheckbox>
		</template>
		<template v-else-if="property.type === 'array' && property.items && property.items.type === 'string'">
			<NcActionInput
				:value="getArrayDefaultAsString(property.default)"
				:label="t('nextcloud-vue', 'Default values (comma separated)')"
				placeholder="value1, value2, value3"
				@update:value="updateArrayDefault(propertyKey, $event)" />
		</template>
		<template v-else-if="property.type === 'object'">
			<NcActionInput
				:value="typeof property.default === 'object' ? JSON.stringify(property.default, null, 2) : (property.default || '{}')"
				:label="t('nextcloud-vue', 'Default value (JSON)')"
				@update:value="updateObjectDefault(propertyKey, $event)" />
		</template>

		<!-- Default Behavior Toggle -->
		<template v-if="property.default !== undefined && property.default !== null && property.default !== ''">
			<NcActionCheckbox
				:model-value="property.defaultBehavior === 'falsy'"
				@update:model-value="updatePropertySetting(propertyKey, 'defaultBehavior', $event ? 'falsy' : 'false')">
				{{ t('nextcloud-vue', 'Apply default for empty values') }}
			</NcActionCheckbox>
			<NcActionCaption
				v-if="property.defaultBehavior === 'falsy'"
				:name="'ℹ️ ' + t('nextcloud-vue', 'Default will be applied when value is missing, null, or empty string')"
				style="color: var(--color-text-lighter); font-size: 11px;" />
			<NcActionCaption
				v-else
				:name="'ℹ️ ' + t('nextcloud-vue', 'Default will only be applied when value is missing or null')"
				style="color: var(--color-text-lighter); font-size: 11px;" />
		</template>

		<!-- Type-specific configurations -->
		<template v-if="property.type === 'string'">
			<NcActionSeparator />
			<NcActionCaption :name="t('nextcloud-vue', 'String configuration')" />
			<NcActionInput
				:value="property.minLength || 0"
				type="number"
				:label="t('nextcloud-vue', 'Minimum length')"
				@update:value="updatePropertySetting(propertyKey, 'minLength', Number($event))" />
			<NcActionInput
				:value="property.maxLength || 0"
				type="number"
				:label="t('nextcloud-vue', 'Maximum length')"
				@update:value="updatePropertySetting(propertyKey, 'maxLength', Number($event))" />
			<NcActionInput
				:value="property.pattern || ''"
				:label="t('nextcloud-vue', 'Pattern (regex)')"
				@update:value="updatePropertySetting(propertyKey, 'pattern', $event)" />
		</template>

		<template v-if="property.type === 'number' || property.type === 'integer'">
			<NcActionSeparator />
			<NcActionCaption :name="t('nextcloud-vue', 'Number configuration')" />
			<NcActionInput
				:value="property.minimum || 0"
				type="number"
				:label="t('nextcloud-vue', 'Minimum value')"
				@update:value="updatePropertySetting(propertyKey, 'minimum', Number($event))" />
			<NcActionInput
				:value="property.maximum || 0"
				type="number"
				:label="t('nextcloud-vue', 'Maximum value')"
				@update:value="updatePropertySetting(propertyKey, 'maximum', Number($event))" />
			<NcActionInput
				:value="property.multipleOf || 0"
				type="number"
				:label="t('nextcloud-vue', 'Multiple of')"
				@update:value="updatePropertySetting(propertyKey, 'multipleOf', Number($event))" />
			<NcActionCheckbox
				:model-value="property.exclusiveMin || false"
				@update:model-value="updatePropertySetting(propertyKey, 'exclusiveMin', $event)">
				{{ t('nextcloud-vue', 'Exclusive minimum') }}
			</NcActionCheckbox>
			<NcActionCheckbox
				:model-value="property.exclusiveMax || false"
				@update:model-value="updatePropertySetting(propertyKey, 'exclusiveMax', $event)">
				{{ t('nextcloud-vue', 'Exclusive maximum') }}
			</NcActionCheckbox>
		</template>

		<template v-if="property.type === 'array'">
			<NcActionSeparator />
			<NcActionCaption :name="t('nextcloud-vue', 'Array configuration')" />
			<NcActionInput
				v-model="schema.properties[propertyKey].items.type"
				type="multiselect"
				:options="arrayItemTypeOptions"
				:input-label="t('nextcloud-vue', 'Array item type')"
				:label="t('nextcloud-vue', 'Array item type')" />
			<NcActionInput
				:value="property.minItems || 0"
				type="number"
				:label="t('nextcloud-vue', 'Minimum items')"
				@update:value="updatePropertySetting(propertyKey, 'minItems', Number($event))" />
			<NcActionInput
				:value="property.maxItems || 0"
				type="number"
				:label="t('nextcloud-vue', 'Maximum items')"
				@update:value="updatePropertySetting(propertyKey, 'maxItems', Number($event))" />

			<!-- Show object configuration for array items when item type is object -->
			<template v-if="property.items && property.items.type === 'object'">
				<NcActionSeparator />
				<NcActionCaption :name="t('nextcloud-vue', 'Array item object configuration')" />
				<NcActionInput
					v-model="schema.properties[propertyKey].items.objectConfiguration.handling"
					type="multiselect"
					:options="objectHandlingOptions"
					:input-label="t('nextcloud-vue', 'Object handling')"
					:label="t('nextcloud-vue', 'Object handling')" />
				<NcActionInput
					:value="arrayItemSchemaRefValueFor(propertyKey)"
					type="multiselect"
					:options="schemaRefOptions"
					:input-label="t('nextcloud-vue', 'Schema reference')"
					:label="t('nextcloud-vue', 'Schema reference')"
					@input="updateArrayItemSchemaReference(propertyKey, $event)" />
				<NcActionCaption
					v-if="isArrayItemRefInvalid(propertyKey)"
					:name="'⚠️ ' + t('nextcloud-vue', 'Invalid schema reference: Expected string, got number ({value}). This will be sent to backend as-is.', { value: schema.properties[propertyKey].items.$ref })"
					style="color: var(--color-error); font-weight: bold;" />
				<NcActionInput
					:value="arrayItemRegisterValueFor(propertyKey)"
					type="multiselect"
					:options="registerSelectOptions"
					:input-label="t('nextcloud-vue', 'Register')"
					:label="t('nextcloud-vue', 'Register (required when schema is selected)')"
					:required="!!schema.properties[propertyKey].items.$ref"
					:disabled="!schema.properties[propertyKey].items.$ref"
					@input="updateArrayItemRegisterReference(propertyKey, $event)" />
				<NcActionInput
					v-model="schema.properties[propertyKey].items.inversedBy"
					type="multiselect"
					:options="getInversedByOptionsForArrayItems(propertyKey)"
					:input-label="t('nextcloud-vue', 'Inversed by property')"
					:label="t('nextcloud-vue', 'Inversed by')"
					:disabled="!schema.properties[propertyKey].items.$ref"
					@update:value="updateInversedByForArrayItems(propertyKey, $event)" />
				<NcActionInput
					:value="getArrayItemQueryParams(propertyKey)"
					:label="t('nextcloud-vue', 'Query parameters')"
					placeholder="e.g. gemmaType=referentiecomponent&_extend=aanbevolenStandaarden"
					@update:value="updateArrayItemQueryParams(propertyKey, $event)" />
				<NcActionCheckbox
					:model-value="property.items.writeBack || false"
					@update:model-value="updateArrayItemObjectConfigurationSetting(propertyKey, 'writeBack', $event)">
					{{ t('nextcloud-vue', 'Write back') }}
				</NcActionCheckbox>
				<NcActionCheckbox
					:model-value="property.items.removeAfterWriteBack || false"
					@update:model-value="updateArrayItemObjectConfigurationSetting(propertyKey, 'removeAfterWriteBack', $event)">
					{{ t('nextcloud-vue', 'Remove after write back') }}
				</NcActionCheckbox>
				<NcActionCheckbox
					:model-value="property.items.cascadeDelete || false"
					@update:model-value="updateArrayItemObjectConfigurationSetting(propertyKey, 'cascadeDelete', $event)">
					{{ t('nextcloud-vue', 'Cascade delete') }}
				</NcActionCheckbox>
			</template>
		</template>

		<template v-if="property.type === 'object'">
			<NcActionSeparator />
			<NcActionCaption :name="t('nextcloud-vue', 'Object configuration')" />
			<NcActionInput
				v-model="schema.properties[propertyKey].objectConfiguration.handling"
				type="multiselect"
				:options="objectHandlingOptions"
				:input-label="t('nextcloud-vue', 'Object handling')"
				:label="t('nextcloud-vue', 'Object handling')" />
			<NcActionInput
				:value="schemaRefValueFor(propertyKey)"
				type="multiselect"
				:options="schemaRefOptions"
				:input-label="t('nextcloud-vue', 'Schema reference')"
				:label="t('nextcloud-vue', 'Schema reference')"
				@input="updateSchemaReference(propertyKey, $event)" />
			<NcActionCaption
				v-if="isRefInvalid(propertyKey)"
				:name="'⚠️ ' + t('nextcloud-vue', 'Invalid schema reference: Expected string, got number ({value}). This will be sent to backend as-is.', { value: schema.properties[propertyKey].$ref })"
				style="color: var(--color-error); font-weight: bold;" />
			<NcActionInput
				:value="registerValueFor(propertyKey)"
				type="multiselect"
				:options="registerSelectOptions"
				:input-label="t('nextcloud-vue', 'Register')"
				:label="t('nextcloud-vue', 'Register (required when schema is selected)')"
				:required="!!schema.properties[propertyKey].$ref"
				:disabled="!schema.properties[propertyKey].$ref"
				@input="updateRegisterReference(propertyKey, $event)" />
			<NcActionInput
				v-model="schema.properties[propertyKey].inversedBy"
				type="multiselect"
				:options="getInversedByOptions(propertyKey)"
				:input-label="t('nextcloud-vue', 'Inversed by property')"
				:label="t('nextcloud-vue', 'Inversed by')"
				:disabled="!schema.properties[propertyKey].$ref"
				@update:value="updateInversedBy(propertyKey, $event)" />
			<NcActionInput
				:value="getObjectQueryParams(propertyKey)"
				:label="t('nextcloud-vue', 'Query parameters')"
				placeholder="e.g. gemmaType=referentiecomponent&_extend=aanbevolenStandaarden"
				@update:value="updateObjectQueryParams(propertyKey, $event)" />
			<NcActionCheckbox
				:model-value="property.writeBack || false"
				@update:model-value="updatePropertySetting(propertyKey, 'writeBack', $event)">
				{{ t('nextcloud-vue', 'Write back') }}
			</NcActionCheckbox>
			<NcActionCheckbox
				:model-value="property.removeAfterWriteBack || false"
				@update:model-value="updatePropertySetting(propertyKey, 'removeAfterWriteBack', $event)">
				{{ t('nextcloud-vue', 'Remove after write back') }}
			</NcActionCheckbox>
			<NcActionCheckbox
				:model-value="property.cascadeDelete || false"
				@update:model-value="updatePropertySetting(propertyKey, 'cascadeDelete', $event)">
				{{ t('nextcloud-vue', 'Cascade delete') }}
			</NcActionCheckbox>
		</template>

		<!-- File Configuration -->
		<template v-if="property.type === 'file' || (property.type === 'array' && property.items && property.items.type === 'file')">
			<NcActionSeparator />
			<NcActionCaption :name="t('nextcloud-vue', 'File configuration')" />
			<NcActionCheckbox
				:model-value="getFilePropertySetting(propertyKey, 'autoPublish')"
				@update:model-value="updateFilePropertySetting(propertyKey, 'autoPublish', $event)">
				{{ t('nextcloud-vue', 'Auto-publish files') }}
			</NcActionCheckbox>
			<NcActionCaption
				v-if="getFilePropertySetting(propertyKey, 'autoPublish')"
				:name="'ℹ️ ' + t('nextcloud-vue', 'Files uploaded to this property will be automatically publicly shared')"
				style="color: var(--color-text-lighter); font-size: 11px;" />
			<NcActionInput
				:value="(property.allowedTypes || []).join(', ')"
				:label="t('nextcloud-vue', 'Allowed MIME types (comma separated)')"
				placeholder="image/png, image/jpeg, application/pdf"
				@update:value="updateFileProperty(propertyKey, 'allowedTypes', $event)" />
			<NcActionInput
				:value="property.maxSize || ''"
				type="number"
				:label="t('nextcloud-vue', 'Maximum file size (bytes)')"
				placeholder="5242880"
				@update:value="updateFileProperty(propertyKey, 'maxSize', $event)" />
			<NcActionInput
				:value="getFilePropertyTags(propertyKey, 'allowedTags')"
				type="multiselect"
				:options="availableTagsOptions"
				:input-label="t('nextcloud-vue', 'Allowed tags')"
				:label="t('nextcloud-vue', 'Allowed tags (select from available tags)')"
				multiple
				@update:value="updateFilePropertyTags(propertyKey, 'allowedTags', $event)" />
			<NcActionInput
				:value="getFilePropertyTags(propertyKey, 'autoTags')"
				type="multiselect"
				:options="availableTagsOptions"
				:input-label="t('nextcloud-vue', 'Auto tags')"
				:label="t('nextcloud-vue', 'Auto tags (automatically applied to uploaded files)')"
				multiple
				@update:value="updateFilePropertyTags(propertyKey, 'autoTags', $event)" />
		</template>

		<!-- Property-level Table Configuration -->
		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'Table')" />
		<NcActionCheckbox
			:model-value="getPropertyTableSetting(propertyKey, 'default')"
			@update:model-value="updatePropertyTableSetting(propertyKey, 'default', $event)">
			{{ t('nextcloud-vue', 'Default') }}
		</NcActionCheckbox>

		<!-- Property-level Security Configuration -->
		<NcActionSeparator />
		<NcActionCaption :name="t('nextcloud-vue', 'Property security')" />

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
					:aria-label="t('nextcloud-vue', 'Remove {group} permissions', { group: permission.group })"
					class="cn-schema-form__property-permission-remove-btn"
					@click="removePropertyGroupPermissions(propertyKey, permission.group)">
					<template #icon>
						<Close :size="16" />
					</template>
					{{ t('nextcloud-vue', 'Remove {group}', { group: permission.group }) }}
				</NcActionButton>
			</div>

			<!-- Show inheritance status if no specific permissions -->
			<NcActionCaption
				v-if="!hasPropertyAnyPermissions(propertyKey)"
				:name="'📄 ' + t('nextcloud-vue', 'Inherits schema permissions')"
				style="color: var(--color-success); font-size: 11px;" />

			<!-- Add Permission Interface -->
			<NcActionSeparator />
			<NcActionInput
				v-model="propertyNewPermissionGroup"
				type="multiselect"
				:options="getAvailableGroupsForProperty()"
				:input-label="t('nextcloud-vue', 'Group')"
				:label="t('nextcloud-vue', 'Add group permission')"
				:placeholder="t('nextcloud-vue', 'Select group...')" />

			<template v-if="propertyNewPermissionGroup">
				<NcActionCaption :name="t('nextcloud-vue', 'Select permissions:')" />
				<NcActionCheckbox
					:model-value="propertyNewPermissionCreate"
					@update:model-value="propertyNewPermissionCreate = $event">
					{{ t('nextcloud-vue', 'Create (C)') }}
				</NcActionCheckbox>
				<NcActionCheckbox
					:model-value="propertyNewPermissionRead"
					@update:model-value="propertyNewPermissionRead = $event">
					{{ t('nextcloud-vue', 'Read (R)') }}
				</NcActionCheckbox>
				<NcActionCheckbox
					:model-value="propertyNewPermissionUpdate"
					@update:model-value="propertyNewPermissionUpdate = $event">
					{{ t('nextcloud-vue', 'Update (U)') }}
				</NcActionCheckbox>
				<NcActionCheckbox
					:model-value="propertyNewPermissionDelete"
					@update:model-value="propertyNewPermissionDelete = $event">
					{{ t('nextcloud-vue', 'Delete (D)') }}
				</NcActionCheckbox>

				<NcActionButton
					v-if="hasAnyPropertyNewPermissionSelected()"
					@click="addPropertyGroupPermissions(propertyKey)">
					<template #icon>
						<Plus :size="16" />
					</template>
					{{ t('nextcloud-vue', 'Add permission') }}
				</NcActionButton>
			</template>
		</template>
		<template v-else>
			<NcActionCaption :name="t('nextcloud-vue', 'Loading groups...')" />
		</template>
	</NcActions>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
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
	emits: ['copy-property', 'delete-property'],
	data() {
		return {
			enumInputValue: '',
			propertyNewPermissionGroup: null,
			propertyNewPermissionCreate: false,
			propertyNewPermissionRead: false,
			propertyNewPermissionUpdate: false,
			propertyNewPermissionDelete: false,
		}
	},
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
		objectHandlingOptions() {
			return [
				{ id: 'nested-object', label: t('nextcloud-vue', 'Nested object') },
				{ id: 'related-object', label: t('nextcloud-vue', 'Related object') },
				{ id: 'nested-schema', label: t('nextcloud-vue', 'Nested schema') },
				{ id: 'related-schema', label: t('nextcloud-vue', 'Related schema') },
				{ id: 'uri', label: 'URI' },
			]
		},
		/**
		 * Schema-reference select options as {id, label}. NcSelect renders
		 * `option.label`, and the raw availableSchemas objects are keyed by
		 * title/slug with NO label — binding them directly rendered every option as
		 * literal "undefined". `id` is the $ref the backend expects (the schema's
		 * reference, or `#/components/schemas/<slug>`), which updateSchemaReference
		 * reads back off `value.id`.
		 *
		 * @return {Array<{id: string, label: string, schema: object}>} Options.
		 */
		schemaRefOptions() {
			return (this.availableSchemas || []).map((s) => ({
				id: s.reference || `#/components/schemas/${s.slug || s.title || s.id}`,
				label: s.title || s.name || s.slug || `Schema ${s.id}`,
				schema: s,
			}))
		},
		/**
		 * Register select options as {id, label} — same reason as schemaRefOptions.
		 *
		 * @return {Array<{id: (string|number), label: string}>} Options.
		 */
		registerSelectOptions() {
			return (this.availableRegisters || []).map((r) => ({
				id: r.id !== undefined ? r.id : (r.slug || r.title),
				label: r.title || r.name || r.label || r.slug || `Register ${r.id}`,
			}))
		},
		arrayItemTypeOptions() {
			return [
				{ id: 'string', label: t('nextcloud-vue', 'String') },
				{ id: 'number', label: t('nextcloud-vue', 'Number') },
				{ id: 'integer', label: t('nextcloud-vue', 'Integer') },
				{ id: 'object', label: t('nextcloud-vue', 'Object') },
				{ id: 'boolean', label: t('nextcloud-vue', 'Boolean') },
				{ id: 'file', label: t('nextcloud-vue', 'File') },
			]
		},
	},
	methods: {
		t,

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
		},

		// --- Property setting updates ---

		updatePropertySetting(key, setting, value) {
			if (this.schema.properties[key]) {
				const settingValue = typeof value === 'object' && value?.id ? value.id : value
				this.schema.properties[key][setting] = settingValue
				this.ensureRefIsString(this.schema.properties, key)
			}
		},

		updatePropertyRequired(key, isRequired) {
			if (this.schema.properties[key]) {
				if (isRequired) {
					this.schema.properties[key].required = true
				} else {
					delete this.schema.properties[key].required
				}
			}

			if (!this.schema.required) {
				this.schema.required = []
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
				this.schema.properties[key].facetable = true
			} else {
				this.schema.properties[key].facetable = false
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
				this.schema.properties[key].facetable = {
					aggregated: config.aggregated,
					title: config.title?.trim() || null,
					description: config.description?.trim() || null,
					order: config.order,
				}
			} else {
				this.schema.properties[key].facetable = true
			}
		},

		// --- Format options ---

		getFormatOptionsForType(type) {
			const formatMap = {
				string: [
					{ id: 'text', label: t('nextcloud-vue', 'Text') },
					{ id: 'markdown', label: t('nextcloud-vue', 'Markdown') },
					{ id: 'html', label: t('nextcloud-vue', 'HTML') },
					{ id: 'date-time', label: t('nextcloud-vue', 'Date time') },
					{ id: 'date', label: t('nextcloud-vue', 'Date') },
					{ id: 'time', label: t('nextcloud-vue', 'Time') },
					{ id: 'duration', label: t('nextcloud-vue', 'Duration') },
					{ id: 'email', label: t('nextcloud-vue', 'Email') },
					{ id: 'idn-email', label: t('nextcloud-vue', 'IDN email') },
					{ id: 'hostname', label: t('nextcloud-vue', 'Hostname') },
					{ id: 'idn-hostname', label: t('nextcloud-vue', 'IDN hostname') },
					{ id: 'ipv4', label: 'IPv4' },
					{ id: 'ipv6', label: 'IPv6' },
					{ id: 'uri', label: 'URI' },
					{ id: 'uri-reference', label: t('nextcloud-vue', 'URI reference') },
					{ id: 'iri', label: 'IRI' },
					{ id: 'iri-reference', label: t('nextcloud-vue', 'IRI reference') },
					{ id: 'uuid', label: 'UUID' },
					{ id: 'uri-template', label: t('nextcloud-vue', 'URI template') },
					{ id: 'json-pointer', label: t('nextcloud-vue', 'JSON pointer') },
					{ id: 'relative-json-pointer', label: t('nextcloud-vue', 'Relative JSON pointer') },
					{ id: 'regex', label: t('nextcloud-vue', 'Regex') },
					{ id: 'binary', label: t('nextcloud-vue', 'Binary') },
					{ id: 'byte', label: t('nextcloud-vue', 'Byte') },
					{ id: 'password', label: t('nextcloud-vue', 'Password') },
					{ id: 'rsin', label: 'RSIN' },
					{ id: 'kvk', label: 'KVK' },
					{ id: 'bsn', label: 'BSN' },
					{ id: 'oidn', label: 'OIDN' },
					{ id: 'telephone', label: t('nextcloud-vue', 'Telephone') },
					{ id: 'accessUrl', label: t('nextcloud-vue', 'Access URL') },
					{ id: 'shareUrl', label: t('nextcloud-vue', 'Share URL') },
					{ id: 'downloadUrl', label: t('nextcloud-vue', 'Download URL') },
					{ id: 'extension', label: t('nextcloud-vue', 'Extension') },
					{ id: 'filename', label: t('nextcloud-vue', 'Filename') },
					{ id: 'semver', label: t('nextcloud-vue', 'Semantic version') },
					{ id: 'url', label: 'URL' },
					{ id: 'color', label: t('nextcloud-vue', 'Color') },
					{ id: 'color-hex', label: t('nextcloud-vue', 'Color hex') },
					{ id: 'color-hex-alpha', label: t('nextcloud-vue', 'Color hex alpha') },
					{ id: 'color-rgb', label: t('nextcloud-vue', 'Color RGB') },
					{ id: 'color-rgba', label: t('nextcloud-vue', 'Color RGBA') },
					{ id: 'color-hsl', label: t('nextcloud-vue', 'Color HSL') },
					{ id: 'color-hsla', label: t('nextcloud-vue', 'Color HSLA') },
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
					this.schema.properties[key].enum = []
				}

				if (!this.schema.properties[key].enum.includes(trimmedValue)) {
					const newEnum = [...this.schema.properties[key].enum, trimmedValue]
					this.schema.properties[key].enum = newEnum
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
					delete this.schema.properties[key].enum
				} else {
					this.schema.properties[key].enum = newEnum
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
				this.schema.properties[key].default = undefined
			} else {
				const arrayValues = value.split(',').map(item => item.trim()).filter(item => item !== '')
				this.schema.properties[key].default = arrayValues
			}
		},

		updateObjectDefault(key, value) {
			if (!this.schema.properties[key]) return

			if (!value || value.trim() === '' || value.trim() === '{}') {
				this.schema.properties[key].default = undefined
				return
			}

			try {
				const parsedValue = JSON.parse(value)
				this.schema.properties[key].default = parsedValue
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
			this.schema.properties[key].$ref = schemaRef

			if (!this.schema.properties[key].objectConfiguration) {
				this.schema.properties[key].objectConfiguration = { handling: 'related-object' }
			}

			if (schemaRef) {
				let schemaSlug = schemaRef
				if (schemaRef.includes('/')) {
					schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
				}

				const referencedSchema = this.findSchemaBySlug(schemaSlug)
				if (referencedSchema) {
					this.schema.properties[key].objectConfiguration.schema = referencedSchema.id
				}

				if (this.schema.properties[key].register && !this.schema.properties[key].objectConfiguration.register) {
					const oldRegister = this.schema.properties[key].register
					const registerId = typeof oldRegister === 'object' && oldRegister.id ? oldRegister.id : oldRegister
					this.schema.properties[key].objectConfiguration.register = registerId
				}
			} else {
				delete this.schema.properties[key].objectConfiguration.schema
				delete this.schema.properties[key].objectConfiguration.register
			}
		},

		updateArrayItemSchemaReference(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			const schemaRef = typeof value === 'object' && value?.id ? value.id : value
			this.schema.properties[key].items.$ref = schemaRef

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.schema.properties[key].items.objectConfiguration = { handling: 'related-object' }
			}

			if (schemaRef) {
				let schemaSlug = schemaRef
				if (schemaRef.includes('/')) {
					schemaSlug = schemaRef.substring(schemaRef.lastIndexOf('/') + 1)
				}

				const referencedSchema = this.findSchemaBySlug(schemaSlug)
				if (referencedSchema) {
					this.schema.properties[key].items.objectConfiguration.schema = referencedSchema.id
				}
			} else {
				delete this.schema.properties[key].items.objectConfiguration.schema
				delete this.schema.properties[key].items.objectConfiguration.register
			}
		},

		// --- Register references ---

		updateRegisterReference(key, value) {
			if (!this.schema.properties[key]) return

			if (!this.schema.properties[key].objectConfiguration) {
				this.schema.properties[key].objectConfiguration = { handling: 'related-object' }
			}

			const registerId = typeof value === 'object' && value?.id ? value.id : value

			if (registerId) {
				this.schema.properties[key].objectConfiguration.register = registerId
				if (this.schema.properties[key].register) {
					delete this.schema.properties[key].register
				}
			} else {
				delete this.schema.properties[key].objectConfiguration.register
			}
		},

		updateArrayItemRegisterReference(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.schema.properties[key].items.objectConfiguration = { handling: 'related-object' }
			}

			const registerId = typeof value === 'object' && value?.id ? value.id : value

			if (registerId) {
				this.schema.properties[key].items.objectConfiguration.register = registerId
			} else {
				delete this.schema.properties[key].items.objectConfiguration.register
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

		// --- Select value resolvers (return the matched {id,label} option so the
		//     multiselect displays the current selection instead of a raw string) ---

		/**
		 * The schema-reference option currently selected for a property.
		 *
		 * @param {string} key The property key.
		 * @return {?object} The matching {id,label} option, or a display fallback.
		 */
		schemaRefValueFor(key) {
			const ref = this.schema.properties[key] && this.schema.properties[key].$ref
			return this.matchSchemaRefOption(ref)
		},
		/**
		 * The schema-reference option currently selected for an array property's items.
		 *
		 * @param {string} key The property key.
		 * @return {?object} The matching {id,label} option, or a display fallback.
		 */
		arrayItemSchemaRefValueFor(key) {
			const items = this.schema.properties[key] && this.schema.properties[key].items
			return this.matchSchemaRefOption(items && items.$ref)
		},
		/**
		 * Resolve a stored $ref to a schemaRefOptions entry, matching on the option
		 * id or the referenced schema's slug/title/id so a value persisted in any of
		 * those forms still shows a name. Falls back to showing the raw ref.
		 *
		 * @param {(string|number|object)} ref The stored $ref.
		 * @return {?object} The matching option, a raw-ref fallback, or null.
		 */
		matchSchemaRefOption(ref) {
			if (ref === undefined || ref === null || ref === '') return null
			const raw = typeof ref === 'object' && ref.id !== undefined ? ref.id : ref
			const tail = typeof raw === 'string' && raw.includes('/') ? raw.substring(raw.lastIndexOf('/') + 1) : raw
			return this.schemaRefOptions.find((o) => o.id === raw)
				|| this.schemaRefOptions.find((o) => {
					const s = o.schema || {}
					return s.slug === tail || s.title === tail || String(s.id) === String(tail)
				})
				|| { id: raw, label: String(raw) }
		},
		/**
		 * The register option currently selected for a property.
		 *
		 * @param {string} key The property key.
		 * @return {?object} The matching {id,label} option, or a display fallback.
		 */
		registerValueFor(key) {
			return this.matchRegisterOption(this.getRegisterValue(key))
		},
		/**
		 * The register option currently selected for an array property's items.
		 *
		 * @param {string} key The property key.
		 * @return {?object} The matching {id,label} option, or a display fallback.
		 */
		arrayItemRegisterValueFor(key) {
			return this.matchRegisterOption(this.getArrayItemRegisterValue(key))
		},
		/**
		 * Resolve a stored register id to a registerSelectOptions entry.
		 *
		 * @param {(string|number|object)} value The stored register value.
		 * @return {?object} The matching option, a raw fallback, or null.
		 */
		matchRegisterOption(value) {
			if (value === undefined || value === null || value === '') return null
			const raw = typeof value === 'object' && value.id !== undefined ? value.id : value
			return this.registerSelectOptions.find((o) => String(o.id) === String(raw))
				|| { id: raw, label: String(raw) }
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
				this.schema.properties[key].inversedBy = inversedByValue
			}
		},

		updateInversedByForArrayItems(key, value) {
			if (this.schema.properties[key] && this.schema.properties[key].items) {
				const inversedByValue = typeof value === 'object' && value?.id ? value.id : value
				this.schema.properties[key].items.inversedBy = inversedByValue
			}
		},

		// --- Array item object config ---

		updateArrayItemObjectConfigurationSetting(key, setting, value) {
			if (this.schema.properties[key]) {
				if (!this.schema.properties[key].items) {
					this.schema.properties[key].items = {}
				}
				if (!this.schema.properties[key].items.objectConfiguration) {
					this.schema.properties[key].items.objectConfiguration = {}
				}
				const settingValue = typeof value === 'object' && value?.id ? value.id : value
				this.schema.properties[key].items[setting] = settingValue
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
				this.schema.properties[key].objectConfiguration = { handling: 'related-object' }
			}

			if (value && value.trim()) {
				this.schema.properties[key].objectConfiguration.queryParams = value.trim()
			} else {
				delete this.schema.properties[key].objectConfiguration.queryParams
			}
		},

		getArrayItemQueryParams(key) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items || !this.schema.properties[key].items.objectConfiguration) return ''
			return this.schema.properties[key].items.objectConfiguration.queryParams || ''
		},

		updateArrayItemQueryParams(key, value) {
			if (!this.schema.properties[key] || !this.schema.properties[key].items) return

			if (!this.schema.properties[key].items.objectConfiguration) {
				this.schema.properties[key].items.objectConfiguration = { handling: 'related-object' }
			}

			if (value && value.trim()) {
				this.schema.properties[key].items.objectConfiguration.queryParams = value.trim()
			} else {
				delete this.schema.properties[key].items.objectConfiguration.queryParams
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
					this.schema.properties[key][setting] = value
				} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
					this.schema.properties[key].items[setting] = value
				}
			}
		},

		updateFileProperty(key, setting, value) {
			if (this.schema.properties[key]) {
				if (['allowedTypes', 'allowedTags', 'autoTags'].includes(setting)) {
					const arrayValue = value ? value.split(',').map(item => item.trim()).filter(item => item !== '') : []
					if (this.schema.properties[key].type === 'file') {
						this.schema.properties[key][setting] = arrayValue
					} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
						this.schema.properties[key].items[setting] = arrayValue
					}
				} else if (setting === 'maxSize') {
					const numValue = value ? Number(value) : undefined
					if (this.schema.properties[key].type === 'file') {
						this.schema.properties[key][setting] = numValue
					} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
						this.schema.properties[key].items[setting] = numValue
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
					this.schema.properties[key][setting] = tags
				} else if (this.schema.properties[key].type === 'array' && this.schema.properties[key].items) {
					this.schema.properties[key].items[setting] = tags
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
				this.schema.properties[key].table = {}
			}

			this.schema.properties[key].table[setting] = value

			const wasTrueOriginally = this.getOriginalPropertyTableSetting(key, setting) === true
			const becameExplicitFalse = value === false
			const shouldKeepExplicitFalse = setting === 'default' && becameExplicitFalse && wasTrueOriginally

			if (this.isTableConfigDefault(key) && !shouldKeepExplicitFalse) {
				delete this.schema.properties[key].table
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
			if (groupId === 'public') return t('nextcloud-vue', 'Public')
			if (groupId === 'authenticated') return t('nextcloud-vue', 'Authenticated')
			if (groupId === 'admin') return t('nextcloud-vue', 'Admin')

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
				group: t('nextcloud-vue', 'Admin'),
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
				{ id: 'public', label: t('nextcloud-vue', 'Public (unauthenticated)') },
				{ id: 'authenticated', label: t('nextcloud-vue', 'Authenticated') },
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
				this.schema.properties[key].authorization = {}
			}

			if (!this.schema.properties[key].authorization[action]) {
				this.schema.properties[key].authorization[action] = []
			}

			const currentPermissions = this.schema.properties[key].authorization[action]
			const groupIndex = currentPermissions.indexOf(groupId)

			if (hasPermission && groupIndex === -1) {
				currentPermissions.push(groupId)
			} else if (!hasPermission && groupIndex !== -1) {
				currentPermissions.splice(groupIndex, 1)
			}

			if (currentPermissions.length === 0) {
				delete this.schema.properties[key].authorization[action]
			}

			if (Object.keys(this.schema.properties[key].authorization).length === 0) {
				delete this.schema.properties[key].authorization
			}
		},

		addPropertyGroupPermissions(key) {
			if (!this.propertyNewPermissionGroup) return

			const groupId = typeof this.propertyNewPermissionGroup === 'object'
				? this.propertyNewPermissionGroup.id
				: this.propertyNewPermissionGroup

			if (!this.schema.properties[key].authorization) {
				this.schema.properties[key].authorization = {}
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
