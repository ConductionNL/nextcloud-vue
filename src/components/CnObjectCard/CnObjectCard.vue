<template>
	<div
		class="cn-object-card"
		:class="{ 'cn-object-card--selected': selected, 'cn-object-card--board': isBoardLook }"
		@mousedown="onCardMouseDown"
		@click="onCardClick($event)"
		@auxclick="onCardAuxClick($event)">
		<!-- Selection checkbox -->
		<div v-if="selectable"
			class="cn-object-card__checkbox"
			@click.stop
			@auxclick.stop>
			<NcCheckboxRadioSwitch
				:modelValue="selected"
				@update:modelValue="$emit('select', object)" />
		</div>

		<!-- Card content -->
		<div class="cn-object-card__content">
			<!-- Header: image + title -->
			<div class="cn-object-card__header">
				<!-- Board look: the leading element, initials in a circle or an icon on a tint. -->
				<span
					v-if="isBoardLook && leadingKind"
					class="cn-object-card__leading"
					:class="`cn-object-card__leading--${leadingKind}`"
					data-testid="cn-object-card-leading"
					aria-hidden="true">
					<template v-if="leadingKind === 'initials'">{{ leading.initials }}</template>
					<CnIcon v-else :name="leading.icon" :size="20" />
				</span>
				<img
					v-if="imageUrl"
					:src="imageUrl"
					:alt="title"
					class="cn-object-card__image">

				<div class="cn-object-card__title-area">
					<h3 class="cn-object-card__title">
						<!-- Beside the title, not in the badges row: the badges
						     slot is the consumer's, and a lock is the library's
						     to report. A card whose consumer passes no badges
						     would otherwise show no padlock at all. -->
						<CnLockIndicator :object="object" :size="16" />
						{{ title }}
					</h3>
					<p v-if="description" class="cn-object-card__description">
						{{ truncatedDescription }}
					</p>
				</div>
				<!-- Board look, end of the head: the status pill, or else the row menu. -->
				<template v-if="isBoardLook">
					<CnStatusBadge
						v-if="statusPill"
						class="cn-object-card__status"
						:label="statusPill.label"
						:variant="statusPill.variant"
						data-testid="cn-object-card-status" />
					<div
						v-else-if="$slots.actions"
						class="cn-object-card__menu"
						@click.stop
						@auxclick.stop>
						<slot name="actions" :object="object" />
					</div>
				</template>
			</div>

			<!-- Badges slot -->
			<div v-if="$slots.badges" class="cn-object-card__badges">
				<slot name="badges" :object="object" />
			</div>

			<!-- Metadata: visible properties as label:value pairs -->
			<div v-if="metadataFields.length > 0" class="cn-object-card__metadata" :class="{ 'cn-object-card__metadata--facts': isBoardLook }">
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

			<!-- Board look: one footer action, with a muted meta text at the start. -->
			<div
				v-if="isBoardLook && footerAction"
				class="cn-object-card__footer"
				data-testid="cn-object-card-footer"
				@click.stop
				@auxclick.stop>
				<span v-if="footerAction.meta" class="cn-object-card__footer-meta">{{ footerAction.meta }}</span>
				<NcButton
					variant="secondary"
					class="cn-object-card__footer-action"
					data-testid="cn-object-card-footer-action"
					:aria-label="footerAction.ariaLabel || `${footerAction.label} ${title}`"
					@click="$emit('footer-action', object, footerAction)">
					{{ footerAction.label }}
				</NcButton>
			</div>
		</div>

		<!-- Actions slot -->
		<div v-if="$slots.actions && !isBoardLook"
			class="cn-object-card__actions"
			@click.stop
			@auxclick.stop>
			<slot name="actions" :object="object" />
		</div>
	</div>
</template>

