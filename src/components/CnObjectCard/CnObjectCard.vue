<template>
	<div
		class="cn-object-card"
		:class="{ 'cn-object-card--selected': selected }"
		@click="$emit('click', object)">
		<!-- Selection checkbox -->
		<div v-if="selectable" class="cn-object-card__checkbox" @click.stop>
			<NcCheckboxRadioSwitch
				:checked="selected"
				@update:checked="$emit('select', object)" />
		</div>

		<!-- Card content -->
		<div class="cn-object-card__content">
			<!-- Header: image + title -->
			<div class="cn-object-card__header">
				<img
					v-if="imageUrl"
					:src="imageUrl"
					:alt="title"
					class="cn-object-card__image">

				<div class="cn-object-card__title-area">
					<h3 class="cn-object-card__title">
						{{ title }}
					</h3>
					<p v-if="description" class="cn-object-card__description">
						{{ truncatedDescription }}
					</p>
				</div>
			</div>

			<!-- Badges slot -->
			<div v-if="$scopedSlots.badges" class="cn-object-card__badges">
				<slot name="badges" :object="object" />
			</div>

			<!-- Metadata: visible properties as label:value pairs -->
			<div v-if="metadataFields.length > 0" class="cn-object-card__metadata">
				<slot name="metadata" :object="object" :fields="metadataFields">
					<div
						v-for="field in metadataFields"
						:key="field.key"
						class="cn-object-card__meta-item">
						<span class="cn-object-card__meta-label">{{ field.label }}</span>
						<CnCellRenderer
							:value="field.value"
							:property="field.property"
							:truncate="60" />
					</div>
				</slot>
			</div>
		</div>

		<!-- Actions slot -->
		<div v-if="$scopedSlots.actions" class="cn-object-card__actions" @click.stop>
			<slot name="actions" :object="object" />
		</div>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { formatValue } from '../../utils/schema.js'

/**
 * CnObjectCard — Schema-configuration-driven card for object display.
 *
 * Uses `schema.configuration` to determine which fields map to the card title,
 * description, and image. Remaining visible properties are shown as metadata.
 *
 * @example
 * <CnObjectCard :object="publication" :schema="pubSchema">
 *   <template #actions="{ object }">
 *     <NcActions><NcActionButton @click="edit(object)">Edit</NcActionButton></NcActions>
 *   </template>
 * </CnObjectCard>
 */
export default {
	name: 'CnObjectCard',

	components: {
		NcCheckboxRadioSwitch,
		CnCellRenderer,
	},

	props: {
		/** The object data */
		object: {
			type: Object,
			required: true,
		},
		/** Schema definition with properties and configuration */
		schema: {
			type: Object,
			required: true,
		},
		/** Whether this card is selected */
		selected: {
			type: Boolean,
			default: false,
		},
		/** Whether to show selection checkbox */
		selectable: {
			type: Boolean,
			default: false,
		},
		/** Maximum number of metadata fields to show */
		maxMetadata: {
			type: Number,
			default: 4,
		},
	},

	computed: {
		config() {
			return this.schema?.configuration || {}
		},

		title() {
			const field = this.config.objectNameField
			if (field && this.object[field]) {
				return String(this.object[field])
			}
			return this.object.title || this.object.name || this.object.id || '—'
		},

		description() {
			const field = this.config.objectDescriptionField
			if (field && this.object[field]) {
				return String(this.object[field])
			}
			return null
		},

		truncatedDescription() {
			if (!this.description) return null
			if (this.description.length > 120) {
				return this.description.substring(0, 120) + '...'
			}
			return this.description
		},

		imageUrl() {
			const field = this.config.objectImageField
			if (field && this.object[field]) {
				return this.object[field]
			}
			return null
		},

		/** Fields excluded from metadata (already shown as title/desc/image) */
		configFields() {
			return [
				this.config.objectNameField,
				this.config.objectDescriptionField,
				this.config.objectSummaryField,
				this.config.objectImageField,
			].filter(Boolean)
		},

		/** Remaining visible properties for the metadata section */
		metadataFields() {
			if (!this.schema?.properties) return []

			return Object.entries(this.schema.properties)
				.filter(([key, prop]) => {
					if (this.configFields.includes(key)) return false
					if (prop.visible === false) return false
					if (prop.type === 'object') return false
					if (prop.format === 'markdown') return false
					return true
				})
				.sort(([, a], [, b]) => {
					const orderA = typeof a.order === 'number' ? a.order : Infinity
					const orderB = typeof b.order === 'number' ? b.order : Infinity
					return orderA - orderB
				})
				.slice(0, this.maxMetadata)
				.map(([key, prop]) => ({
					key,
					label: prop.title || key,
					value: this.object[key],
					property: prop,
				}))
		},
	},

	methods: {
		formatValue,
	},
}
</script>

<style scoped>
.cn-object-card {
	display: flex;
	gap: 12px;
	padding: 16px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
	cursor: pointer;
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.cn-object-card:hover {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px var(--color-box-shadow);
}

.cn-object-card--selected {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-object-card__checkbox {
	flex-shrink: 0;
	padding-top: 2px;
}

.cn-object-card__content {
	flex: 1;
	min-width: 0;
}

.cn-object-card__header {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}

.cn-object-card__image {
	width: 48px;
	height: 48px;
	border-radius: var(--border-radius);
	object-fit: cover;
	flex-shrink: 0;
}

.cn-object-card__title-area {
	flex: 1;
	min-width: 0;
}

.cn-object-card__title {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-object-card__description {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	line-height: 1.4;
}

.cn-object-card__badges {
	margin-top: 8px;
}

.cn-object-card__metadata {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 8px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
}

.cn-object-card__meta-item {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-object-card__meta-label {
	font-size: 11px;
	font-weight: 500;
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.3px;
}

.cn-object-card__actions {
	flex-shrink: 0;
}
</style>
