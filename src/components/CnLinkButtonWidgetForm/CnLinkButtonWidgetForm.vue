<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-link-button-widget-form">
		<NcSelect
			:model-value="displayMode"
			:options="displayModeOptions"
			:input-label="t('nextcloud-vue', 'Display mode')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@update:modelValue="updateDisplayMode($event)" />

		<!-- Single-button fields (hidden in list mode). -->
		<template v-if="!isListMode">
			<NcTextField
				:model-value="label"
				:label="t('nextcloud-vue', 'Label')"
				:placeholder="t('nextcloud-vue', 'Label')"
				required
				@update:model-value="updateField('label', $event)" />

			<NcSelect
				:model-value="actionType"
				:options="actionTypeOptions"
				:input-label="t('nextcloud-vue', 'Action type')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateField('actionType', $event)" />

			<NcTextField
				:model-value="url"
				:label="t('nextcloud-vue', 'URL')"
				:placeholder="urlPlaceholder"
				required
				@update:model-value="updateField('url', $event)" />

			<CnIconBrowser
				:value="icon"
				:label="t('nextcloud-vue', 'Icon (optional)')"
				allow-url
				@input="updateField('icon', $event)" />
		</template>

		<!-- Widget-level colours (apply to button mode AND list items
		     without their own colours). -->
		<label class="cn-link-button-widget-form__color-label">
			{{ t('nextcloud-vue', 'Background color') }}
			<CnColorPicker
				:value="backgroundColor"
				clearable
				@input="updateField('backgroundColor', $event.hex)"
				@clear="updateField('backgroundColor', '')" />
		</label>

		<label class="cn-link-button-widget-form__color-label">
			{{ t('nextcloud-vue', 'Text color') }}
			<CnColorPicker
				:value="textColor"
				clearable
				@input="updateField('textColor', $event.hex)"
				@clear="updateField('textColor', '')" />
		</label>

		<!-- List-mode editor. -->
		<template v-if="isListMode">
			<NcSelect
				:model-value="listOrientation"
				:options="orientationOptions"
				:input-label="t('nextcloud-vue', 'List orientation')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateField('listOrientation', $event)" />

			<NcSelect
				:model-value="listItemGap"
				:options="gapOptions"
				:input-label="t('nextcloud-vue', 'List item spacing')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateField('listItemGap', $event)" />

			<div class="cn-link-button-widget-form__list-editor">
				<h4 class="cn-link-button-widget-form__list-title">
					{{ t('nextcloud-vue', 'Links') }}
				</h4>
				<p
					v-if="links.length === 0"
					class="cn-link-button-widget-form__list-empty">
					{{ t('nextcloud-vue', 'No links yet. Click "Add link" to add one.') }}
				</p>
				<ul v-else class="cn-link-button-widget-form__link-list">
					<li
						v-for="(link, index) in links"
						:key="`row-${index}`"
						class="cn-link-button-widget-form__link-row"
						:class="{ 'cn-link-button-widget-form__link-row--invalid': isLinkInvalid(link) }">
						<button
							type="button"
							class="cn-link-button-widget-form__row-handle"
							:disabled="index === 0"
							:aria-label="t('nextcloud-vue', 'Move link up')"
							@click="moveLinkUp(index)">
							{{ '↑' }}
						</button>
						<button
							type="button"
							class="cn-link-button-widget-form__row-handle"
							:disabled="index === links.length - 1"
							:aria-label="t('nextcloud-vue', 'Move link down')"
							@click="moveLinkDown(index)">
							{{ '↓' }}
						</button>
						<div class="cn-link-button-widget-form__row-fields">
							<NcTextField
								:model-value="link.label"
								:label="t('nextcloud-vue', 'Label')"
								:placeholder="t('nextcloud-vue', 'Label')"
								required
								@update:model-value="updateLinkField(index, 'label', $event)" />
							<NcSelect
								:model-value="link.actionType"
								:options="actionTypeOptions"
								:input-label="t('nextcloud-vue', 'Action type')"
								:reduce="(option) => option.value"
								label="label"
								:clearable="false"
								@update:modelValue="updateLinkField(index, 'actionType', $event)" />
							<NcTextField
								:model-value="link.url"
								:label="t('nextcloud-vue', 'URL')"
								:placeholder="urlPlaceholderFor(link.actionType)"
								required
								@update:model-value="updateLinkField(index, 'url', $event)" />
							<CnIconBrowser
								:value="link.icon"
								:label="t('nextcloud-vue', 'Icon (optional)')"
								allow-url
								@input="updateLinkField(index, 'icon', $event)" />
							<NcTextField
								v-if="link.actionType === 'createFile'"
								:model-value="link.value"
								:label="t('nextcloud-vue', 'File extension')"
								:placeholder="'docx'"
								@update:model-value="updateLinkField(index, 'value', $event)" />
						</div>
						<button
							type="button"
							class="cn-link-button-widget-form__row-remove"
							:aria-label="t('nextcloud-vue', 'Remove link')"
							@click="removeLink(index)">
							{{ t('nextcloud-vue', 'Remove') }}
						</button>
					</li>
				</ul>
				<button
					type="button"
					class="cn-link-button-widget-form__add-link"
					:disabled="links.length >= MAX_LINKS"
					@click="addLink">
					{{ t('nextcloud-vue', 'Add link') }}
				</button>
				<p
					v-if="links.length >= MAX_LINKS"
					class="cn-link-button-widget-form__list-hint">
					{{ t('nextcloud-vue', 'Maximum of 20 links per list widget') }}
				</p>
			</div>
		</template>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'

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

