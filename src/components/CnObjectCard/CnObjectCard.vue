<template>
	<div
		class="cn-object-card"
		:class="[{ 'cn-object-card--selected': selected, 'cn-object-card--board': isBoardLook }, accentVariant && ['cn-object-card--accent', `cn-object-card--accent-${accentVariant}`]]"
		@mousedown="onCardMouseDown"
		@click="onCardClick($event)"
		@auxclick="onCardAuxClick($event)">
		<!-- Selection checkbox (a record card draws it in its head row) -->
		<div v-if="selectable && !recordLayout"
			class="cn-object-card__checkbox"
			@click.stop
			@auxclick.stop>
			<NcCheckboxRadioSwitch
				:modelValue="selected"
				@update:modelValue="$emit('select', object)" />
		</div>

		<!-- Board look, record layout (`layout`): head pill and number, title,
		     meta line, then a footer with a pill and a date. -->
		<div v-if="recordLayout" class="cn-object-card__content cn-object-card__record" data-testid="cn-object-card-record">
			<div class="cn-object-card__record-head">
				<div v-if="selectable"
					class="cn-object-card__checkbox"
					@click.stop
					@auxclick.stop>
					<NcCheckboxRadioSwitch
						:modelValue="selected"
						@update:modelValue="$emit('select', object)" />
				</div>
				<CnStatusBadge
					v-if="recordHeadPill"
					class="cn-object-card__record-pill"
					:label="recordHeadPill.label"
					:variant="recordHeadPill.variant"
					data-testid="cn-object-card-head-pill">
					<template v-if="recordHeadPill.icon" #icon>
						<CnIcon :name="recordHeadPill.icon" :size="14" />
					</template>
				</CnStatusBadge>
				<span v-if="recordNumber" class="cn-object-card__record-number" data-testid="cn-object-card-number">{{ recordNumber }}</span>
				<div
					v-if="$slots.actions"
					class="cn-object-card__menu"
					@click.stop
					@auxclick.stop>
					<slot name="actions" :object="object" />
				</div>
			</div>
			<h3 class="cn-object-card__title">
				<CnLockIndicator :object="object" :size="16" />
				{{ recordTitle }}
			</h3>
			<!-- A part whose field names a page column with a widget draws through
			     it, as its table cell does; the rest are text. -->
			<p v-if="recordMetaParts.length > 0" class="cn-object-card__record-meta" data-testid="cn-object-card-meta">
				<template v-for="(part, index) in recordMetaParts" :key="part.field">
					<span v-if="index > 0" aria-hidden="true"> · </span>
					<CnCellRenderer
						v-if="part.column && part.column.widget"
						:value="part.value"
						:widget="part.column.widget"
						:widgetProps="part.column.widgetProps || undefined"
						:formatter="part.column.formatter || null"
						:formatterOptions="part.column.formatterOptions || null"
						:row="object" />
					<span v-else>{{ part.text }}</span>
				</template>
			</p>
			<p v-if="recordNote"
				class="cn-object-card__record-note"
				:class="recordNote.tone ? 'cn-object-card__record-note--' + recordNote.tone : ''"
				data-testid="cn-object-card-note">
				{{ recordNote.text }}
			</p>
			<p v-if="recordDescription" class="cn-object-card__record-description" data-testid="cn-object-card-description">
				{{ recordDescription }}
			</p>
			<div v-if="recordChips.length > 0" class="cn-object-card__record-chips" data-testid="cn-object-card-chips">
				<CnStatusBadge
					v-for="chip in recordChips"
					:key="chip.field"
					class="cn-object-card__record-pill"
					:label="chip.label"
					:variant="chip.variant">
					<template v-if="chip.icon" #icon>
						<CnIcon :name="chip.icon" :size="14" />
					</template>
				</CnStatusBadge>
			</div>
			<div v-if="$slots.badges" class="cn-object-card__badges">
				<slot name="badges" :object="object" />
			</div>
			<div v-if="recordFootPill || recordFootCell || recordDate" class="cn-object-card__record-foot" data-testid="cn-object-card-foot">
				<CnStatusBadge
					v-if="recordFootPill"
					class="cn-object-card__record-pill"
					:label="recordFootPill.label"
					:variant="recordFootPill.variant"
					data-testid="cn-object-card-foot-pill">
					<template v-if="recordFootPill.icon" #icon>
						<CnIcon :name="recordFootPill.icon" :size="14" />
					</template>
				</CnStatusBadge>
				<span v-if="recordFootCell" class="cn-object-card__record-foot-cell" data-testid="cn-object-card-foot-cell">
					<CnCellRenderer
						v-if="recordFootCell.column && recordFootCell.column.widget"
						:value="recordFootCell.value"
						:widget="recordFootCell.column.widget"
						:widgetProps="recordFootCell.column.widgetProps || undefined"
						:formatter="recordFootCell.column.formatter || null"
						:formatterOptions="recordFootCell.column.formatterOptions || null"
						:row="object" />
					<template v-else>{{ recordFootCell.text }}</template>
				</span>
				<span
					v-if="recordDate"
					class="cn-object-card__record-date"
					:class="[recordDateTone ? 'cn-object-card__record-date--' + recordDateTone : '']"
					data-testid="cn-object-card-date">{{ recordDate }}</span>
			</div>
		</div>

		<!-- Card content -->
		<div v-else class="cn-object-card__content">
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
						<span
							v-if="accentVariant && accent.icon"
							class="cn-object-card__accent-icon"
							data-testid="cn-object-card-accent-icon"
							:role="accent.label ? 'img' : null"
							:aria-label="accent.label || null"
							:aria-hidden="accent.label ? null : 'true'"
							:title="accent.label || null">
							<CnIcon :name="accent.icon" :size="16" />
						</span>
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
							:formatter="field.column && field.column.formatter || null"
							:formatterOptions="field.column && field.column.formatterOptions || null"
							:widget="field.column && field.column.widget || null"
							:widgetProps="field.column && field.column.widgetProps || undefined"
							:row="object"
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'
import { normalizeLook } from '../../composables/useLook.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { formatBoardDate } from '../../utils/boardDate.js'
import { resolveDateVariant } from '../../utils/dateVariant.js'
import { pillLook } from '../../utils/detailActionModel.js'
import { resolveDue } from '../../utils/dueText.js'
import { readPath } from '../../utils/readPath.js'
import { resolveImageUrl } from '../../utils/resolveImageUrl.js'
import { isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { formatValue } from '../../utils/schema.js'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnLockIndicator } from '../CnLockIndicator/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

