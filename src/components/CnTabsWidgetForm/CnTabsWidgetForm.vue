<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-tabs-form">
		<h4 class="cn-tabs-form__section">
			{{ t('nextcloud-vue', 'Tabs widget') }}
		</h4>

		<NcSelect
			:model-value="selectedOptions"
			:options="widgetOptions"
			:multiple="true"
			:close-on-select="false"
			label="label"
			:input-label="t('nextcloud-vue', 'Widgets to show as tabs')"
			:placeholder="t('nextcloud-vue', 'Pick the widgets')"
			@update:model-value="onWidgetsInput" />
		<p class="cn-tabs-form__hint">
			{{ t('nextcloud-vue', 'Each widget becomes one tab, in the order you pick them. They lose their own header here: the tab carries the title.') }}
		</p>

		<template v-if="tabs.length">
			<h5 class="cn-tabs-form__section">
				{{ t('nextcloud-vue', 'Tab titles') }}
			</h5>
			<p class="cn-tabs-form__hint">
				{{ t('nextcloud-vue', 'Leave a title empty to use the widget’s own.') }}
			</p>
			<div
				v-for="(tab, index) in tabs"
				:key="tab.widgetId + '-' + index"
				class="cn-tabs-form__row">
				<NcTextField
					:model-value="tab.label || ''"
					:label="widgetLabel(tab.widgetId)"
					:placeholder="widgetLabel(tab.widgetId)"
					@update:model-value="updateLabel(index, $event)" />
			</div>
		</template>

		<NcTextField
			:model-value="ariaLabel"
			:label="t('nextcloud-vue', 'Accessible name for the tab strip')"
			:placeholder="t('nextcloud-vue', 'Details')"
			@update:model-value="updateField('ariaLabel', $event)" />
		<p class="cn-tabs-form__hint">
			{{ t('nextcloud-vue', 'Screen readers announce this when focus enters the tabs.') }}
		</p>
	</div>
</template>

<script>
import { NcSelect, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

/**
 * CnTabsWidgetForm — the config sub-form for a `tabs` widget
 * ({@link CnTabsWidget}).
 *
 * Picks which of the surface's other widgets become tabs, in order, and lets
 * each tab carry a label of its own. That last part is the reason the form
 * exists rather than a bare widget picker: the tab strip is the only place the
 * child's name appears, so "Files and attachments" on the card may want to be
 * just "Files" once it is competing for width with five siblings.
 *
 * Emits `update:content` with `{ tabs, ariaLabel }`.
 */
export default {
	name: 'CnTabsWidgetForm',

	components: {
		NcSelect,
		NcTextField,
	},

	props: {
		/**
		 * The widget's stored config: `{ tabs, ariaLabel }`.
		 *
		 * @type {{ tabs?: Array<{widgetId: string, label?: string, icon?: string}>, ariaLabel?: string }}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Every widget definition on the surface, so the picker can offer the
		 * siblings this widget may hold.
		 *
		 * @type {object[]}
		 */
		availableWidgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * This widget's own id, so the picker cannot offer the tabs widget
		 * itself and produce a widget that contains itself.
		 */
		widgetId: {
			type: String,
			default: '',
		},
	},

	emits: ['update:content'],

	computed: {
		/**
		 * The configured tabs.
		 *
		 * @return {object[]} The `tabs` array.
		 */
		tabs() {
			return Array.isArray(this.content?.tabs) ? this.content.tabs : []
		},

		/**
		 * The accessible name for the strip.
		 *
		 * @return {string} The aria-label.
		 */
		ariaLabel() {
			return this.content?.ariaLabel || ''
		},

		/**
		 * Selectable siblings. A tabs widget may not hold itself, and it may not
		 * hold another container: nesting tab strips inside tab strips gives the
		 * reader two rows of tabs and no way to tell which row owns the panel.
		 *
		 * @return {object[]} `{ id, label }` options.
		 */
		widgetOptions() {
			return this.availableWidgets
				.filter((w) => w && w.id && w.id !== this.widgetId && w.type !== 'tabs')
				.map((w) => ({ id: w.id, label: w.title || w.id }))
		},

		/**
		 * The picker's current value, in the configured order.
		 *
		 * @return {object[]} The selected options.
		 */
		selectedOptions() {
			return this.tabs
				.map((tab) => this.widgetOptions.find((o) => o.id === tab.widgetId))
				.filter(Boolean)
		},
	},

	methods: {
		t,

		/**
		 * The display name for a widget id, used as a tab's placeholder.
		 *
		 * @param {string} id The widget id.
		 * @return {string} Its title, or the id when it has none.
		 */
		widgetLabel(id) {
			const widget = this.availableWidgets.find((w) => w && w.id === id)
			return (widget && widget.title) || id || ''
		},

		/**
		 * Rewrite the tab list from the picker, keeping any labels already typed
		 * for widgets that are still selected.
		 *
		 * @param {object[]} selected The picker's new value.
		 * @return {void}
		 */
		onWidgetsInput(selected) {
			const list = Array.isArray(selected) ? selected : []
			const tabs = list.map((option) => {
				const existing = this.tabs.find((tab) => tab.widgetId === option.id)
				return existing ? { ...existing } : { widgetId: option.id }
			})
			this.emit({ tabs })
		},

		/**
		 * Set one tab's label. An empty string is removed rather than stored, so
		 * the tab falls back to the widget's own title instead of rendering
		 * blank.
		 *
		 * @param {number} index The tab's position.
		 * @param {string} label The typed label.
		 * @return {void}
		 */
		updateLabel(index, label) {
			const tabs = this.tabs.map((tab, i) => {
				if (i !== index) return { ...tab }
				const next = { ...tab }
				if (label && label.trim() !== '') {
					next.label = label
				} else {
					delete next.label
				}
				return next
			})
			this.emit({ tabs })
		},

		/**
		 * Set one top-level config field.
		 *
		 * @param {string} key The field name.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		updateField(key, value) {
			this.emit({ [key]: value })
		},

		/**
		 * Emit the merged config.
		 *
		 * @param {object} patch The changed fields.
		 * @return {void}
		 */
		emit(patch) {
			/**
			 * @event update:content Emitted with the edited config blob.
			 * @type {object}
			 */
			this.$emit('update:content', {
				tabs: this.tabs,
				ariaLabel: this.ariaLabel,
				...this.content,
				...patch,
			})
		},
	},
}
</script>

<style scoped>
.cn-tabs-form {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-tabs-form__section {
	margin: 8px 0 0;
}

.cn-tabs-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 0;
}

.cn-tabs-form__row {
	display: flex;
	gap: 8px;
}
</style>
