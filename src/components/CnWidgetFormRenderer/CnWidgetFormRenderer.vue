<!--
  CnWidgetFormRenderer — built-in v2 widget wrapping CnFormPage.

  Referenced in v2 manifests via `widgetKey: "form-renderer"`. Forwards
  `register`, `schema`, and all form-relevant props to CnFormPage.

  Note: CnFormPage renders the full form surface (header, fields, submit
  button). As a widget it is embedded inside a grid cell; consumer apps
  should set appropriate grid dimensions.

  Spec: REQ-MVR-007 (manifest-v2-renderer) — built-in widget: form-renderer
-->
<template>
	<CnFormPage v-bind="$props" v-on="$listeners" />
</template>

<script>
import CnFormPage from '../CnFormPage/CnFormPage.vue'

export default {
	name: 'CnWidgetFormRenderer',

	components: { CnFormPage },

	props: {
		/** Register slug for form data submission. */
		register: {
			type: String,
			default: null,
		},
		/** Schema slug for the form data shape. */
		schema: {
			type: String,
			default: null,
		},
		/** Form fields. Forwarded to CnFormPage. */
		fields: {
			type: Array,
			default: () => [],
		},
		/** Submit handler name. Forwarded to CnFormPage. */
		submitHandler: {
			type: String,
			default: '',
		},
		/** Submit endpoint URL. Forwarded to CnFormPage. */
		submitEndpoint: {
			type: String,
			default: '',
		},
		/** HTTP method for endpoint mode. Forwarded to CnFormPage. */
		submitMethod: {
			type: String,
			default: 'POST',
		},
		/** Form mode. Forwarded to CnFormPage. */
		mode: {
			type: String,
			default: 'public',
		},
		/** Page title. Forwarded to CnFormPage. */
		title: {
			type: String,
			default: '',
		},
		/** Page description. Forwarded to CnFormPage. */
		description: {
			type: String,
			default: '',
		},
		/** Pre-filled form state. Forwarded to CnFormPage. */
		initialValue: {
			type: Object,
			default: () => ({}),
		},
	},
}
</script>