const MAX_LINKS = 20

const DEFAULT_LINK = Object.freeze({
	label: '',
	url: '',
	icon: '',
	actionType: ACTION_TYPES.EXTERNAL,
	value: '',
})

const DEFAULT_CONTENT = Object.freeze({
	label: '',
	url: '',
	icon: '',
	actionType: ACTION_TYPES.EXTERNAL,
	backgroundColor: '',
	textColor: '',
	displayMode: DISPLAY_MODES.BUTTON,
	listOrientation: ORIENTATIONS.VERTICAL,
	listItemGap: GAPS.NORMAL,
	links: [],
})

/**
 * Normalise a raw link entry into the canonical shape expected by the
 * renderer. Missing keys default to empty strings; the action type falls back
 * to `'external'` if not one of the three supported values.
 *
 * @param {object} raw the raw link entry (may be undefined or null).
 * @return {object} a normalised link entry.
 */
function normaliseLink(raw) {
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
	}
}

/**
 * CnLinkButtonWidgetForm — the `CnAddWidgetModal` sub-form for creating or
 * editing a `link` widget placement (renderer: {@link CnLinkButtonWidget}).
 *
 * In `displayMode = 'button'` (default) it exposes label, action type, URL,
 * icon, and the two colour pickers; the URL placeholder swaps with the action
 * type. In `displayMode = 'list'` the single-link fields are hidden in favour
 * of a list editor (orientation + spacing selects plus add/remove/reorder
 * link rows); the widget-level colours stay visible. Toggling button → list
 * auto-seeds the first link from the legacy single-link fields. `validate()`
 * requires `label`+`url` (button mode) or a non-empty links array with
 * `label`+`url` on every entry (list mode).
 */
