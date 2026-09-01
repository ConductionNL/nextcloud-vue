<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-flow-runs-form">
		<!-- No data source to configure: the runs come from OpenRegister's one
		     flow engine, scoped server-side to the viewer's organisation. The
		     only choices here are how much to show and how often to look. -->
		<p class="cn-flow-runs-form__note">
			{{ t('nextcloud-vue', 'Shows the flow runs that are currently queued, running or waiting, for the viewer’s organisation.') }}
		</p>

		<div class="cn-flow-runs-form__row2">
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
			:label="t('nextcloud-vue', 'Open route on row click (optional)')"
			placeholder="GraphDetail"
			@update:value="updateField('rowRoute', $event)" />

		<NcTextField
			:value="runRoute"
			:label="t('nextcloud-vue', 'Open route on run click (optional, receives the run id)')"
			placeholder="RunDetail"
			@update:value="updateField('runRoute', $event)" />

		<!-- Scoping the widget to ONE object. On a detail page the token
		     @objectId binds the current object, so a manifest never hardcodes
		     a uuid. Empty keeps the org-wide dashboard behaviour. -->
		<NcTextField
			:value="subject"
			:label="t('nextcloud-vue', 'Subject object (uuid or @objectId, optional)')"
			placeholder="@objectId"
			@update:value="updateField('subject', $event)" />

		<NcTextField
			:value="emptyText"
			:label="t('nextcloud-vue', 'Text when nothing is running')"
			placeholder="No flows are running"
			@update:value="updateField('emptyText', $event)" />
	</div>
</template>

<script>
import { NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({
	limit: 6,
	pollSeconds: 15,
	rowRoute: '',
	runRoute: '',
	subject: '',
	emptyText: '',
})

/**
 * CnFlowRunsWidgetForm — the config sub-form for a `flow-runs` widget.
 *
 * Deliberately small: the widget has no register / schema / filter to pick,
 * because "which flow runs" is not a choice — it is every live run the viewer's
 * organisation owns, resolved server-side. What IS a choice is how many rows
 * the cell can hold, how often to refetch, where a row click goes, an optional
 * subject object to scope to (a uuid, or `@objectId` on a detail page), and
 * what to say when nothing is running. Emits `update:content` on every change;
 * used by `CnAddWidgetModal` and the cog editor.
 *
 * @spec openspec/changes/cn-flow-runs-widget/specs/cn-flow-runs-widget/spec.md
 * @spec openspec/changes/cn-flow-runs-widget-subject/specs/cn-flow-runs-widget-subject/spec.md
 */
export default {
	name: 'CnFlowRunsWidgetForm',

	components: { NcTextField },

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
			limit: Number.isFinite(initial.limit) ? initial.limit : 6,
			pollSeconds: Number.isFinite(initial.pollSeconds) ? initial.pollSeconds : 15,
			rowRoute: initial.rowRoute ?? '',
			runRoute: initial.runRoute ?? '',
			subject: initial.subject ?? '',
			emptyText: initial.emptyText ?? '',
		}
	},

	computed: {
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				limit: this.limit,
				pollSeconds: this.pollSeconds,
				rowRoute: this.rowRoute,
				runRoute: this.runRoute,
				subject: this.subject,
				emptyText: this.emptyText,
			}
		},
	},

	methods: {
		t,

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
		 * Always true — every field has a working default, so this widget can
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
.cn-flow-runs-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-flow-runs-form__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-runs-form__row2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}
</style>
