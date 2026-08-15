<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-related-form">
		<h4 class="cn-related-form__section">
			{{ t('nextcloud-vue', 'Related objects widget') }}
		</h4>

		<NcTextField
			:model-value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Related"
			@update:model-value="updateField('title', $event)" />

		<NcSelect
			:model-value="selectedOptions"
			:options="groupOptions"
			:multiple="true"
			:close-on-select="false"
			:input-label="t('nextcloud-vue', 'Relations to show')"
			:placeholder="t('nextcloud-vue', 'All relations')"
			@update:model-value="onGroupsInput" />
		<p class="cn-related-form__hint">
			{{ t('nextcloud-vue', 'Leave empty to show every relation that has items. Empty groups are always hidden.') }}
		</p>

		<NcCheckboxRadioSwitch
			:model-value="hideSingleTabTitle"
			type="switch"
			@update:model-value="updateField('hideSingleTabTitle', $event)">
			{{ t('nextcloud-vue', 'Hide the tab bar when only one relation is shown') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-related-form__hint">
			{{ t('nextcloud-vue', 'A lone tab just repeats the widget title.') }}
		</p>

		<NcCheckboxRadioSwitch
			:model-value="showTotalCount"
			type="switch"
			@update:model-value="updateField('showTotalCount', $event)">
			{{ t('nextcloud-vue', 'Show a total count next to the title') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-related-form__hint">
			{{ t('nextcloud-vue', 'Totals the items across every relation shown.') }}
		</p>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { RELATED_GROUPS } from '../CnRelatedObjectsWidget/relatedGroups.js'

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	groups: [],
	hideSingleTabTitle: true,
	showTotalCount: true,
})

/**
 * CnRelatedObjectsWidgetForm — the config sub-form for a `related` widget
 * (`CnRelatedObjectsWidget`). Edits the widget title and a whitelist of relation
 * groups to display (objects / files / mails / events / …). Emits `update:content`
 * with `{ title, groups }` where `groups` is the selected group keys (empty = show
 * all non-empty groups). Lets a detail page carry several Related widgets, each
 * scoped to different relations. Used by `CnAddWidgetModal` + the cog editor.
 */
export default {
	name: 'CnRelatedObjectsWidgetForm',

	components: { NcTextField, NcSelect, NcCheckboxRadioSwitch },

	props: {
		/** The placement being edited (pre-fills from `editingWidget.content`), or null. @type {{content: object}|null} */
		editingWidget: { type: Object, default: null },
		/** Initial content values when not editing (registry defaults). @type {object} */
		value: { type: Object, default: () => ({ ...DEFAULT_CONTENT }) },
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			title: initial.title ?? '',
			groups: Array.isArray(initial.groups) ? [...initial.groups] : [],
			// Widgets configured before these options existed carry neither key;
			// both default on so the tab/title duplication is gone by default.
			hideSingleTabTitle: initial.hideSingleTabTitle ?? true,
			showTotalCount: initial.showTotalCount ?? true,
		}
	},

	computed: {
		/** Selectable group options `{ id, label }` from the shared catalog. */
		groupOptions() {
			return RELATED_GROUPS.map((g) => ({ id: g.key, label: t('nextcloud-vue', g.label) }))
		},
		/** The currently selected options (NcSelect value shape). */
		selectedOptions() {
			return this.groupOptions.filter((o) => this.groups.includes(o.id))
		},
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				title: this.title,
				groups: this.groups,
				hideSingleTabTitle: this.hideSingleTabTitle,
				showTotalCount: this.showTotalCount,
			}
		},
	},

	methods: {
		t,
		/**
		 * Set a top-level field and emit.
		 *
		 * @param {'title'|'hideSingleTabTitle'|'showTotalCount'} field The data key to write.
		 * @param {string|boolean} value The widget title, or the toggle state for
		 *   the two display options.
		 * @return {void}
		 */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/**
		 * Map the selected options back to group keys and emit.
		 *
		 * @param {Array<{id: string}>} options The selected NcSelect options.
		 * @return {void}
		 */
		onGroupsInput(options) {
			this.groups = (Array.isArray(options) ? options : []).map((o) => o.id)
			this.emitChange()
		},
		/** Emit the assembled content. */
		emitChange() { this.$emit('update:content', this.assembledContent) },
		/**
		 * Validate the form; an empty array means valid. The related widget
		 * inherits its object from the page, so no field is required.
		 * @return {string[]} the validation errors.
		 */
		validate() { return [] },
	},
}
</script>

<style scoped>
.cn-related-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-related-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-related-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}
</style>
