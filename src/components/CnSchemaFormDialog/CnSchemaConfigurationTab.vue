<template>
	<div class="cn-schema-form__form-editor">
		<NcTextArea :disabled="loading"
			:label="t('nextcloud-vue', 'Description')"
			:value.sync="schema.description" />
		<NcTextArea :disabled="loading"
			:label="t('nextcloud-vue', 'Summary')"
			:value.sync="schema.summary" />
		<NcTextField :disabled="loading"
			:label="t('nextcloud-vue', 'Slug')"
			:value.sync="schema.slug" />

		<!-- Schema Composition Section -->
		<div>
			<h3>{{ t('nextcloud-vue', 'Schema composition (JSON Schema)') }}</h3>

			<!-- allOf - Multiple Inheritance (Recommended) -->
			<NcSelect
				v-model="schema.allOf"
				:disabled="loading"
				:options="availableSchemas"
				:multiple="true"
				:clearable="true"
				:close-on-select="false"
				label="title"
				track-by="id"
				:input-label="t('nextcloud-vue', 'allOf - Inherits from ALL schemas (Recommended)')"
				:placeholder="t('nextcloud-vue', 'Select schemas to inherit from (supports multiple parents)')">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span class="cn-schema-form__option-title">{{ title }}</span>
						<span v-if="description" class="cn-schema-form__option-description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.allOf && schema.allOf.length > 0" type="info">
				<p><strong>{{ t('nextcloud-vue', 'allOf - Multiple inheritance') }}</strong></p>
				<p>{{ t('nextcloud-vue', 'Instance must validate against all selected schemas. Properties from all parent schemas are merged. This is the recommended pattern for schema extension and multiple inheritance.') }}</p>
				<p><strong>{{ t('nextcloud-vue', 'Important:') }}</strong> {{ t('nextcloud-vue', 'Child schemas can only add constraints, never relax them (Liskov substitution principle). Metadata (title, description, order) can be overridden.') }}</p>
				<div v-if="allOfSchemaNames.length > 0">
					<strong>{{ t('nextcloud-vue', 'Parent schemas:') }}</strong>
					<ul>
						<li v-for="name in allOfSchemaNames" :key="name">
							{{ name }}
						</li>
					</ul>
				</div>
			</NcNoteCard>

			<!-- oneOf - Mutually Exclusive Options -->
			<NcSelect
				v-model="schema.oneOf"
				:disabled="loading"
				:options="availableSchemas"
				:multiple="true"
				:clearable="true"
				:close-on-select="false"
				label="title"
				track-by="id"
				:input-label="t('nextcloud-vue', 'oneOf - Exactly one schema must match')"
				:placeholder="t('nextcloud-vue', 'Select schemas (instance must match exactly one)')">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span class="cn-schema-form__option-title">{{ title }}</span>
						<span v-if="description" class="cn-schema-form__option-description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.oneOf && schema.oneOf.length > 0" type="info">
				<p><strong>{{ t('nextcloud-vue', 'oneOf - Mutually exclusive') }}</strong></p>
				<p>{{ t('nextcloud-vue', 'Instance must validate against exactly one of the selected schemas. Properties are not merged. Use for discriminated unions or type variants.') }}</p>
			</NcNoteCard>

			<!-- anyOf - Flexible Composition -->
			<NcSelect
				v-model="schema.anyOf"
				:disabled="loading"
				:options="availableSchemas"
				:multiple="true"
				:clearable="true"
				:close-on-select="false"
				label="title"
				track-by="id"
				:input-label="t('nextcloud-vue', 'anyOf - At least one schema must match')"
				:placeholder="t('nextcloud-vue', 'Select schemas (instance must match at least one)')">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span class="cn-schema-form__option-title">{{ title }}</span>
						<span v-if="description" class="cn-schema-form__option-description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.anyOf && schema.anyOf.length > 0" type="info">
				<p><strong>{{ t('nextcloud-vue', 'anyOf - Flexible composition') }}</strong></p>
				<p>{{ t('nextcloud-vue', 'Instance must validate against at least one of the selected schemas. Properties are not merged. More permissive than oneOf.') }}</p>
			</NcNoteCard>
		</div>
		<NcSelect
			v-model="schema.configuration.objectNameField"
			:disabled="loading"
			:options="propertyOptions"
			:input-label="t('nextcloud-vue', 'Object name field')"
			:placeholder="t('nextcloud-vue', 'Select a property to use as object name')" />
		<NcSelect
			v-model="schema.configuration.objectDescriptionField"
			:disabled="loading"
			:options="propertyOptions"
			:input-label="t('nextcloud-vue', 'Object description field')"
			:placeholder="t('nextcloud-vue', 'Select a property to use as object description')" />
		<NcSelect
			v-model="schema.configuration.objectImageField"
			:disabled="loading"
			:options="propertyOptions"
			:input-label="t('nextcloud-vue', 'Object image field')"
			:placeholder="t('nextcloud-vue', 'Select a property to use as object image representing the object. e.g. logo (should contain base64 encoded image)')" />
		<NcSelect
			v-model="schema.configuration.objectSummaryField"
			:disabled="loading"
			:options="propertyOptions"
			:input-label="t('nextcloud-vue', 'Object summary field')"
			:placeholder="t('nextcloud-vue', 'Select a property to use as object summary. e.g. summary, abstract, or excerpt')" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.configuration.allowFiles">
			{{ t('nextcloud-vue', 'Allow files') }}
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.configuration.autoPublish">
			{{ t('nextcloud-vue', 'Auto-publish objects') }}
		</NcCheckboxRadioSwitch>
		<NcTextField
			v-model="allowedTagsInput"
			:disabled="loading"
			:label="t('nextcloud-vue', 'Allowed tags (comma-separated)')"
			:placeholder="t('nextcloud-vue', 'image, document, audio, video')"
			@update:value="updateAllowedTags" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.hardValidation">
			{{ t('nextcloud-vue', 'Hard validation') }}
		</NcCheckboxRadioSwitch>
		<NcTextField :disabled="loading"
			:label="t('nextcloud-vue', 'Max depth')"
			type="number"
			:value.sync="schema.maxDepth" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.immutable">
			{{ t('nextcloud-vue', 'Immutable') }}
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.searchable">
			{{ t('nextcloud-vue', 'Searchable in SOLR') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcTextField,
	NcTextArea,
	NcNoteCard,
	NcCheckboxRadioSwitch,
	NcSelect,
} from '@nextcloud/vue'

/**
 * CnSchemaConfigurationTab — Configuration form tab for CnSchemaFormDialog.
 *
 * Renders schema metadata fields, composition (allOf/oneOf/anyOf), field mappings,
 * and configuration toggles. Mutates schemaItem directly.
 */
export default {
	name: 'CnSchemaConfigurationTab',
	components: {
		NcTextField,
		NcTextArea,
		NcNoteCard,
		NcCheckboxRadioSwitch,
		NcSelect,
	},
	props: {
		/** The full schema item — mutated directly */
		schemaItem: { type: Object, required: true },
		/** Disable state */
		loading: { type: Boolean, default: false },
		/** Available schemas for composition selects */
		availableSchemas: { type: Array, default: () => [] },
		/** Property names for field mapping selects */
		propertyOptions: { type: Array, default: () => [] },
		/** Pre-computed names for allOf note card display */
		allOfSchemaNames: { type: Array, default: () => [] },
	},
	data() {
		return {
			allowedTagsInput: '',
		}
	},
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
	},
	watch: {
		'schema.configuration.allowedTags': {
			immediate: true,
			handler(tags) {
				this.allowedTagsInput = (tags || []).join(', ')
			},
		},
	},
	methods: {
		t,
		updateAllowedTags(value) {
			if (!value || value.trim() === '') {
				this.$set(this.schema.configuration, 'allowedTags', [])
			} else {
				const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
				this.$set(this.schema.configuration, 'allowedTags', tags)
			}
		},
	},
}
</script>