export default {
	name: 'CnLinkButtonWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		CnIconBrowser,
		CnColorPicker,
	},

	props: {
		/**
		 * The placement being edited, or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values — used when not editing and the parent
		 * supplies registry defaults.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const declaredMode = initial.displayMode === DISPLAY_MODES.LIST
			? DISPLAY_MODES.LIST
			: DISPLAY_MODES.BUTTON
		const declaredOrientation = initial.listOrientation === ORIENTATIONS.HORIZONTAL
			? ORIENTATIONS.HORIZONTAL
			: ORIENTATIONS.VERTICAL
		const declaredGap = (initial.listItemGap === GAPS.COMPACT
			|| initial.listItemGap === GAPS.SPACIOUS)
			? initial.listItemGap
			: GAPS.NORMAL
		const declaredLinks = Array.isArray(initial.links)
			? initial.links.map((link) => normaliseLink(link))
			: []
		return {
			MAX_LINKS,
			label: initial.label ?? DEFAULT_CONTENT.label,
			url: initial.url ?? DEFAULT_CONTENT.url,
			icon: initial.icon ?? DEFAULT_CONTENT.icon,
			actionType: initial.actionType ?? DEFAULT_CONTENT.actionType,
			backgroundColor: initial.backgroundColor ?? DEFAULT_CONTENT.backgroundColor,
			textColor: initial.textColor ?? DEFAULT_CONTENT.textColor,
			displayMode: declaredMode,
			listOrientation: declaredOrientation,
			listItemGap: declaredGap,
			links: declaredLinks,
		}
	},

	computed: {
		/** Whether the form is in list mode. */
		isListMode() {
			return this.displayMode === DISPLAY_MODES.LIST
		},

		/** Action-type select options. */
		actionTypeOptions() {
			return [
				{ value: ACTION_TYPES.EXTERNAL, label: t('nextcloud-vue', 'External link') },
				{ value: ACTION_TYPES.INTERNAL, label: t('nextcloud-vue', 'Internal function') },
				{ value: ACTION_TYPES.CREATE_FILE, label: t('nextcloud-vue', 'Create file') },
			]
		},

		/** Display-mode select options. */
		displayModeOptions() {
			return [
				{ value: DISPLAY_MODES.BUTTON, label: t('nextcloud-vue', 'Single button') },
				{ value: DISPLAY_MODES.LIST, label: t('nextcloud-vue', 'List of links') },
			]
		},

		/** List-orientation select options. */
		orientationOptions() {
			return [
				{ value: ORIENTATIONS.VERTICAL, label: t('nextcloud-vue', 'Vertical (list)') },
				{ value: ORIENTATIONS.HORIZONTAL, label: t('nextcloud-vue', 'Horizontal (cards)') },
			]
		},

		/** List item spacing select options. */
		gapOptions() {
			return [
				{ value: GAPS.COMPACT, label: t('nextcloud-vue', 'Compact') },
				{ value: GAPS.NORMAL, label: t('nextcloud-vue', 'Normal') },
				{ value: GAPS.SPACIOUS, label: t('nextcloud-vue', 'Spacious') },
			]
		},

		/** The single-button URL placeholder for the active action type. */
		urlPlaceholder() {
			return this.urlPlaceholderFor(this.actionType)
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				label: this.label,
				url: this.url,
				icon: this.icon,
				actionType: this.actionType,
				backgroundColor: this.backgroundColor,
				textColor: this.textColor,
				displayMode: this.displayMode,
				listOrientation: this.listOrientation,
				listItemGap: this.listItemGap,
				links: this.links.map((link) => normaliseLink(link)),
			}
		},
	},

	methods: {
		t,

		/**
		 * Return the URL placeholder for a given action type.
		 *
		 * @param {string} actionType the action type.
		 * @return {string} the placeholder text.
		 */
		urlPlaceholderFor(actionType) {
			switch (actionType) {
			case ACTION_TYPES.INTERNAL:
				return 'action-id'
			case ACTION_TYPES.CREATE_FILE:
				return 'docx'
			case ACTION_TYPES.EXTERNAL:
			default:
				return 'https://...'
			}
		},

		/**
		 * Set a top-level field and notify the parent.
		 *
		 * @param {string} field one of the top-level content keys.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Toggle the display mode, auto-seeding the first link from the legacy
		 * single-link fields when switching button → list with an empty list.
		 *
		 * @param {string} mode `'button'` or `'list'`.
		 * @return {void}
		 */
		updateDisplayMode(mode) {
			const next = mode === DISPLAY_MODES.LIST ? DISPLAY_MODES.LIST : DISPLAY_MODES.BUTTON
			this.displayMode = next
			if (next === DISPLAY_MODES.LIST && this.links.length === 0) {
				const seed = (this.label !== '' || this.url !== '' || this.icon !== '')
					? normaliseLink({
						label: this.label,
						url: this.url,
						icon: this.icon,
						actionType: this.actionType,
					})
					: normaliseLink({ ...DEFAULT_LINK })
				this.links = [seed]
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set a field on a link row and notify the parent.
		 *
		 * @param {number} index the link row index.
		 * @param {string} field the link field key.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateLinkField(index, field, value) {
			if (index < 0 || index >= this.links.length) {
				return
			}
			const next = this.links.slice()
			next[index] = { ...next[index], [field]: value }
			this.links = next
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Append a new empty link row (up to `MAX_LINKS`).
		 *
		 * @return {void}
		 */
		addLink() {
			if (this.links.length >= MAX_LINKS) {
				return
			}
			this.links = [...this.links, normaliseLink({ ...DEFAULT_LINK })]
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Remove a link row by index.
		 *
		 * @param {number} index the link row index.
		 * @return {void}
		 */
		removeLink(index) {
			if (index < 0 || index >= this.links.length) {
				return
			}
			const next = this.links.slice()
			next.splice(index, 1)
			this.links = next
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Move a link row up by one position.
		 *
		 * @param {number} index the link row index.
		 * @return {void}
		 */
		moveLinkUp(index) {
			if (index <= 0 || index >= this.links.length) {
				return
			}
			const next = this.links.slice()
			const tmp = next[index - 1]
			next[index - 1] = next[index]
			next[index] = tmp
			this.links = next
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Move a link row down by one position.
		 *
		 * @param {number} index the link row index.
		 * @return {void}
		 */
		moveLinkDown(index) {
			if (index < 0 || index >= this.links.length - 1) {
				return
			}
			const next = this.links.slice()
			const tmp = next[index + 1]
			next[index + 1] = next[index]
			next[index] = tmp
			this.links = next
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Whether a link row is missing its required label or URL.
		 *
		 * @param {object} link the link entry.
		 * @return {boolean} true when invalid.
		 */
		isLinkInvalid(link) {
			return (typeof link.label !== 'string' || link.label.trim() === '')
				|| (typeof link.url !== 'string' || link.url.trim() === '')
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (this.isListMode) {
				if (!Array.isArray(this.links) || this.links.length === 0) {
					errors.push(t('nextcloud-vue', 'At least one link is required for list mode'))
					return errors
				}
				let invalidCount = 0
				for (const link of this.links) {
					if (this.isLinkInvalid(link)) {
						invalidCount += 1
					}
				}
				if (invalidCount > 0) {
					errors.push(t('nextcloud-vue', 'Each link requires a label and a URL'))
				}
				return errors
			}
			if (typeof this.label !== 'string' || this.label.trim() === '') {
				errors.push(t('nextcloud-vue', 'Label is required'))
			}
			if (typeof this.url !== 'string' || this.url.trim() === '') {
				errors.push(t('nextcloud-vue', 'URL is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-link-button-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-link-button-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-link-button-widget-form__icon-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-link-button-widget-form__icon-label {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-link-button-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}

.cn-link-button-widget-form__list-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 6px);
	background: var(--color-background-hover);
}

.cn-link-button-widget-form__list-title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
}

.cn-link-button-widget-form__list-empty,
.cn-link-button-widget-form__list-hint {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-link-button-widget-form__link-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-link-button-widget-form__link-row {
	display: grid;
	grid-template-columns: auto auto 1fr auto;
	align-items: start;
	gap: 8px;
	padding: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-link-button-widget-form__link-row--invalid {
	border-color: var(--color-error, #d33);
	box-shadow: 0 0 0 1px var(--color-error, #d33) inset;
}

.cn-link-button-widget-form__row-handle {
	width: 28px;
	height: 28px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 14px;
}

.cn-link-button-widget-form__row-handle:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.cn-link-button-widget-form__row-fields {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-link-button-widget-form__row-remove {
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-link-button-widget-form__add-link {
	align-self: flex-start;
	padding: 6px 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-primary);
	color: var(--color-primary-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-link-button-widget-form__add-link:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
