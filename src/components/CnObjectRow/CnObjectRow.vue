<template>
	<div
		class="cn-object-row"
		:class="{ 'cn-object-row--selected': selected }"
		@mousedown="onRowMouseDown"
		@click="onRowClick($event)"
		@auxclick="onRowAuxClick($event)">
		<!-- Selection checkbox -->
		<div v-if="selectable"
			class="cn-object-row__checkbox"
			@click.stop
			@auxclick.stop>
			<NcCheckboxRadioSwitch
				:modelValue="selected"
				@update:modelValue="$emit('select', object)" />
		</div>

		<!-- `config.leading`: one cell before the title, as a table cell renders
		     it (`{ key, widget?, widgetProps?, formatter? }`), e.g. the age
		     "6 dagen" in the team queue. -->
		<span
			v-if="leadingCell"
			class="cn-object-row__lead"
			:style="leadingCell.width ? { width: leadingCell.width } : null"
			data-testid="cn-object-row-lead">
			<CnCellRenderer
				:value="cellValue(leadingCell)"
				:formatter="leadingCell.formatter || null"
				:widget="leadingCell.widget || null"
				:widgetProps="leadingCell.widgetProps || undefined"
				:row="object" />
		</span>

		<!-- Leading icon / image — omitted entirely when nothing is configured
		     (no image, no icon name, no slot). -->
		<span v-if="hasLeadingIcon" class="cn-object-row__icon">
			<!-- @slot icon Replace the leading icon/image. -->
			<!-- @binding {object} object The row's object. -->
			<slot name="icon" :object="object">
				<img
					v-if="imageUrl"
					:src="imageUrl"
					alt=""
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
		<span v-if="$slots.badges || badgeLabel" class="cn-object-row__badges">
			<!-- @slot badges Replace the badge area (overrides the config-driven badge). -->
			<!-- @binding {object} object The row's object. -->
			<slot name="badges" :object="object">
				<CnStatusBadge
					v-if="badgeLabel"
					:label="badgeLabel"
					:variant="badgeVariant"
					:colorMap="badgeColorMap"
					size="small" />
			</slot>
		</span>

		<!-- `config.trailing`: cells after the badges, each in its own column
		     (the case type badge, the due text). -->
		<span
			v-for="(cell, index) in trailingCells"
			:key="cell.key + '-' + index"
			class="cn-object-row__trail"
			:style="cell.width ? { width: cell.width } : null"
			data-testid="cn-object-row-trail">
			<CnCellRenderer
				:value="cellValue(cell)"
				:formatter="cell.formatter || null"
				:widget="cell.widget || null"
				:widgetProps="cell.widgetProps || undefined"
				:row="object" />
		</span>

		<!-- Trailing actions -->
		<span v-if="$slots.actions"
			class="cn-object-row__actions"
			@click.stop
			@auxclick.stop>
			<!-- @slot actions Trailing actions (copy button, menu, …). -->
			<!-- @binding {object} object The row's object. -->
			<slot name="actions" :object="object" />
		</span>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'
