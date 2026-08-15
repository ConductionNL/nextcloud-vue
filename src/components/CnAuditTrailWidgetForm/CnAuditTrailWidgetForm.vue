<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-audit-trail-form">
		<NcTextField
			:model-value="title"
			:label="t('nextcloud-vue', 'Title')"
			@update:model-value="update('title', $event)" />
		<NcTextField
			:model-value="String(maxDisplay)"
			type="number"
			:label="t('nextcloud-vue', 'Max rows')"
			@update:model-value="updateMaxDisplay($event)" />
		<p class="cn-audit-trail-form__hint">
			{{ t('nextcloud-vue', 'The audited object comes from the page context (detail pages).') }}
		</p>
	</div>
</template>

<script>
import { NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

/**
 * CnAuditTrailWidgetForm — the config sub-form for an `audit-trail` widget.
 *
 * Edits the card title and the row cap; the audited object itself always
 * comes from the page's object context (the widget is a detail-page
 * surface, like `data`). Emits `update:content` with the assembled blob on
 * every change. Used by both `CnAddWidgetModal` and the cog
 * `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnAuditTrailWidgetForm',

	components: { NcTextField },

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
			title: initial.title ?? '',
			maxDisplay: Number.isFinite(initial.maxDisplay) ? initial.maxDisplay : 5,
		}
	},

	computed: {
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return { title: this.title, maxDisplay: this.maxDisplay }
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
		 * Set the row cap (clamped to a positive number) and emit.
		 *
		 * @param {string} value The raw input value.
		 */
		updateMaxDisplay(value) {
			this.maxDisplay = Math.max(1, Number(value) || 5)
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid (the widget has no
		 * required config — the object comes from the page context).
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			return []
		},
	},
}
</script>

<style scoped>
.cn-audit-trail-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-audit-trail-form__hint {
	margin: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
