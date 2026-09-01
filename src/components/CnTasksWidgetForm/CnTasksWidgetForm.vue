<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-tasks-form">
		<!-- No register / schema to pick: the inbox is the viewer's, resolved
		     server-side. The choices are whose relationship to list, how much
		     the cell holds, how often to look, and where a row click goes. -->
		<p class="cn-tasks-form__note">
			{{ t('nextcloud-vue', 'Shows the viewer\'s open tasks from the task inbox.') }}
		</p>

		<NcSelect
			:model-value="scopeOption"
			:options="scopeOptions"
			:input-label="t('nextcloud-vue', 'Scope')"
			label="label"
			:clearable="false"
			@update:model-value="onScopePick" />

		<div class="cn-tasks-form__row2">
			<NcTextField
				type="number"
				:value="String(limit)"
				:label="t('nextcloud-vue', 'Rows to show')"
				@update:value="updateField('limit', Number($event))" />
			<NcTextField
				type="number"
				:value="String(pollSeconds)"
				:label="t('nextcloud-vue', 'Refresh every (seconds, 0 = off)')"
				@update:value="updateField('pollSeconds', Number($event))" />
		</div>

		<NcTextField
			:value="rowRoute"
			:label="t('nextcloud-vue', 'Open route on row click (optional, receives the task id)')"
			placeholder="TaskDetail"
			@update:value="updateField('rowRoute', $event)" />

		<NcTextField
			:value="emptyText"
			:label="t('nextcloud-vue', 'Text when the inbox is empty')"
			placeholder="No open tasks"
			@update:value="updateField('emptyText', $event)" />
	</div>
</template>

<script>
import { NcSelect, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({
	scope: 'assigned',
	limit: 6,
	pollSeconds: 30,
	rowRoute: '',
	emptyText: '',
})

/**
 * CnTasksWidgetForm — the config sub-form for a `tasks` widget.
 *
 * Deliberately small: whose inbox it is stays the endpoint's decision, so
 * there is no user to pick and no register or schema. What IS a choice is
 * the scope (assigned, pooled, watched, everything), the row cap, the
 * refresh interval, an optional in-app row route, and the empty-inbox line.
 * Emits `update:content` on every change; used by `CnAddWidgetModal` and
 * the cog editor.
 *
 * @spec openspec/changes/cn-tasks-entity-source/specs/cn-tasks-entity-source/spec.md
 */
export default {
	name: 'CnTasksWidgetForm',

	components: { NcSelect, NcTextField },

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
			scope: ['assigned', 'pooled', 'watched', 'all'].includes(initial.scope) ? initial.scope : 'assigned',
			limit: Number.isFinite(initial.limit) ? initial.limit : 6,
			pollSeconds: Number.isFinite(initial.pollSeconds) ? initial.pollSeconds : 30,
			rowRoute: initial.rowRoute ?? '',
			emptyText: initial.emptyText ?? '',
		}
	},

	computed: {
		/** The scope dropdown options, in the endpoint's vocabulary. */
		scopeOptions() {
			return [
				{ id: 'assigned', label: t('nextcloud-vue', 'Assigned to me') },
				{ id: 'pooled', label: t('nextcloud-vue', 'Pool') },
				{ id: 'watched', label: t('nextcloud-vue', 'Watched') },
				{ id: 'all', label: t('nextcloud-vue', 'Everything') },
			]
		},

		/** The option object matching the current scope value. */
		scopeOption() {
			return this.scopeOptions.find((o) => o.id === this.scope) || this.scopeOptions[0]
		},

		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				scope: this.scope,
				limit: this.limit,
				pollSeconds: this.pollSeconds,
				rowRoute: this.rowRoute,
				emptyText: this.emptyText,
			}
		},
	},

	methods: {
		t,

		/**
		 * Apply a scope pick from the dropdown.
		 *
		 * @param {{id: string}|null} option The picked option.
		 * @return {void}
		 */
		onScopePick(option) {
			this.updateField('scope', option?.id || 'assigned')
		},

		/**
		 * Set one field and re-emit the whole content blob.
		 *
		 * @param {string} key   The field name.
		 * @param {*}      value The new value.
		 * @return {void}
		 */
		updateField(key, value) {
			this[key] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Whether the current values are a usable placement.
		 *
		 * Always true: every field has a working default, so this widget can
		 * never be added in a broken state.
		 *
		 * @return {boolean} True.
		 */
		validate() {
			return true
		},
	},
}
</script>

<style scoped>
.cn-tasks-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-tasks-form__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-tasks-form__row2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}
</style>
