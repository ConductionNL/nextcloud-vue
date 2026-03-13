<template>
	<div class="cn-schema-form__form-editor">
		<NcTextArea :disabled="loading"
			label="Description"
			:value.sync="schema.description" />
		<NcTextArea :disabled="loading"
			label="Summary"
			:value.sync="schema.summary" />
		<NcTextField :disabled="loading"
			label="Slug"
			:value.sync="schema.slug" />

		<!-- Schema Composition Section -->
		<div>
			<h3>Schema Composition (JSON Schema)</h3>

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
				input-label="allOf - Inherits from ALL schemas (Recommended)"
				placeholder="Select schemas to inherit from (supports multiple parents)">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span>{{ title }}</span>
						<span v-if="description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.allOf && schema.allOf.length > 0" type="info">
				<p><strong>allOf - Multiple Inheritance</strong></p>
				<p>Instance must validate against ALL selected schemas. Properties from all parent schemas are merged. This is the recommended pattern for schema extension and multiple inheritance.</p>
				<p><strong>Important:</strong> Child schemas can only ADD constraints, never relax them (Liskov Substitution Principle). Metadata (title, description, order) can be overridden.</p>
				<div v-if="allOfSchemaNames.length > 0">
					<strong>Parent Schemas:</strong>
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
				input-label="oneOf - Exactly ONE schema must match"
				placeholder="Select schemas (instance must match exactly one)">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span>{{ title }}</span>
						<span v-if="description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.oneOf && schema.oneOf.length > 0" type="info">
				<p><strong>oneOf - Mutually Exclusive</strong></p>
				<p>Instance must validate against EXACTLY ONE of the selected schemas. Properties are NOT merged. Use for discriminated unions or type variants.</p>
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
				input-label="anyOf - At least ONE schema must match"
				placeholder="Select schemas (instance must match at least one)">
				<template #option="{ title, description }">
					<div class="cn-schema-form__schema-option">
						<span>{{ title }}</span>
						<span v-if="description">{{ description }}</span>
					</div>
				</template>
			</NcSelect>
			<NcNoteCard v-if="schema.anyOf && schema.anyOf.length > 0" type="info">
				<p><strong>anyOf - Flexible Composition</strong></p>
				<p>Instance must validate against AT LEAST ONE of the selected schemas. Properties are NOT merged. More permissive than oneOf.</p>
			</NcNoteCard>
		</div>
		<NcSelect
			v-model="schema.configuration.objectNameField"
			:disabled="loading"
			:options="propertyOptions"
			input-label="Object Name Field"
			placeholder="Select a property to use as object name" />
		<NcSelect
			v-model="schema.configuration.objectDescriptionField"
			:disabled="loading"
			:options="propertyOptions"
			input-label="Object Description Field"
			placeholder="Select a property to use as object description" />
		<NcSelect
			v-model="schema.configuration.objectImageField"
			:disabled="loading"
			:options="propertyOptions"
			input-label="Object Image Field"
			placeholder="Select a property to use as object image representing the object. e.g. logo (should contain base64 encoded image)" />
		<NcSelect
			v-model="schema.configuration.objectSummaryField"
			:disabled="loading"
			:options="propertyOptions"
			input-label="Object Summary Field"
			placeholder="Select a property to use as object summary. e.g. summary, abstract, or excerpt" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.configuration.allowFiles">
			Allow Files
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.configuration.autoPublish">
			Auto-Publish Objects
		</NcCheckboxRadioSwitch>
		<NcTextField
			v-model="allowedTagsInput"
			:disabled="loading"
			label="Allowed Tags (comma-separated)"
			placeholder="image, document, audio, video"
			@update:value="updateAllowedTags" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.hardValidation">
			Hard Validation
		</NcCheckboxRadioSwitch>
		<NcTextField :disabled="loading"
			label="Max Depth"
			type="number"
			:value.sync="schema.maxDepth" />
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.immutable">
			Immutable
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch
			:disabled="loading"
			:checked.sync="schema.searchable">
			Searchable in SOLR
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
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
