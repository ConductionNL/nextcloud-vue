<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<div
		class="cn-unknown-widget"
		role="note"
		:aria-label="t('This widget is unavailable')">
		<AlertCircleOutline :size="20" class="cn-unknown-widget__icon" />
		<div class="cn-unknown-widget__text">
			<span class="cn-unknown-widget__title">{{ t('Widget unavailable') }}</span>
			<span v-if="widgetKey" class="cn-unknown-widget__key">{{ widgetKey }}</span>
		</div>
	</div>
</template>

<script>
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'

/**
 * Fallback tile rendered by CnWidgetGrid when a manifest widget's `widgetKey`
 * resolves to no component (unregistered built-in, missing registry entry, or
 * a lib too old for the key). Replaces the previous silent skip, which left a
 * blank pane when every widget on a page failed to resolve (2026-07-06
 * manifest fleet audit: petstore's dashboard rendered fully blank because its
 * manifest used `stats-block`, a key the pinned lib predated). A visible,
 * designed placeholder makes the failure legible instead of invisible.
 */
export default {
	name: 'CnUnknownWidget',

	components: { AlertCircleOutline },

	props: {
		/** The unresolved widgetKey, shown so authors can spot the typo/gap. */
		widgetKey: {
			type: String,
			default: '',
		},
	},

	methods: {
		/**
		 * Local translate shim — falls back to the identity when the host has
		 * not provided a `t` (this component may render before app i18n mounts).
		 *
		 * @param {string} s Source string.
		 * @return {string} Translated string, or the source on miss.
		 */
		t(s) {
			return (typeof this.$t === 'function' ? this.$t(s) : null) ?? s
		},
	},
}
</script>

<style scoped>
.cn-unknown-widget {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 48px;
	padding: 12px;
	border: 1px dashed var(--color-border-dark);
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.cn-unknown-widget__icon {
	flex: 0 0 auto;
	color: var(--color-warning, var(--color-text-maxcontrast));
}

.cn-unknown-widget__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-unknown-widget__title {
	font-weight: 600;
}

.cn-unknown-widget__key {
	font-family: monospace;
	font-size: 0.85em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
