<template>
	<div
		class="cn-object-row"
		:class="{ 'cn-object-row--selected': selected }"
		@mousedown="onPointerDown"
		@click="onRowClick($event)">
		<!-- Selection checkbox -->
		<div v-if="selectable" class="cn-object-row__checkbox" @click.stop>
			<NcCheckboxRadioSwitch
				:model-value="selected"
				@update:model-value="$emit('select', object)" />
		</div>

		<!-- Leading icon / image — omitted entirely when nothing is configured
		     (no image, no icon name, no slot). -->
		<span v-if="hasLeadingIcon" class="cn-object-row__icon">
			<!-- @slot icon Replace the leading icon/image. -->
			<!-- @binding {object} object The row's object. -->
			<slot name="icon" :object="object">
				<img
					v-if="imageUrl"
					:src="imageUrl"
					:alt="''"
					width="24"
					height="24"
					class="cn-object-row__image">
				<CnIcon v-else-if="iconName" :name="iconName" :size="24" />
			</slot>
		</span>

		<!-- Main: title + subtitle -->
		<span class="cn-object-row__main">
			<span class="cn-object-row__title">{{ title }}</span>
			<span v-if="subtitle" class="cn-object-row__subtitle">{{ subtitle }}</span>
		</span>

		<!-- Badges (default: config-driven status badge) -->
		<span v-if="$scopedSlots.badges || badgeLabel" class="cn-object-row__badges">
			<!-- @slot badges Replace the badge area (overrides the config-driven badge). -->
			<!-- @binding {object} object The row's object. -->
			<slot name="badges" :object="object">
				<CnStatusBadge
					v-if="badgeLabel"
					:label="badgeLabel"
					:variant="badgeVariant"
					:color-map="badgeColorMap"
					size="small" />
			</slot>
		</span>

		<!-- Trailing actions -->
		<span v-if="$scopedSlots.actions" class="cn-object-row__actions" @click.stop>
			<!-- @slot actions Trailing actions (copy button, menu, …). -->
			<!-- @binding {object} object The row's object. -->
			<slot name="actions" :object="object" />
		</span>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'

/**
 * CnObjectRow — Compact single-line list row for object display.
 *
 * The list-mode counterpart to `CnObjectCard`: a leading icon (or image), a
 * name with an optional subtitle, an optional status badge, and a trailing
 * actions area. Which object fields map to each slot is resolved from the
 * `config` prop first, then from `schema.configuration` (so a schema that
 * already declares `objectNameField` / `objectDescriptionField` / `objectImageField`
 * works with zero extra config).
 *
 * ```vue
 * <CnObjectRow
 *   :object="secret"
 *   :schema="secretSchema"
 *   :config="{ subtitleField: 'url', iconName: 'Key' }">
 *   <template #actions="{ object }">
 *     <NcButton @click="copy(object)">Copy</NcButton>
 *   </template>
 * </CnObjectRow>
 * ```
 */
export default {
	name: 'CnObjectRow',

	components: {
		NcCheckboxRadioSwitch,
		CnIcon,
		CnStatusBadge,
	},

	props: {
		/** The object data */
		object: {
			type: Object,
			required: true,
		},
		/** Schema definition; `schema.configuration` supplies field defaults */
		schema: {
			type: Object,
			default: null,
		},
		/**
		 * Explicit field mapping. Every key is optional and overrides the
		 * schema-configuration default.
		 * @type {{ titleField?: string, subtitleField?: string, imageField?: string, iconField?: string, iconName?: string, badgeField?: string, badgeVariantField?: string, badgeVariant?: string, badgeColorMap?: object }}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},
		/** Whether this row is selected */
		selected: {
			type: Boolean,
			default: false,
		},
		/** Whether to show the selection checkbox */
		selectable: {
			type: Boolean,
			default: false,
		},
	},

	setup() {
		// Tell a deliberate row click apart from a text-selection drag.
		return useClickDragGuard()
	},

	computed: {
		/** Schema-level configuration block (empty when no schema). */
		schemaConfig() {
			return this.schema?.configuration || {}
		},

		title() {
			const field = this.config.titleField || this.schemaConfig.objectNameField
			if (field && this.object[field] != null) {
				return String(this.object[field])
			}
			return this.object.title || this.object.name || this.object.id || '—'
		},

		subtitle() {
			const field = this.config.subtitleField || this.schemaConfig.objectDescriptionField
			if (field && this.object[field] != null && this.object[field] !== '') {
				return String(this.object[field])
			}
			return null
		},

		imageUrl() {
			const field = this.config.imageField || this.schemaConfig.objectImageField
			if (field && this.object[field]) {
				return String(this.object[field])
			}
			return null
		},

		iconName() {
			const field = this.config.iconField
			if (field && this.object[field]) {
				return String(this.object[field])
			}
			return this.config.iconName || ''
		},

		/** Whether to render the leading icon column at all. */
		hasLeadingIcon() {
			return Boolean(this.imageUrl || this.iconName || this.$scopedSlots.icon)
		},

		badgeLabel() {
			const field = this.config.badgeField
			if (field && this.object[field] != null && this.object[field] !== '') {
				return String(this.object[field])
			}
			return null
		},

		badgeVariant() {
			const field = this.config.badgeVariantField
			if (field && this.object[field]) {
				return String(this.object[field])
			}
			return this.config.badgeVariant || 'default'
		},

		badgeColorMap() {
			return this.config.badgeColorMap || null
		},
	},

	methods: {
		/**
		 * Row-body click: emits `select` when `selectable` (ignoring drags),
		 * otherwise emits `click` for navigation.
		 *
		 * @param {MouseEvent} [event] The originating click event.
		 */
		onRowClick(event) {
			if (this.selectable) {
				if (this.wasDrag(event)) return
				/**
				 * @event select Emitted when a selectable row toggles selection (body or checkbox click).
				 * @type {object} The row's object.
				 */
				this.$emit('select', this.object)
				return
			}
			/**
			 * @event click Emitted when a non-selectable row is clicked (navigation).
			 * @type {object} The row's object.
			 */
			this.$emit('click', this.object)
		},
	},
}
</script>

<style scoped>
.cn-object-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
	cursor: pointer;
}

.cn-object-row:hover {
	background-color: var(--color-background-hover);
}

.cn-object-row--selected {
	/* Inset accent — never border-left (would shift cell content). */
	box-shadow: inset 3px 0 0 0 var(--color-primary-element);
	background-color: var(--color-primary-element-light);
}

.cn-object-row__checkbox {
	flex-shrink: 0;
}

.cn-object-row__icon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	color: var(--color-text-maxcontrast);
}

.cn-object-row__image {
	width: 24px;
	height: 24px;
	object-fit: contain;
	border-radius: var(--border-radius);
}

.cn-object-row__main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.cn-object-row__title {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-object-row__subtitle {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-object-row__badges {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-object-row__actions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}
</style>
