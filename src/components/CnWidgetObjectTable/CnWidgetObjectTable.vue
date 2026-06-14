<!--
  CnWidgetObjectTable — built-in v2 widget wrapping CnDataTable.

  Referenced in v2 manifests via `widgetKey: "object-table"`. Renders the
  table on the shared CnWidgetWrapper chrome (title + standard overflow
  Actions menu: Refresh / Documentation / Request a feature) and forwards
  all data props to CnDataTable so the table itself is a transparent
  pass-through.

  Spec: REQ-MVR-006 (manifest-v2-renderer) — built-in widget: object-table
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<CnDataTable v-bind="innerProps" v-on="$listeners" />
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

/**
 * CnWidgetObjectTable — built-in v2 widget wrapping CnDataTable.
 *
 * Renders a data table on the shared CnWidgetWrapper chrome, which supplies
 * the widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). All data props are forwarded to the
 * inner CnDataTable; the chrome props (`title`, `documentationUrl`,
 * `widgetId`) are consumed by the wrapper and not passed down.
 */
export default {
	name: 'CnWidgetObjectTable',

	components: { CnDataTable, CnWidgetWrapper },

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Table'),
		},
		/**
		 * Documentation link surfaced in the widget's overflow Actions menu.
		 * Empty (the default) hides the Documentation item; the Refresh and
		 * Request-a-feature items always render.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Stable id forwarded to the widget chrome for the Refresh /
		 * Request-a-feature payloads.
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/** Register slug. Forwarded to CnDataTable. */
		register: {
			type: String,
			default: null,
		},
		/** Schema slug. Forwarded to CnDataTable. */
		schema: {
			type: String,
			default: null,
		},
		/** Column definitions. Forwarded to CnDataTable. */
		columns: {
			type: Array,
			default: () => [],
		},
		/** Rows array. Forwarded to CnDataTable. */
		rows: {
			type: Array,
			default: () => [],
		},
		/** Loading state. Forwarded to CnDataTable. */
		loading: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * `$props` minus the chrome props (`title`, `documentationUrl`,
		 * `widgetId`) so they are consumed by CnWidgetWrapper and never
		 * forwarded to the inner CnDataTable.
		 * @return {object}
		 */
		innerProps() {
			const { title, documentationUrl, widgetId, ...rest } = this.$props
			return rest
		},
	},
}
</script>
