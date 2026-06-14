<!--
  CnWidgetFormRenderer — built-in v2 widget wrapping CnFormPage.

  Referenced in v2 manifests via `widgetKey: "form-renderer"`. Renders the
  form on the shared CnWidgetWrapper chrome (title + standard overflow
  Actions menu: Refresh / Documentation / Request a feature) and forwards
  `register`, `schema`, and all form-relevant props to CnFormPage.

  Note: CnFormPage renders the full form surface (fields, submit button).
  As a widget it is embedded inside a grid cell; consumer apps should set
  appropriate grid dimensions.

  Spec: REQ-MVR-007 (manifest-v2-renderer) — built-in widget: form-renderer
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<CnFormPage v-bind="innerProps" v-on="$listeners" />
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnFormPage from '../CnFormPage/CnFormPage.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

/**
 * CnWidgetFormRenderer — built-in v2 widget wrapping CnFormPage.
 *
 * Renders a form on the shared CnWidgetWrapper chrome, which supplies the
 * widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). All form props are forwarded to the
 * inner CnFormPage; the chrome props (`title`, `documentationUrl`,
 * `widgetId`) are consumed by the wrapper and not passed down.
 */
export default {
	name: 'CnWidgetFormRenderer',

	components: { CnFormPage, CnWidgetWrapper },

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Form'),
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

	computed: {
		/**
		 * `$props` minus the chrome props (`title`, `documentationUrl`,
		 * `widgetId`) so they are consumed by CnWidgetWrapper and never
		 * forwarded to the inner CnFormPage.
		 * @return {object}
		 */
		innerProps() {
			const { title, documentationUrl, widgetId, ...rest } = this.$props
			return rest
		},
	},
}
</script>