<script>
import { NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'
import { normalizeLook } from '../../composables/useLook.js'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'
import { isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { formatValue } from '../../utils/schema.js'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnLockIndicator } from '../CnLockIndicator/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * CnObjectCard — Schema-configuration-driven card for object display.
 *
 * Uses `schema.configuration` to determine which fields map to the card title,
 * description, and image. Remaining visible properties are shown as metadata.
 *
 * ```vue
 * <CnObjectCard :object="publication" :schema="pubSchema">
 *   <template #actions="{ object }">
 *     <NcActions><NcActionButton @click="edit(object)">Edit</NcActionButton></NcActions>
 *   </template>
 * </CnObjectCard>
 * ```
 */
export default {
	name: 'CnObjectCard',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		CnCellRenderer,
		CnIcon,
		CnLockIndicator,
		CnStatusBadge,
	},

	inject: {
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). Metadata
		 * labels come from schema property titles, authored in English as the
		 * canonical source; the visible label is resolved through this function
		 * so it follows the user's language. Defaults to identity when used
		 * standalone (no CnAppRoot ancestor).
		 */
		cnTranslate: { default: () => (key) => key },
		/** The look CnAppRoot provides; `board` draws the record card of the screens. */
		cnLook: { default: 'nextcloud' },
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

		/**
		 * When true, a body click on a SELECTABLE card emits `click`
		 * (navigation) instead of toggling selection — selection then happens
		 * via the checkbox only. The card counterpart of CnIndexPage's
		 * `rowClickToView` (a table row click already navigates in that mode).
		 *
		 * @type {boolean}
		 */
		clickToView: {
			type: Boolean,
			default: false,
		},

		/**
		 * Board look: the status pill at the end of the head row, as a label
		 * (`"Open"`) or `{ label, variant }` with a CnStatusBadge variant
		 * (`success`, `warning`, `error`, `info`, `primary`, `default`).
		 * Without it the head row ends in the row menu, when there is one.
		 *
		 * @type {(string|{label: string, variant?: string})}
		 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action
		 */
		status: {
			type: [String, Object],
			default: null,
		},

		/**
		 * Board look: the leading element of the head row. `{ initials }`
		 * draws the initials in a 36px circle; `{ icon }` a schema icon in a
		 * 36px rounded square on a tint.
		 *
		 * @type {{initials?: string, icon?: string}}
		 */
		leading: {
			type: Object,
			default: null,
		},

		/**
		 * Board look: the card's one footer action. `{ label, meta?,
		 * ariaLabel? }`; `meta` is the 13px muted text at the start of the
		 * footer. Clicking emits `footer-action`.
		 *
		 * @type {{label: string, meta?: string, ariaLabel?: string}}
		 */
		footerAction: {
			type: Object,
			default: null,
		},

		/**
		 * The property keys the facts list shows, in order (manifest key
		 * `config.cardFields`). Without it the card shows the first
		 * `maxMetadata` visible properties, as before.
		 *
		 * @type {Array<string>}
		 */
		cardFields: {
			type: Array,
			default: null,
		},

		/** Maximum number of metadata fields to show */
		maxMetadata: {
			type: Number,
			default: 4,
		},
	},

	emits: ['click', 'select', 'aux-click', 'footer-action'],

	setup() {
		// Tell a deliberate card click apart from a text-selection drag.
		return useClickDragGuard()
	},

	computed: {
		/**
		 * Whether the record card of the board look is drawn.
		 *
		 * @return {boolean}
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * `initials`, `icon` or '' for the head row's leading element.
		 *
		 * @return {string}
		 */
		leadingKind() {
			if (this.leading && typeof this.leading.initials === 'string' && this.leading.initials !== '') {
				return 'initials'
			}
			return this.leading && typeof this.leading.icon === 'string' && this.leading.icon !== '' ? 'icon' : ''
		},

		/**
		 * The status as `{ label, variant }`, or null.
		 *
		 * @return {?{label: string, variant: string}}
		 */
		statusPill() {
			if (typeof this.status === 'string' && this.status !== '') {
				return { label: this.status, variant: 'default' }
			}
			if (this.status && typeof this.status.label === 'string' && this.status.label !== '') {
				return { label: this.status.label, variant: this.status.variant || 'default' }
			}
			return null
		},

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
			if (!this.description) {
				return null
			}
			if (this.description.length > 120) {
				return this.description.substring(0, 120) + '...'
			}
			return this.description
		},

		imageUrl() {
			const field = this.config.objectImageField
			if (field && this.object[field]) {
				return resolveImageUrl(this.object[field])
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
			if (!this.schema?.properties) {
				return []
			}

			// The page names the facts: those properties, in that order.
			if (Array.isArray(this.cardFields)) {
				return this.cardFields
					.filter((key) => typeof key === 'string' && this.schema.properties[key] && !this.configFields.includes(key))
					.map((key) => ({
						key,
						label: this.cnTranslate(this.schema.properties[key].title || key),
						value: this.object[key],
						property: this.schema.properties[key],
					}))
			}

			return Object.entries(this.schema.properties)
				.filter(([key, prop]) => {
					if (this.configFields.includes(key)) {
						return false
					}
					if (prop.visible === false) {
						return false
					}
					if (prop.type === 'object') {
						return false
					}
					if (prop.format === 'markdown') {
						return false
					}
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
					label: this.cnTranslate(prop.title || key),
					value: this.object[key],
					property: prop,
				}))
		},
	},

	methods: {
		formatValue,

		/**
		 * Card-body click: emits `select` when `selectable` (ignoring drags),
		 * otherwise emits `click` for navigation. With `clickToView`, a
		 * selectable card's body click navigates too — the checkbox is the
		 * only selection surface, mirroring the table's rowClickToView split.
		 *
		 * @param {MouseEvent} [event] The originating click event.
		 */
		onCardClick(event) {
			if (this.selectable && !this.clickToView) {
				if (this.wasDrag(event)) {
					return
				}
				/**
				 * @event select Emitted when the card toggles selection (clicking the body of a selectable card, or its checkbox).
				 * @type {object} The card's object.
				 */
				this.$emit('select', this.object)
				// Deprecation: selectable cards used to emit `click`. Keep emitting it
				// for listeners that still rely on it, but warn them to migrate to `select`.
				// `$.vnode.props`, not `$attrs`: `click` is a declared emit, and
				// Vue keeps declared emits out of `$attrs`.
				if (this.$.vnode.props?.onClick) {
					// eslint-disable-next-line no-console
					console.warn('[CnObjectCard] @click on selectable cards is deprecated; use @select instead.')
					this.$emit('click', this.object)
				}
				return
			}
			/**
			 * @event click Emitted when a non-selectable (or `clickToView`) card is clicked. Payload: `(object, event)` — the card's object and the native click event, for opening it in a new tab on a ctrl/cmd/shift click. A middle click emits `aux-click` instead. Selectable cards emit `select`; they also emit `click` (deprecated) when a `click` listener is present, so migrate selectable consumers to `@select`.
			 * @type {object} The card's object.
			 */
			this.$emit('click', this.object, event)
		},

		/**
		 * Card mousedown: record the press for the drag guard, and on a card a
		 * middle click opens, keep the browser from starting autoscroll.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 */
		onCardMouseDown(event) {
			this.onPointerDown(event)
			if (!this.selectable || this.clickToView) {
				preventMiddleClickAutoscroll(event)
			}
		},

		/**
		 * Card-body middle click: emits `aux-click`, not `click`, so an existing
		 * `click` listener that navigates never moves the current tab away.
		 * Ignored on a select-on-click card, on nested controls and on drags.
		 *
		 * @param {MouseEvent} event The auxclick event.
		 */
		onCardAuxClick(event) {
			if (!isRowMiddleClick(event) || this.wasDrag(event)) {
				return
			}
			if (this.selectable && !this.clickToView) {
				return
			}
			/**
			 * @event aux-click Emitted when a non-selectable (or `clickToView`) card is middle-clicked, for opening it in a new tab (see `openRowTarget`). Payload: `(object, event)` — the card's object and the native auxclick event.
			 * @type {object} The card's object.
			 */
			this.$emit('aux-click', this.object, event)
		},
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
