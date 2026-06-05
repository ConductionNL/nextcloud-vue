<!--
  CnWidgetRefItem — Renders a single `widget-ref` content item.

  Resolves the widget declared via an `openregister://widget/<schemaSlug>/<widgetSlug>`
  URI by calling OR's widget-fetch API:

    GET /index.php/apps/openregister/api/schemas/<schemaSlug>/widgets/<widgetSlug>

  The response's `component` string is looked up in the consuming app's
  `customComponents` registry (injected from CnAppRoot via `cnCustomComponents`).
  If the API call fails or the component is not in the registry, a graceful
  error fallback is displayed instead.

  States:
    loading   — NcLoadingIcon while the API call is in flight
    error     — NcEmptyContent with an alert icon when the ref cannot be resolved
    ready     — the resolved Vue component, mounted with `widgetData` as props

  This component is used internally by CnDashboardPage when a page's
  `config.content[]` array contains `{ type: "widget-ref", ref: "openregister://…" }`
  entries. It is also exported from the library barrel for consumer apps that
  want to render individual widget refs outside a full dashboard page.

  ```vue
  <CnWidgetRefItem ref="openregister://widget/regulation/coverageGrid" />
  ```
-->
<template>
	<div class="cn-widget-ref-item">
		<!-- Loading state -->
		<div v-if="loading" class="cn-widget-ref-item__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Error / unknown-widget fallback -->
		<NcEmptyContent
			v-else-if="error"
			:description="error"
			class="cn-widget-ref-item__error">
			<template #icon>
				<AlertCircleOutline :size="48" />
			</template>
		</NcEmptyContent>

		<!-- Resolved widget component -->
		<component
			:is="resolvedComponent"
			v-else-if="resolvedComponent"
			v-bind="widgetData" />
	</div>
</template>

<script>
import { NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import axios from '@nextcloud/axios'

/**
 * Pattern for `openregister://widget/<schemaSlug>/<widgetSlug>`.
 * schemaSlug: lowercase alphanumeric + hyphens.
 * widgetSlug: starts with a letter, then alphanumeric + hyphens (camelCase OK).
 * Capture group 1 = schemaSlug, capture group 2 = widgetSlug.
 */
const WIDGET_REF_PATTERN = /^openregister:\/\/widget\/([a-z0-9-]+)\/([a-zA-Z][a-zA-Z0-9-]+)$/

/**
 * CnWidgetRefItem — Resolves and renders a `widget-ref` content item.
 *
 * Fetches the widget definition from OR at mount time, looks up the
 * resolved component name in the injected `cnCustomComponents` registry,
 * and renders the component with the widget's data as props.
 *
 * ```vue
 * <CnWidgetRefItem ref-uri="openregister://widget/regulation/coverageGrid" />
 * ```
 *
 * Note: the prop is named `refUri` (not `ref`) because `ref` is a Vue
 * reserved attribute and cannot be used as a prop name.
 */
export default {
	name: 'CnWidgetRefItem',

	components: {
		NcEmptyContent,
		NcLoadingIcon,
		AlertCircleOutline,
	},

	inject: {
		cnCustomComponents: { default: () => ({}) },
	},

	props: {
		/**
		 * The `openregister://widget/<schemaSlug>/<widgetSlug>` URI
		 * that identifies the widget to resolve. Corresponds to the
		 * `ref` field in a manifest `widget-ref` content item.
		 *
		 * @type {string}
		 */
		refUri: {
			type: String,
			required: true,
		},
	},

	data() {
		return {
			/** Whether the API call is in flight. */
			loading: true,
			/** Error message when the widget cannot be resolved, or null. */
			error: null,
			/** The resolved Vue component from the customComponents registry. */
			resolvedComponent: null,
			/** Props to forward to the resolved component (from the API response). */
			widgetData: {},
		}
	},

	computed: {
		/**
		 * Parse the `refUri` prop into `{ schemaSlug, widgetSlug }`.
		 * Returns null when the URI does not match the expected pattern.
		 *
		 * @return {{ schemaSlug: string, widgetSlug: string }|null}
		 */
		parsedRef() {
			if (!this.refUri) return null
			const match = WIDGET_REF_PATTERN.exec(this.refUri)
			if (!match) return null
			return { schemaSlug: match[1], widgetSlug: match[2] }
		},
	},

	watch: {
		/**
		 * Re-resolve when the `refUri` changes at runtime (e.g. manifest
		 * hot-reload in development). Immediate is handled by `created`.
		 */
		refUri() {
			this.resolve()
		},
	},

	created() {
		this.resolve()
	},

	methods: {
		/**
		 * Resolve the widget ref: parse the URI, call OR's API,
		 * and look up the component in the registry.
		 */
		async resolve() {
			this.loading = true
			this.error = null
			this.resolvedComponent = null
			this.widgetData = {}

			const parsed = this.parsedRef
			if (!parsed) {
				this.loading = false
				this.error = `[CnWidgetRefItem] Invalid ref URI: "${this.refUri}". Expected openregister://widget/<schemaSlug>/<widgetSlug>.`
				// eslint-disable-next-line no-console
				console.warn(this.error)
				return
			}

			const { schemaSlug, widgetSlug } = parsed
			const url = `/index.php/apps/openregister/api/schemas/${schemaSlug}/widgets/${widgetSlug}`

			let apiData = {}
			try {
				const response = await axios.get(url)
				apiData = response.data ?? {}
			} catch (err) {
				this.loading = false
				const status = err?.response?.status ?? 'network error'
				this.error = `[CnWidgetRefItem] Could not fetch widget "${schemaSlug}/${widgetSlug}" (${status}).`
				// eslint-disable-next-line no-console
				console.warn(this.error, err)
				return
			}

			const componentName = apiData.component
			if (!componentName) {
				this.loading = false
				this.error = `[CnWidgetRefItem] Widget "${schemaSlug}/${widgetSlug}" API response is missing the "component" field.`
				// eslint-disable-next-line no-console
				console.warn(this.error)
				return
			}

			const registry = this.cnCustomComponents
			const component = registry[componentName]
			if (!component) {
				this.loading = false
				this.error = `[CnWidgetRefItem] Component "${componentName}" for widget "${schemaSlug}/${widgetSlug}" not found in customComponents registry.`
				// eslint-disable-next-line no-console
				console.warn(this.error)
				return
			}

			this.resolvedComponent = component
			// Forward any extra keys from the API response as props to the
			// resolved component (excluding `component` itself).
			const { component: _omit, ...rest } = apiData
			this.widgetData = rest
			this.loading = false
		},
	},
}
</script>

<style scoped>
.cn-widget-ref-item {
	width: 100%;
}

.cn-widget-ref-item__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120px;
}

.cn-widget-ref-item__error {
	min-height: 120px;
}
</style>
