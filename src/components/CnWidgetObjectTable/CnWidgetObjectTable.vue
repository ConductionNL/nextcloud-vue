<!--
  CnWidgetObjectTable — built-in v2 widget wrapping CnDataTable.

  Referenced in v2 manifests via `widgetKey: "object-table"`. Forwards
  all props to CnDataTable so the widget is a transparent pass-through.

  Spec: REQ-MVR-006 (manifest-v2-renderer) — built-in widget: object-table
-->
<template>
	<CnDataTable v-bind="$props" v-on="$listeners" />
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'

export default {
	name: 'CnWidgetObjectTable',

	components: { CnDataTable },

	props: {
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
}
</script>
