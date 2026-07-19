<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-dash-tile-form">
		<NcTextField
			:model-value="title"
			:label="t('nextcloud-vue', 'Title')"
			:placeholder="t('nextcloud-vue', 'Tile title')"
			required
			@update:model-value="updateField('title', $event)" />

		<CnIconBrowser
			:value="icon"
			:label="t('nextcloud-vue', 'Icon')"
			allow-url
			@input="onIconChange($event)" />

		<NcSelect
			:model-value="iconType"
			:options="iconTypeOptions"
			:input-label="t('nextcloud-vue', 'Icon type')"
			:clearable="false"
			@update:model-value="updateField('iconType', $event)" />

		<div class="cn-dash-tile-form__color-row">
			<label class="cn-dash-tile-form__color-label">
				{{ t('nextcloud-vue', 'Background color') }}
				<input
					type="color"
					:value="backgroundColor || '#3b82f6'"
					class="cn-dash-tile-form__color"
					@input="updateField('backgroundColor', $event.target.value)">
			</label>

			<label class="cn-dash-tile-form__color-label">
				{{ t('nextcloud-vue', 'Text color') }}
				<input
					type="color"
					:value="textColor || '#ffffff'"
					class="cn-dash-tile-form__color"
					@input="updateField('textColor', $event.target.value)">
			</label>
		</div>

		<NcSelect
			:model-value="linkType"
			:options="linkTypeOptions"
			:input-label="t('nextcloud-vue', 'Link type')"
			:clearable="false"
			@update:model-value="updateField('linkType', $event)" />

		<NcTextField
			:model-value="linkValue"
			:label="linkValueLabel"
			:placeholder="linkValuePlaceholder"
			required
			@update:model-value="updateField('linkValue', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField, NcSelect } from '@nextcloud/vue'
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'
import { isCustomIconUrl } from '../CnWidgetGrid/widgetIcons.js'
import { isSvgPath } from '../../utils/iconUtils.js'

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	icon: '',
	iconType: 'class',
	backgroundColor: '#3b82f6',
	textColor: '#ffffff',
	linkType: 'app',
	linkValue: '',
})

/**
 * CnDashTileWidgetForm — sub-form for creating or editing a `tile` widget
 * placement. Collects the six tile fields (title, icon + iconType, background
 * and text colours, linkType, linkValue) and emits them via `update:content`.
 *
 * The icon control is a `CnIconBrowser` — a searchable visual picker over the
 * `@mdi/js` set with an optional custom image-URL tab. A URL value sets
 * `iconType` to `url`, an SVG path to `svg`, otherwise `class`. The `iconType`
 * select stays visible so authors can override (e.g. to `emoji`).
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnDashTileWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		CnIconBrowser,
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values (registry defaults when not editing). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted on every change with the assembled content payload.
		 *
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			title: initial.title ?? DEFAULT_CONTENT.title,
			icon: initial.icon ?? DEFAULT_CONTENT.icon,
			iconType: initial.iconType ?? DEFAULT_CONTENT.iconType,
			backgroundColor: initial.backgroundColor ?? DEFAULT_CONTENT.backgroundColor,
			textColor: initial.textColor ?? DEFAULT_CONTENT.textColor,
			linkType: initial.linkType ?? DEFAULT_CONTENT.linkType,
			linkValue: initial.linkValue ?? DEFAULT_CONTENT.linkValue,
		}
	},

	computed: {
		/**
		 * The icon-type dropdown options.
		 *
		 * @return {string[]} the icon-type values.
		 */
		iconTypeOptions() {
			return ['class', 'url', 'emoji', 'svg']
		},

		/**
		 * The link-type dropdown options.
		 *
		 * @return {string[]} the link-type values.
		 */
		linkTypeOptions() {
			return ['app', 'url']
		},

		/**
		 * The localised label for the link-value input.
		 *
		 * @return {string} the label.
		 */
		linkValueLabel() {
			return this.linkType === 'app'
				? t('nextcloud-vue', 'App route')
				: t('nextcloud-vue', 'URL')
		},

		/**
		 * The placeholder for the link-value input.
		 *
		 * @return {string} the placeholder.
		 */
		linkValuePlaceholder() {
			return this.linkType === 'app'
				? '/apps/files'
				: 'https://example.com'
		},

		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			return {
				title: this.title,
				icon: this.icon,
				iconType: this.iconType,
				backgroundColor: this.backgroundColor,
				textColor: this.textColor,
				linkType: this.linkType,
				linkValue: this.linkValue,
			}
		},
	},

	methods: {
		/**
		 * Set a field and emit `update:content`.
		 *
		 * @param {string} field the field name.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Icon change handler — derives `iconType` from whether the value is a
		 * URL, then emits.
		 *
		 * @param {string} value the new icon value.
		 * @return {void}
		 */
		onIconChange(value) {
			this.icon = value || ''
			if (isCustomIconUrl(this.icon)) {
				this.iconType = 'url'
			} else if (isSvgPath(this.icon)) {
				// SVG path string (e.g. from CnIconBrowser's @mdi/js catalogue).
				this.iconType = 'svg'
			} else {
				this.iconType = 'class'
			}
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form — title and link target are required.
		 *
		 * @return {string[]} the validation errors (empty when valid).
		 */
		validate() {
			const errors = []
			if (typeof this.title !== 'string' || this.title.trim() === '') {
				errors.push(t('nextcloud-vue', 'Tile title is required'))
			}
			if (typeof this.linkValue !== 'string' || this.linkValue.trim() === '') {
				errors.push(t('nextcloud-vue', 'Tile link target is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-dash-tile-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-dash-tile-form__color-row {
	display: flex;
	gap: 12px;
}

.cn-dash-tile-form__color-label {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-dash-tile-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>
