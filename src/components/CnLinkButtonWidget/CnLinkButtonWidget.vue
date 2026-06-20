<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-link-button-widget" :class="rootClass">
		<!-- Single-button mode. Default for legacy / button-mode placements. -->
		<button
			v-if="!isListMode"
			type="button"
			class="cn-link-button-widget__button"
			:style="buttonStyle"
			:disabled="isExecuting"
			@click="onSingleClick">
			<span v-if="hasIcon" class="cn-link-button-widget__icon">
				<CnWidgetIcon :name="icon" :size="48" />
			</span>
			<span class="cn-link-button-widget__label">{{ displayLabel }}</span>
		</button>

		<!-- Vertical list mode. -->
		<ul
			v-else-if="isVerticalList"
			role="list"
			class="cn-link-button-widget__list cn-link-button-widget__list--vertical"
			:style="listContainerStyle">
			<li
				v-for="(link, index) in renderableLinks"
				:key="`link-${index}`"
				class="cn-link-button-widget__list-item-wrap">
				<button
					type="button"
					class="cn-link-button-widget__list-item"
					:style="listItemStyle(link)"
					:disabled="isExecuting"
					:aria-label="link.label || ''"
					@click="onListClick(link)">
					<span v-if="link.icon" class="cn-link-button-widget__list-icon">
						<CnWidgetIcon :name="link.icon" :size="24" />
					</span>
					<span class="cn-link-button-widget__list-label">{{ link.label || '' }}</span>
				</button>
			</li>
		</ul>

		<!-- Horizontal list mode. -->
		<div
			v-else
			role="list"
			class="cn-link-button-widget__list cn-link-button-widget__list--horizontal"
			:style="listContainerStyle">
			<div
				v-for="(link, index) in renderableLinks"
				:key="`link-${index}`"
				role="listitem"
				class="cn-link-button-widget__list-item-wrap cn-link-button-widget__list-item-wrap--horizontal">
				<button
					type="button"
					class="cn-link-button-widget__list-item cn-link-button-widget__list-item--horizontal"
					:style="listItemStyle(link)"
					:disabled="isExecuting"
					:aria-label="link.label || ''"
					@click="onListClick(link)">
					<span v-if="link.icon" class="cn-link-button-widget__list-icon">
						<CnWidgetIcon :name="link.icon" :size="24" />
					</span>
					<span class="cn-link-button-widget__list-label">{{ link.label || '' }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'

const ACTION_TYPES = Object.freeze({
	EXTERNAL: 'external',
	INTERNAL: 'internal',
	CREATE_FILE: 'createFile',
})

const DISPLAY_MODES = Object.freeze({
	BUTTON: 'button',
	LIST: 'list',
})

const ORIENTATIONS = Object.freeze({
	VERTICAL: 'vertical',
	HORIZONTAL: 'horizontal',
})

const GAPS = Object.freeze({
	COMPACT: 'compact',
	NORMAL: 'normal',
	SPACIOUS: 'spacious',
})

const GAP_REM = Object.freeze({
	compact: '0.5rem',
	normal: '1rem',
	spacious: '1.5rem',
})

/**
 * CnLinkButtonWidget — renders a styled clickable tile (or a list of tiles)
 * that dispatches one of three action types per entry:
 *
 *   - `external` → opens the configured `url` in a new tab via
 *     `window.open(url, '_blank', 'noopener,noreferrer')`.
 *   - `internal` → emits an `internal-action` event with the action id so a
 *     host app can dispatch its own registered handler (the library ships no
 *     action registry). An empty/missing handler is a silent no-op.
 *   - `createFile` → emits a `create-file` event with the extension token so
 *     a host app can run its file-creation flow.
 *
 * `displayMode = 'list'` renders `content.links[]` as a vertical `<ul>` stack
 * or a horizontal `<div>` row of pills; each link reuses the same action
 * types, icon resolution, and edit-mode suppression as the single button.
 * Default / legacy placements (`displayMode` absent) render the single button
 * unchanged.
 *
 * Click is suppressed while the dashboard is in edit mode (`isAdmin === true`
 * AND `canEdit === true`) and while an action is in flight.
 *
 * Registered as the `link` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnLinkButtonWidget',

	components: {
		CnWidgetIcon,
	},

	props: {
		/**
		 * Persisted widget content. Single-button shape: `{label, url, icon,
		 * actionType, backgroundColor, textColor}`. List shape adds
		 * `{displayMode: 'list', listOrientation, listItemGap, links: [{label,
		 * url, icon, actionType, value?, backgroundColor?, textColor?}, …]}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Whether the current user is an admin. Combined with `canEdit` to
		 * suppress click handlers in edit mode.
		 *
		 * @type {boolean}
		 */
		isAdmin: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether the surrounding dashboard shell is in edit mode. Suppresses
		 * click handlers when both this and `isAdmin` are true.
		 *
		 * @type {boolean}
		 */
		canEdit: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * Emitted on an `internal` action click so a host app can dispatch its
		 * own handler.
		 *
		 * @event internal-action
		 * @type {string}
		 */
		'internal-action',
		/**
		 * Emitted on a `createFile` action click; payload is the extension
		 * token (e.g. `'docx'`).
		 *
		 * @event create-file
		 * @type {string}
		 */
		'create-file',
	],

	data() {
		return {
			isExecuting: false,
		}
	},

	computed: {
		/** The single-button label, or '' when absent. */
		label() {
			return typeof this.content?.label === 'string' ? this.content.label : ''
		},

		/** The single-button URL / action token, or '' when absent. */
		url() {
			return typeof this.content?.url === 'string' ? this.content.url : ''
		},

		/** The single-button icon, or '' when absent. */
		icon() {
			return typeof this.content?.icon === 'string' ? this.content.icon : ''
		},

		/** The single-button action type (defaults to `external`). */
		actionType() {
			const declared = this.content?.actionType
			if (declared === ACTION_TYPES.INTERNAL || declared === ACTION_TYPES.CREATE_FILE) {
				return declared
			}
			return ACTION_TYPES.EXTERNAL
		},

		/** Resolved widget background colour (default theme primary). */
		backgroundColor() {
			const value = this.content?.backgroundColor
			return (typeof value === 'string' && value !== '') ? value : 'var(--color-primary)'
		},

		/** Resolved widget text colour (default theme primary text). */
		textColor() {
			const value = this.content?.textColor
			return (typeof value === 'string' && value !== '') ? value : 'var(--color-primary-text)'
		},

		/** Whether the single button has an icon. */
		hasIcon() {
			return this.icon !== ''
		},

		/** The button label, falling back to a localised placeholder. */
		displayLabel() {
			return this.label !== '' ? this.label : t('nextcloud-vue', 'Link Button')
		},

		/** Inline style for the single button. */
		buttonStyle() {
			return {
				'background-color': this.backgroundColor,
				color: this.textColor,
			}
		},

		/** Whether the dashboard is in edit mode (clicks suppressed). */
		isInEditMode() {
			return this.isAdmin === true && this.canEdit === true
		},

		/** Resolved display mode (legacy / unset falls back to `button`). */
		displayMode() {
			return this.content?.displayMode === DISPLAY_MODES.LIST
				? DISPLAY_MODES.LIST
				: DISPLAY_MODES.BUTTON
		},

		/** Whether list mode is active (mode is list AND links non-empty). */
		isListMode() {
			return this.displayMode === DISPLAY_MODES.LIST
				&& Array.isArray(this.content?.links)
				&& this.content.links.length > 0
		},

		/** Resolved list orientation (default `vertical`). */
		listOrientation() {
			return this.content?.listOrientation === ORIENTATIONS.HORIZONTAL
				? ORIENTATIONS.HORIZONTAL
				: ORIENTATIONS.VERTICAL
		},

		/** Whether the list renders vertically. */
		isVerticalList() {
			return this.listOrientation === ORIENTATIONS.VERTICAL
		},

		/** Resolved list item spacing (default `normal`). */
		listItemGap() {
			const declared = this.content?.listItemGap
			if (declared === GAPS.COMPACT || declared === GAPS.SPACIOUS) {
				return declared
			}
			return GAPS.NORMAL
		},

		/** The CSS gap value for the active spacing setting. */
		listGapValue() {
			return GAP_REM[this.listItemGap]
		},

		/** Inline style applying the list gap. */
		listContainerStyle() {
			return { gap: this.listGapValue }
		},

		/** Normalised list of link entries safe for the renderer. */
		renderableLinks() {
			if (Array.isArray(this.content?.links) === false) {
				return []
			}
			return this.content.links.map((raw) => {
				const link = (raw !== null && typeof raw === 'object') ? raw : {}
				const declaredAction = link.actionType
				const actionType = (declaredAction === ACTION_TYPES.INTERNAL
					|| declaredAction === ACTION_TYPES.CREATE_FILE)
					? declaredAction
					: ACTION_TYPES.EXTERNAL
				return {
					label: typeof link.label === 'string' ? link.label : '',
					url: typeof link.url === 'string' ? link.url : '',
					icon: typeof link.icon === 'string' ? link.icon : '',
					actionType,
					value: typeof link.value === 'string' ? link.value : '',
					backgroundColor: typeof link.backgroundColor === 'string' ? link.backgroundColor : '',
					textColor: typeof link.textColor === 'string' ? link.textColor : '',
				}
			})
		},

		/** Root CSS class map (list-mode + orientation modifiers). */
		rootClass() {
			return {
				'cn-link-button-widget--list': this.isListMode,
				[`cn-link-button-widget--list-${this.listOrientation}`]: this.isListMode,
			}
		},
	},

	methods: {
		/**
		 * Per-link inline style, falling back to the widget-level colours.
		 *
		 * @param {object} link the normalised link entry.
		 * @return {object} the inline style object.
		 */
		listItemStyle(link) {
			const bg = (typeof link.backgroundColor === 'string' && link.backgroundColor !== '')
				? link.backgroundColor
				: this.backgroundColor
			const fg = (typeof link.textColor === 'string' && link.textColor !== '')
				? link.textColor
				: this.textColor
			return {
				'background-color': bg,
				color: fg,
			}
		},

		/**
		 * Dispatch the single-button click (suppressed in edit mode / busy).
		 *
		 * @return {void}
		 */
		onSingleClick() {
			if (this.isInEditMode || this.isExecuting) {
				return
			}
			this.dispatchAction({
				actionType: this.actionType,
				url: this.url,
				value: '',
			})
		},

		/**
		 * Dispatch a list-item click (suppressed in edit mode / busy).
		 *
		 * @param {object} link the normalised link entry.
		 * @return {void}
		 */
		onListClick(link) {
			if (this.isInEditMode || this.isExecuting) {
				return
			}
			this.dispatchAction({
				actionType: link.actionType,
				url: link.url,
				value: link.value,
			})
		},

		/**
		 * Route a click to the handler for its action type.
		 *
		 * @param {{actionType: string, url: string, value: string}} payload the dispatch payload.
		 * @return {void}
		 */
		dispatchAction({ actionType, url, value }) {
			switch (actionType) {
			case ACTION_TYPES.EXTERNAL:
				this.handleExternal(url)
				break
			case ACTION_TYPES.INTERNAL:
				this.$emit('internal-action', url)
				break
			case ACTION_TYPES.CREATE_FILE:
				// For list items the extension lives in `value`; for the
				// single button it lives in `url`.
				this.$emit('create-file', value !== '' ? value : url)
				break
			}
		},

		/**
		 * Open an external URL in a new tab; `noopener,noreferrer` prevents
		 * the opened page reaching back via `window.opener`.
		 *
		 * @param {string} url the URL to open.
		 * @return {void}
		 */
		handleExternal(url) {
			if (typeof url !== 'string' || url === '') {
				return
			}
			window.open(url, '_blank', 'noopener,noreferrer')
		},
	},
}
</script>

<style scoped>
.cn-link-button-widget {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8px;
}

.cn-link-button-widget--list {
	align-items: stretch;
	justify-content: stretch;
}

.cn-link-button-widget__button {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 100%;
	height: 100%;
	min-height: 96px;
	padding: 12px;
	border: none;
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
	font-size: 14px;
	font-weight: 600;
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cn-link-button-widget__button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.cn-link-button-widget__button:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cn-link-button-widget__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
}

.cn-link-button-widget__label {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.cn-link-button-widget__list {
	width: 100%;
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
}

.cn-link-button-widget__list--vertical {
	flex-direction: column;
}

.cn-link-button-widget__list--horizontal {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: flex-start;
}

.cn-link-button-widget__list-item-wrap {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-link-button-widget__list-item {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 8px 12px;
	border: none;
	border-radius: var(--border-radius, 6px);
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	text-align: left;
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cn-link-button-widget__list-item--horizontal {
	width: auto;
}

.cn-link-button-widget__list-item:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.cn-link-button-widget__list-item:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cn-link-button-widget__list-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	flex-shrink: 0;
}

.cn-link-button-widget__list-label {
	display: inline-block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
