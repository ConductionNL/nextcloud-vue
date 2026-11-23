<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-banner-form">
		<NcSelect
			:modelValue="layout"
			:options="layoutOptions"
			:inputLabel="t('nextcloud-vue', 'Layout')"
			:clearable="false"
			@update:modelValue="update('layout', $event)" />
		<template v-if="layout === 'attention'">
			<NcTextField
				:modelValue="kicker"
				:label="t('nextcloud-vue', 'Label above the title')"
				@update:modelValue="update('kicker', $event)" />
			<NcTextField
				:modelValue="title"
				:label="t('nextcloud-vue', 'Title')"
				@update:modelValue="update('title', $event)" />
			<NcTextField
				:modelValue="reason"
				:label="t('nextcloud-vue', 'Reason (why this needs attention)')"
				@update:modelValue="update('reason', $event)" />
		</template>
		<NcTextField
			:modelValue="text"
			:label="t('nextcloud-vue', 'Banner text')"
			@update:modelValue="update('text', $event)" />
		<NcSelect
			:modelValue="variant"
			:options="variantOptions"
			:inputLabel="t('nextcloud-vue', 'Variant')"
			:clearable="false"
			@update:modelValue="update('variant', $event)" />
		<NcTextField
			:modelValue="route"
			:label="t('nextcloud-vue', 'Route (page id, optional)')"
			@update:modelValue="update('route', $event)" />
		<p class="cn-banner-form__hint">
			{{ t('nextcloud-vue', 'A conditional banner (visibleWhen) is declared in the manifest.') }}
		</p>
		<p v-if="layout === 'attention'" class="cn-banner-form__hint">
			{{ t('nextcloud-vue', 'The actions of an attention card are declared in the manifest.') }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcTextField } from '@nextcloud/vue'

/**
 * CnBannerWidgetForm — the config sub-form for a `banner` widget.
 *
 * Edits the banner text, the severity variant, and the optional
 * click-through route (a page id). The `visibleWhen` condition is a
 * manifest-authored construct and is round-tripped untouched. With the
 * `attention` layout it also edits the kicker, the title and the reason; the
 * card's `actions` are manifest-authored and round-tripped too. Emits
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
			layout: initial.layout === 'attention' ? 'attention' : 'banner',
			kicker: initial.kicker ?? '',
			title: initial.title ?? '',
			reason: initial.reason ?? '',
			// Round-tripped untouched: actions are written in the manifest.
			actions: Array.isArray(initial.actions) ? initial.actions : null,
		}
	},

	computed: {
		/** Selectable severity variants. */
		variantOptions() {
			return ['info', 'warning', 'error']
		},

		/**
		 * Selectable layouts: the note card or the attention card.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		layoutOptions() {
			return ['banner', 'attention']
		},

		/**
		 * The assembled content blob from the current field values. The
		 * attention keys are only written for an attention card, so a plain
		 * banner's stored content stays what it always was.
		 *
		 * @return {object}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		assembledContent() {
			const content = {
				text: this.text,
				variant: this.variant,
				route: this.route || null,
				visibleWhen: this.visibleWhen,
			}
			if (this.layout === 'attention') {
				content.layout = 'attention'
				content.kicker = this.kicker
				content.title = this.title
				content.reason = this.reason
				if (this.actions !== null) {
					content.actions = this.actions
				}
			}
			return content
		},
	},

	methods: {
		t,

		/**
		 * Set one field and emit the assembled content.
		 *
		 * @param {string} field The data field name.
		 * @param {unknown} value The new value.
		 */
		update(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		validate() {
			if (this.layout === 'attention') {
				const hasHeadline = (this.title && this.title.trim() !== '') || (this.text && this.text.trim() !== '')
				return hasHeadline ? [] : [t('nextcloud-vue', 'An attention card needs a title')]
			}
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
