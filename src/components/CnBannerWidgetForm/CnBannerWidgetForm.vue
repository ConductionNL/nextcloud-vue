<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-banner-form">
		<NcTextField
			:value="text"
			:label="t('nextcloud-vue', 'Banner text')"
			@update:value="update('text', $event)" />
		<NcSelect
			:value="variant"
			:options="variantOptions"
			:input-label="t('nextcloud-vue', 'Variant')"
			:clearable="false"
			@input="update('variant', $event)" />
		<NcTextField
			:value="route"
			:label="t('nextcloud-vue', 'Route (page id, optional)')"
			@update:value="update('route', $event)" />
		<p class="cn-banner-form__hint">
			{{ t('nextcloud-vue', 'A conditional banner (visibleWhen) is declared in the manifest.') }}
		</p>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

/**
 * CnBannerWidgetForm — the config sub-form for a `banner` widget.
 *
 * Edits the banner text, the severity variant, and the optional
 * click-through route (a page id). The `visibleWhen` condition is a
 * manifest-authored construct and is round-tripped untouched. Emits
 * `update:content` with the assembled blob on every change; `validate()`
 * requires a non-empty text. Used by both `CnAddWidgetModal` and the cog
 * `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnBannerWidgetForm',

	components: { NcTextField, NcSelect },

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`),
		 * or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({}),
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
		return {
			text: initial.text ?? '',
			variant: initial.variant ?? 'info',
			route: typeof initial.route === 'string' ? initial.route : '',
			// Round-tripped untouched — the form doesn't edit conditions.
			visibleWhen: initial.visibleWhen ?? null,
		}
	},

	computed: {
		/** Selectable severity variants. */
		variantOptions() {
			return ['info', 'warning', 'error']
		},
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				text: this.text,
				variant: this.variant,
				route: this.route || null,
				visibleWhen: this.visibleWhen,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set one field and emit the assembled content.
		 *
		 * @param {string} field The data field name.
		 * @param {*} value The new value.
		 */
		update(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (!this.text || this.text.trim() === '') {
				return [t('nextcloud-vue', 'A banner text is required')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-banner-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-banner-form__hint {
	margin: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
