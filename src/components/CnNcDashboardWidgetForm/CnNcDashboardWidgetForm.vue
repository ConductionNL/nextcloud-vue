<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-nc-dashboard-widget-form">
		<div class="cn-nc-dashboard-widget-form__field">
			<span class="cn-nc-dashboard-widget-form__label">{{ t('nextcloud-vue', 'Pick a widget') }}</span>
			<CnNcWidgetGridPicker
				v-model="widgetId"
				:widgets="widgetOptions"
				@input="emitContent" />
		</div>

		<label class="cn-nc-dashboard-widget-form__field">
			<span class="cn-nc-dashboard-widget-form__label">{{ t('nextcloud-vue', 'Display mode') }}</span>
			<select
				v-model="displayMode"
				class="cn-nc-dashboard-widget-form__select"
				@change="emitContent">
				<option value="vertical">
					{{ t('nextcloud-vue', 'Vertical (list)') }}
				</option>
				<option value="horizontal">
					{{ t('nextcloud-vue', 'Horizontal (cards)') }}
				</option>
			</select>
		</label>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnNcWidgetGridPicker from '../CnNcWidgetGridPicker/index.js'

const DEFAULT_CONTENT = Object.freeze({
	widgetId: '',
	displayMode: 'vertical',
})

/**
 * CnNcDashboardWidgetForm — the `CnAddWidgetModal` sub-form for creating or
 * editing an `nc-widget` placement (a proxy onto a native Nextcloud Dashboard
 * API widget).
 *
 * Two controls: a `CnNcWidgetGridPicker` of discovered widgets (required), and
 * a vertical/horizontal display mode. The discoverable widgets come from the
 * injected `widgets` catalog the consuming app provides. Emits `update:content`
 * on every change and exposes `validate()` (requires a non-empty widgetId).
 */
export default {
	name: 'CnNcDashboardWidgetForm',

	components: { CnNcWidgetGridPicker },

	inject: {
		/** Consumer-provided list of Nextcloud-discovered dashboard widgets. */
		widgetsCatalog: {
			from: 'widgets',
			default: () => [],
		},
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values when not editing (registry defaults). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			widgetId: typeof initial.widgetId === 'string' ? initial.widgetId : DEFAULT_CONTENT.widgetId,
			displayMode: initial.displayMode === 'horizontal' ? 'horizontal' : 'vertical',
		}
	},

	computed: {
		/** Normalised picker options (PHP may serialise arrays as objects). */
		widgetOptions() {
			const list = Array.isArray(this.widgetsCatalog)
				? this.widgetsCatalog
				: (this.widgetsCatalog && typeof this.widgetsCatalog === 'object'
					? Object.values(this.widgetsCatalog)
					: [])
			return list
				.filter((w) => w && typeof w.id === 'string' && w.id !== '')
				.map((w) => ({
					id: w.id,
					title: w.title || w.id,
					iconUrl: typeof w.iconUrl === 'string' ? w.iconUrl : '',
				}))
		},

		/** The content blob assembled from the current field values. */
		assembledContent() {
			return {
				widgetId: this.widgetId,
				displayMode: this.displayMode,
			}
		},
	},

	methods: {
		t,

		/** Emit the assembled content to the parent. */
		emitContent() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (typeof this.widgetId !== 'string' || this.widgetId.trim() === '') {
				return [t('nextcloud-vue', 'Pick a widget')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-nc-dashboard-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-nc-dashboard-widget-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-nc-dashboard-widget-form__label {
	font-size: 14px;
	font-weight: 500;
}

.cn-nc-dashboard-widget-form__select {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}
</style>