const ACCENT_VARIANTS = ['success', 'warning', 'error', 'info', 'primary']

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
		/** The cell formatters CnAppRoot provides, for a layout part whose page column names one. */
		cnFormatters: { default: () => ({}) },
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
		 * A status accent: a colored border at the start of the card and,
		 * with `icon`, a colored icon before the title. `variant` is one of
		 * `success`, `warning`, `error`, `info` or `primary`; `icon` is a
		 * name registered with CnIcon; `label` names the status for screen
		 * readers and as the icon's tooltip.
		 *
		 * @type {{variant: string, icon?: string, label?: string}}
		 */
		accent: {
			type: Object,
			default: null,
		},

		/**
		 * Board look: the record layout (manifest key `config.cardLayout`).
		 * Every part names a field of the object (a dot path) and is left out
		 * while that field is empty:
		 * `{ headPill, number, title, meta, footerPill, footerDate }`.
		 * A pill is `{ field, colorMap?, labels?, variant? }`: `colorMap` maps a
		 * value to a CnStatusBadge variant (ignoring case), `labels` a value to
		 * the text shown. `meta` is a list of fields, joined with " · ".
		 * `footerDate` is `{ field, label?, overdueVariant? }`, drawn as
		 * "Termijn 5 okt", in `overdueVariant`'s tone (`error`) once the date
		 * has passed. `description` is a field (or `{ field, maxLength? }`, cut
		 * at 140 characters by default) drawn under the meta line. `chips` is a
		 * list of `{ field, formatter?, formatterOptions?, colorMap?, labels?,
		 * variant? }`, each a pill whose text reads through the formatter.
		 * `note` is `{ field, formatter?, formatterOptions?, tone? }`, a line
		 * under the meta line in the `purple` or `teal` pill ink.
		 * Without it the card keeps its head, facts and action.
		 *
		 * @type {{headPill?: object, number?: string, title?: string, meta?: Array<string>, description?: (string|{field: string, maxLength?: number}), chips?: Array<object>, note?: {field: string, formatter?: string, formatterOptions?: object, tone?: string}, footerPill?: object, footerDate?: {field: string, label?: string, overdueVariant?: string}}}
		 * @spec openspec/changes/board-record-card-layout/specs/board-record-card-layout/spec.md#requirement-a-board-card-can-draw-the-record-layout-from-config
		 */
		layout: {
			type: Object,
			default: null,
		},

		/**
		 * The referenced records' colour and icon names, by field and id
		 * (`{ [field]: { [id]: { color, icon } } }`, CnIndexPage reads them).
		 * A record layout pill with `resolve: { colorField?, iconField? }` takes
		 * its record's tone and icon from here.
		 *
		 * @type {object}
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-card-pill-takes-its-tone-and-icon-from-the-referenced-record
		 */
		pillLooks: {
			type: Object,
			default: () => ({}),
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

		/**
		 * The page's columns by key: a fact whose key names a column renders
		 * through that column's label, formatter and widget, as the table does.
		 *
		 * @type {object}
		 */
		cardFieldColumns: {
			type: Object,
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

		/**
		 * The record layout when the board look draws it, else null.
		 *
		 * @return {?object}
		 * @spec openspec/changes/board-record-card-layout/specs/board-record-card-layout/spec.md#requirement-a-board-card-can-draw-the-record-layout-from-config
		 */
		recordLayout() {
			return this.isBoardLook && this.layout && typeof this.layout === 'object' ? this.layout : null
		},

		/**
		 * The record layout's head pill, or null.
		 *
		 * @return {?{label: string, variant: string}}
		 */
		recordHeadPill() {
			return this.recordLayout ? this.layoutPill(this.recordLayout.headPill) : null
		},

		/**
		 * The record layout's footer pill, or null.
		 *
		 * @return {?{label: string, variant: string}}
		 */
		recordFootPill() {
			return this.recordLayout ? this.layoutPill(this.recordLayout.footerPill) : null
		},

		/**
		 * The record number at the end of the head, or ''.
		 *
		 * @return {string}
		 */
		recordNumber() {
			return this.recordLayout ? this.layoutText(this.recordLayout.number) : ''
		},

		/**
		 * The title: the layout's `title` field, else the card's own title.
		 *
		 * @return {string}
		 */
		recordTitle() {
			const text = this.recordLayout ? this.layoutText(this.recordLayout.title) : ''
			return text !== '' ? text : this.title
		},

		/**
		 * The meta line: the layout's `meta` fields that hold a value, joined.
		 *
		 * @return {string}
		 */
		recordMeta() {
			return this.recordMetaParts.map((part) => part.text).join(' · ')
		},

		/**
		 * The meta line's parts that hold a value: each with its text and, when
		 * its field names a page column, that column (whose widget draws it).
		 *
		 * @return {Array<{field: string, value: unknown, text: string, column: ?object}>}
		 */
		recordMetaParts() {
			const fields = this.recordLayout && Array.isArray(this.recordLayout.meta) ? this.recordLayout.meta : []
			return fields
				.map((part) => this.metaPart(part))
				.filter((part) => part !== null && part.text !== '')
		},

		/**
		 * The `note` line under the meta line, read as a meta part is, with
		 * its tone (`purple`, `teal`), or null while it is empty.
		 *
		 * @return {?{text: string, tone: string}}
		 * @spec openspec/changes/card-layout-note/specs/card-layout-note/spec.md#requirement-a-record-card-can-draw-a-toned-note-under-its-meta-line
		 */
		recordNote() {
			const def = this.recordLayout ? this.recordLayout.note : null
			const part = def ? this.metaPart(def) : null
			if (!part || part.text === '') {
				return null
			}
			const tone = ['purple', 'teal'].includes(def.tone) ? def.tone : ''
			return { text: part.text, tone }
		},

		/**
		 * The footer's `footerCell` part, read as a meta part is (through the
		 * page column it names), or null while it is empty.
		 *
		 * @return {?{field: string, value: unknown, text: string, column: ?object}}
		 */
		recordFootCell() {
			const part = this.recordLayout ? this.metaPart(this.recordLayout.footerCell) : null
			return part && part.text !== '' ? part : null
		},

		/**
		 * The footer date with its label ("Termijn 5 okt"), or ''.
		 *
		 * @return {string}
		 */
		recordDate() {
			const def = this.recordLayout ? this.recordLayout.footerDate : null
			if (!def || typeof def.field !== 'string') {
				return ''
			}
			const date = formatBoardDate(readPath(this.object, def.field))
			if (date === '') {
				return ''
			}
			return typeof def.label === 'string' && def.label !== '' ? `${this.cnTranslate(def.label)} ${date}` : date
		},

		/**
		 * The tone of the footer date: `overdueVariant` once the date has
		 * passed, else ''.
		 *
		 * @return {string}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-board-card-can-draw-a-description-chips-and-an-overdue-date
		 */
		recordDateTone() {
			const def = this.recordLayout ? this.recordLayout.footerDate : null
			if (!def || typeof def.field !== 'string' || typeof def.overdueVariant !== 'string' || def.overdueVariant === '') {
				return ''
			}
			return this.dueVariant(readPath(this.object, def.field), {}) === 'error' ? def.overdueVariant : ''
		},

		/**
		 * The description line, cut at `maxLength` characters (140 by
		 * default) with an ellipsis, or ''.
		 *
		 * @return {string}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-board-card-can-draw-a-description-chips-and-an-overdue-date
		 */
		recordDescription() {
			const def = this.recordLayout ? this.recordLayout.description : null
			const field = typeof def === 'string' ? def : (def && typeof def.field === 'string' ? def.field : '')
			const text = this.layoutText(field).trim()
			const max = def && typeof def === 'object' && Number.isInteger(def.maxLength) && def.maxLength > 0 ? def.maxLength : 140
			return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
		},

		/**
		 * The chips: one pill per `chips` entry whose field holds a value, its
		 * text read through the entry's formatter (a status uuid as its name).
		 *
		 * @return {Array<{field: string, label: string, variant: string}>}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-board-card-can-draw-a-description-chips-and-an-overdue-date
		 */
		recordChips() {
			const chips = this.recordLayout && Array.isArray(this.recordLayout.chips) ? this.recordLayout.chips : []
			return chips
				.map((def) => (typeof def === 'string' ? { field: def } : def))
				.filter((def) => def && typeof def.field === 'string' && def.field !== '')
				.map((def) => {
					const column = typeof def.formatter === 'string' ? { formatter: def.formatter, formatterOptions: def.formatterOptions } : undefined
					const label = this.layoutText(def.field, column)
					if (label === '') {
						return null
					}
					const raw = readPath(this.object, def.field)
					const mapped = def.colorMap && typeof def.colorMap === 'object' ? def.colorMap[String(raw)] || def.colorMap[String(raw).toLowerCase()] : undefined
					const labels = def.labels && typeof def.labels === 'object' ? def.labels : {}
					const shown = typeof labels[String(raw)] === 'string' ? this.cnTranslate(labels[String(raw)]) : label
					const variant = mapped || def.variant
					return this.withLook({ field: def.field, label: shown, variant: isBadgeVariant(variant) ? variant : 'default' }, def)
				})
				.filter(Boolean)
		},

		/**
		 * The accent variant when it is a known one, else ''.
		 *
		 * @return {string}
		 */
		accentVariant() {
			const variant = this.accent?.variant
			return ACCENT_VARIANTS.includes(variant) ? variant : ''
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
					.map((key) => this.metadataField(key, this.schema.properties[key]))
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
				.map(([key, prop]) => this.metadataField(key, prop))
		},
	},

	methods: {
		/**
		 * One meta part: a field name reads through the page column it names;
		 * `{ field, formatter?, formatterOptions? }` reads as plain text through
		 * its own formatter, so a column's widget (a badge) stays in the table.
		 *
		 * @param {string|{field: string, formatter?: string, formatterOptions?: object}} part The part.
		 * @return {?{field: string, value: unknown, text: string, column: ?object}} The part, or null when it names no field.
		 * @spec openspec/changes/card-layout-part-formatter/specs/card-layout-part-formatter/spec.md#requirement-a-card-meta-part-can-name-its-own-formatter
		 */
		metaPart(part) {
			if (typeof part === 'string' && part !== '') {
				return { field: part, value: readPath(this.object, part), text: this.layoutText(part), column: this.layoutColumn(part) }
			}
			if (!part || typeof part !== 'object' || typeof part.field !== 'string' || part.field === '') {
				return null
			}
			const column = typeof part.formatter === 'string' ? { formatter: part.formatter, formatterOptions: part.formatterOptions } : null
			return { field: part.field, value: readPath(this.object, part.field), text: this.layoutText(part.field, column), column }
		},

		/**
		 * A field's value as text: a person or a record by its display name,
		 * title or name, anything else as a string. '' for an empty value or
		 * a field that is not named.
		 *
		 * @param {unknown} field A dot path into the object.
		 * @param {?object} [own] The column to read through instead of the one the field names.
		 * @return {string}
		 */
		layoutText(field, own) {
			if (typeof field !== 'string' || field === '') {
				return ''
			}
			const value = readPath(this.object, field)
			if (value === null || value === undefined || value === '') {
				return ''
			}
			// A part whose field names a page column with a formatter reads as
			// its table cell does (a case type uuid as its name).
			const column = own === undefined ? this.layoutColumn(field) : own
			const format = column && column.formatter && this.cnFormatters ? this.cnFormatters[column.formatter] : null
			if (typeof format === 'function') {
				const formatted = format(value, this.object, this.schema?.properties?.[field], column.formatterOptions || undefined)
				return formatted === null || formatted === undefined ? '' : String(formatted)
			}
			if (typeof value === 'object') {
				const name = value.displayName || value.title || value.name
				return typeof name === 'string' ? name : ''
			}
			return String(value)
		},

		/**
		 * The page column a layout part's field names, or null.
		 *
		 * @param {string} field The part's field.
		 * @return {?object} The column.
		 */
		layoutColumn(field) {
			return (this.cardFieldColumns && typeof field === 'string' && this.cardFieldColumns[field]) || null
		},

		/**
		 * A pill that reads its date field through the due rules: `variantWhen`
		 * (the first rule the days left match gives the tone), else `due`
		 * (overdue reads as error, within `due.soonWithin` days as warning).
		 * The label is `labels[variant]`, else `labels.overdue` / `labels.soon`,
		 * else Overdue / Soon, through the host's translate. Any other date
		 * draws no pill.
		 *
		 * @param {{field: string, due?: object, variantWhen?: Array, labels?: object}} def The pill.
		 * @return {?{label: string, variant: string}}
		 */
		datePill(def) {
			const value = readPath(this.object, def.field)
			const variant = Array.isArray(def.variantWhen)
				? this.dateRuleVariant(value, def.variantWhen)
				: this.dueVariant(value, def.due)
			if (variant === '') {
				return null
			}
			const labels = def.labels && typeof def.labels === 'object' ? def.labels : {}
			const state = variant === 'error' ? 'overdue' : (variant === 'warning' ? 'soon' : '')
			const authored = labels[variant] || (state && labels[state])
			if (typeof authored === 'string' && authored !== '') {
				return { label: this.cnTranslate(authored), variant }
			}
			if (state === 'overdue') {
				return { label: t('nextcloud-vue', 'Overdue'), variant }
			}
			if (state === 'soon') {
				return { label: t('nextcloud-vue', 'Soon'), variant }
			}
			return null
		},

		/**
		 * The variant of the first `variantWhen` rule a date matches, or ''.
		 *
		 * @param {unknown} value The date.
		 * @param {Array} rules The rules.
		 * @return {string} The variant, or ''.
		 */
		dateRuleVariant(value, rules) {
			const matched = resolveDateVariant(value, rules)
			return matched === 'default' ? '' : matched
		},

		/**
		 * The variant the due rules give a date: error when overdue, warning
		 * within `soonWithin` days, else ''.
		 *
		 * @param {unknown} value The date.
		 * @param {object} config The `due` config.
		 * @return {string} The variant, or ''.
		 */
		dueVariant(value, config) {
			const due = resolveDue(value, config)
			if (due && due.tone === 'danger') {
				return 'error'
			}
			return due && due.soon ? 'warning' : ''
		},

		/**
		 * A layout pill as `{ label, variant }`, or null while its field is
		 * empty.
		 *
		 * @param {?{field: string, colorMap?: object, labels?: object, variant?: string}} def The pill.
		 * @return {?{label: string, variant: string}}
		 */
		layoutPill(def) {
			if (!def || typeof def !== 'object') {
				return null
			}
			if (def.due || Array.isArray(def.variantWhen)) {
				return this.datePill(def)
			}
			const value = this.layoutText(def.field)
			if (value === '') {
				return null
			}
			const labels = def.labels && typeof def.labels === 'object' ? def.labels : {}
			const label = typeof labels[value] === 'string' ? this.cnTranslate(labels[value]) : value
			const colorMap = def.colorMap && typeof def.colorMap === 'object' ? def.colorMap : {}
			const key = Object.keys(colorMap).find((k) => k.toLowerCase() === value.toLowerCase())
			const variant = key !== undefined ? colorMap[key] : def.variant
			return this.withLook({ label, variant: isBadgeVariant(variant) ? variant : 'default' }, def)
		},

		/**
		 * Lay the referenced record's tone and icon over a layout pill that
		 * declares `resolve` (see `pillLooks`).
		 *
		 * @param {{label: string, variant: string}} pill The pill as declared.
		 * @param {object} def The pill's definition.
		 * @return {{label: string, variant: string, icon?: string}} The pill.
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-card-pill-takes-its-tone-and-icon-from-the-referenced-record
		 */
		withLook(pill, def) {
			if (!def || !def.resolve || !this.pillLooks || typeof this.pillLooks !== 'object') {
				return pill
			}
			const looks = this.pillLooks[def.field]
			const raw = readPath(this.object, def.field)
			const look = pillLook(looks && raw !== null && raw !== undefined ? looks[String(raw)] : null)
			return { ...pill, ...(look.variant ? { variant: look.variant } : {}), ...(look.icon ? { icon: look.icon } : {}) }
		},

		/**
		 * One fact of the card: the property's value with the matching page
		 * column (label, formatter, widget) when there is one.
		 *
		 * @param {string} key The property key.
		 * @param {object} prop The schema property.
		 * @return {object} { key, label, value, property, column }
		 */
		metadataField(key, prop) {
			const column = (this.cardFieldColumns && this.cardFieldColumns[key]) || null
			return {
				key,
				label: this.cnTranslate((column && column.label) || prop.title || key),
				value: this.object[key],
				property: prop,
				column,
			}
		},

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

/* The 4px start border takes 3px of padding, so the content stays put. */
.cn-object-card.cn-object-card--accent {
	border-inline-start-width: 4px;
	padding-inline-start: 13px;
}

.cn-object-card.cn-object-card--accent-success {
	border-inline-start-color: var(--color-element-success);
}

.cn-object-card.cn-object-card--accent-warning {
	border-inline-start-color: var(--color-element-warning);
}

.cn-object-card.cn-object-card--accent-error {
	border-inline-start-color: var(--color-element-error);
}

.cn-object-card.cn-object-card--accent-info {
	border-inline-start-color: var(--color-element-info);
}

.cn-object-card.cn-object-card--accent-primary {
	border-inline-start-color: var(--color-primary-element);
}

.cn-object-card__accent-icon {
	display: inline-flex;
	vertical-align: -2px;
	margin-inline-end: 4px;
}

.cn-object-card--accent-success .cn-object-card__accent-icon {
	color: var(--color-text-success);
}

.cn-object-card--accent-warning .cn-object-card__accent-icon {
	color: var(--color-text-warning);
}

.cn-object-card--accent-error .cn-object-card__accent-icon {
	color: var(--color-text-error);
}

.cn-object-card--accent-info .cn-object-card__accent-icon {
	color: var(--color-element-info);
}

.cn-object-card--accent-primary .cn-object-card__accent-icon {
	color: var(--color-primary-element);
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