import { joinTemplateParts } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'
import { isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

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
		CnCellRenderer,
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
		 *
		 * `subtitleTemplate` fills `{field}` tokens from the row (empty parts and
		 * their separators drop). `leading` (one cell) and `trailing` (a cell or
		 * a list) draw cells as a table column does, `{ key, widget?,
		 * widgetProps?, formatter? }`: `{ key: "createdAt", widget: "age" }`
		 * reads "6 dagen", `{ key: "deadline", widget: "date", widgetProps: {
		 * due: {} } }` the due text. A cell's `width` (CSS) lines the column
		 * up across rows.
		 *
		 * @type {{ titleField?: string, subtitleField?: string, subtitleTemplate?: string, imageField?: string, iconField?: string, iconName?: string, badgeField?: string, badgeVariantField?: string, badgeVariant?: string, badgeColorMap?: object, leading?: object, trailing?: (object|Array<object>) }}
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

	// Vue 2 had a separate listener channel, so a consumer's `@click` only ever
	// saw `$emit('click')`. In Vue 3 an UNDECLARED event name stays a
	// fallthrough attribute: `onClick` lands on the root `<div>` as a native
	// handler, so the consumer's handler fires once from the DOM click and
	// again from `$emit('click', object)` — twice per click, with different
	// payloads. Declaring the names here removes them from `$attrs`, which is
	// also what stops VTU v2 recording the native DOM event into `emitted()`.
	emits: ['select', 'click', 'aux-click'],

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
			if (field && this.object[field] !== null && this.object[field] !== undefined) {
				return String(this.object[field])
			}
			return this.object.title || this.object.name || this.object.id || '—'
		},

		subtitle() {
			if (typeof this.config.subtitleTemplate === 'string' && this.config.subtitleTemplate !== '') {
				const text = joinTemplateParts(this.config.subtitleTemplate, (key) => {
					const value = readPath(this.object, key)
					return value === null || value === undefined ? '' : String(value)
				})
				return text.trim() || null
			}
			const field = this.config.subtitleField || this.schemaConfig.objectDescriptionField
			if (field && this.object[field] !== null && this.object[field] !== undefined && this.object[field] !== '') {
				return String(this.object[field])
			}
			return null
		},

		imageUrl() {
			const field = this.config.imageField || this.schemaConfig.objectImageField
			if (field && this.object[field]) {
				return resolveImageUrl(String(this.object[field]))
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
			return Boolean(this.imageUrl || this.iconName || this.$slots.icon)
		},

		badgeLabel() {
			const field = this.config.badgeField
			if (field && this.object[field] !== null && this.object[field] !== undefined && this.object[field] !== '') {
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

		/**
		 * The `config.leading` cell, or null.
		 *
		 * @spec openspec/changes/index-row-list-cells/specs/object-row/spec.md#requirement-a-list-row-can-carry-leading-and-trailing-cells
		 * @return {object|null}
		 */
		leadingCell() {
			const cell = this.config.leading
			return cell && typeof cell === 'object' && typeof cell.key === 'string' && cell.key !== '' ? cell : null
		},

		/**
		 * The `config.trailing` cells (one object or a list), those with a key.
		 *
		 * @spec openspec/changes/index-row-list-cells/specs/object-row/spec.md#requirement-a-list-row-can-carry-leading-and-trailing-cells
		 * @return {Array<object>}
		 */
		trailingCells() {
			const cells = this.config.trailing
			const list = Array.isArray(cells) ? cells : (cells && typeof cells === 'object' ? [cells] : [])
			return list.filter((cell) => cell && typeof cell === 'object' && typeof cell.key === 'string' && cell.key !== '')
		},
	},

	methods: {
		/**
		 * A cell's value: the dot-path `key` read off the row.
		 *
		 * @param {{key: string}} cell The cell.
		 * @return {unknown} The value.
		 */
		cellValue(cell) {
			return readPath(this.object, cell.key)
		},

		/**
		 * Row-body click: emits `select` when `selectable` (ignoring drags),
		 * otherwise emits `click` for navigation.
		 *
		 * @param {MouseEvent} [event] The originating click event.
		 */
		onRowClick(event) {
			if (this.selectable) {
				if (this.wasDrag(event)) {
					return
				}
				/**
				 * @event select Emitted when a selectable row toggles selection (body or checkbox click).
				 * @type {object} The row's object.
				 */
				this.$emit('select', this.object)
				return
			}
			/**
			 * @event click Emitted when a non-selectable row is clicked (navigation). Payload: `(object, event)` — the row's object and the native click event, for opening it in a new tab on a ctrl/cmd/shift click. A middle click emits `aux-click` instead.
			 * @type {object} The row's object.
			 */
			this.$emit('click', this.object, event)
		},

		/**
		 * Row mousedown: record the press for the drag guard, and on a
		 * non-selectable row keep a middle press from starting autoscroll.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 */
		onRowMouseDown(event) {
			this.onPointerDown(event)
			if (!this.selectable) {
				preventMiddleClickAutoscroll(event)
			}
		},

		/**
		 * Row-body middle click on a non-selectable row: emits `aux-click`, not
		 * `click`, so an existing `click` listener that navigates never moves
		 * the current tab away.
		 *
		 * @param {MouseEvent} event The auxclick event.
		 */
		onRowAuxClick(event) {
			if (this.selectable || !isRowMiddleClick(event)) {
				return
			}
			/**
			 * @event aux-click Emitted when a non-selectable row is middle-clicked, for opening it in a new tab (see `openRowTarget`). Payload: `(object, event)` — the row's object and the native auxclick event.
			 * @type {object} The row's object.
			 */
			this.$emit('aux-click', this.object, event)
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

.cn-object-row__lead,
.cn-object-row__trail {
	flex: 0 0 auto;
	min-width: 0;
}

.cn-object-row__lead {
	font-weight: 600;
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
