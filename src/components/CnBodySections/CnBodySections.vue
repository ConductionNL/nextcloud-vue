<!--
  CnBodySections — declarative in-body sections primitive.

  Renders an array of `sections` (manifest `config.bodyWidgets` /
  `config.sections`) as titled cards IN THE PAGE BODY, each hosting a
  registered host-app component. Unlike the integration registry (which
  forces a sidebar tab + widget parity pair), a body section resolves its
  component straight from the v2 component registry (`cnRegistry`) or the
  legacy `cnCustomComponents` map — the SAME resolver CnPageRenderer uses
  for `type:"custom"` page components. No sidebar tab is required.

  Each section's `props` are token-resolved via resolveFilterValue
  (`@objectId`, `@object.<field>`, `@workspace.<key>`, the time tokens,
  `@me`, …). Optional `?`-suffixed tokens are dropped when unset. The
  loaded object + objectId are also `provide`d on `cnSectionContext` so a
  host component written to inject context works without explicit props.

  A section whose component cannot be resolved, or whose render throws,
  degrades to an inline error card — it never breaks the page.

  Reusable across detail / dashboard / index pages: pass the page's
  `context` ({ objectId, object, workspace, register, schema }) and the
  list of sections.
-->
<template>
	<div
		v-if="resolvedSections.length > 0"
		class="cn-body-sections"
		:class="{ 'cn-body-sections--grid': useGrid }"
		data-testid="cn-body-sections">
		<section
			v-for="entry in resolvedSections"
			:key="entry.id"
			class="cn-body-sections__section"
			:style="sectionStyle(entry)"
			:data-section-id="entry.id"
			data-testid="cn-body-section">
			<h3
				v-if="entry.title"
				class="cn-body-sections__title"
				:data-testid="`cn-body-section-title-${entry.id}`">
				{{ entry.title }}
			</h3>
			<!-- Resolved + rendered host component, guarded by an error
			     boundary so a throwing section degrades inline. -->
			<CnSectionBoundary
				v-if="entry.component"
				:section-id="entry.id"
				:error-label="errorLabel">
				<component
					:is="entry.component"
					v-bind="entry.props"
					:data-testid="`cn-body-section-component-${entry.id}`" />
			</CnSectionBoundary>
			<!-- Unresolved component: inline error, page survives. -->
			<div
				v-else
				class="cn-body-sections__error"
				:data-testid="`cn-body-section-error-${entry.id}`">
				{{ unresolvedLabel(entry) }}
			</div>
		</section>
	</div>
</template>

<script>
import { provide, ref, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { resolveFilterValue } from '../../utils/resolveFilterTokens.js'
import CnSectionBoundary from './CnSectionBoundary.js'

export default {
	name: 'CnBodySections',

	components: {
		CnSectionBoundary,
	},

	inject: {
		/** V2 component registry (kind-tagged) provided by CnAppRoot. */
		cnRegistry: { default: () => ({}) },
		/** Legacy custom-component map provided by CnAppRoot. */
		cnCustomComponents: { default: () => ({}) },
	},

	props: {
		/**
		 * Declarative in-body section descriptors. Each entry:
		 * `{ id, component, title?, props?, placement?, colSpan? }`.
		 * `component` is the registry name of a host-app component
		 * (resolved from `cnRegistry` then `cnCustomComponents`).
		 *
		 * @type {Array<{id?: string, component: string, title?: string, props?: object, placement?: string, colSpan?: number}>}
		 */
		sections: {
			type: Array,
			default: () => [],
		},

		/**
		 * Page/object context used to resolve `@objectId` / `@object.<field>`
		 * / `@workspace.<key>` / `@config.<key>` tokens in each section's `props`,
		 * and `provide`d on `cnSectionContext` for host components that inject
		 * instead of taking props. Shape:
		 * `{ objectId?, object?, workspace?, config?, register?, schema? }`.
		 *
		 * @type {{objectId?: (string|number), object?: object, workspace?: object, config?: object, register?: string, schema?: string}}
		 */
		context: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Optional placement filter — when set, only sections whose
		 * `placement` matches this value render. CnDetailPage mounts one
		 * CnBodySections per placement slot so sections land in the right
		 * spot in the body. When unset, ALL sections render (no filter).
		 *
		 * @type {string|null}
		 */
		placement: {
			type: String,
			default: null,
		},

		/**
		 * Whether to lay sections out on a 12-column responsive grid (honouring
		 * each section's `colSpan`). Defaults to true. Set false to stack
		 * full-width.
		 */
		grid: {
			type: Boolean,
			default: true,
		},

		/** Inline label shown when a section's component throws while rendering. */
		errorLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'This section failed to load.'),
		},
	},

	setup(props) {
		// Reactive holder published so a host section component can
		// `inject('cnSectionContext')` and read the loaded object / objectId
		// without the manifest having to spell out @object props. Mirrors the
		// dashboard's cnWorkspaceContext / detail page's cnObjectContext pattern.
		const cnSectionContext = ref({ ...(props.context || {}) })
		provide('cnSectionContext', cnSectionContext)
		watch(
			() => props.context,
			(next) => { cnSectionContext.value = { ...(next || {}) } },
			{ deep: true },
		)
		return {}
	},

	computed: {
		/**
		 * Whether the grid layout is active — only when `grid` is true AND at
		 * least one rendered section sets a `colSpan`. A plain stack otherwise.
		 *
		 * @return {boolean}
		 */
		useGrid() {
			return this.grid && this.filteredSections.some((s) => typeof s.colSpan === 'number')
		},

		/**
		 * Sections filtered by the `placement` prop (when set). Order is
		 * preserved from the input array.
		 *
		 * @return {Array}
		 */
		filteredSections() {
			const list = Array.isArray(this.sections) ? this.sections : []
			if (this.placement === null || this.placement === undefined) {
				return list
			}
			return list.filter((s) => (s && s.placement) === this.placement)
		},

		/**
		 * Each filtered section augmented with its resolved Vue `component`
		 * (or null) and its token-resolved `props`. Unresolved components keep
		 * `component: null` so the template renders an inline error rather than
		 * crashing.
		 *
		 * @return {Array<{id: string, title: string, component: object|null, props: object, name: string, colSpan: number|undefined, placement: string|undefined}>}
		 */
		resolvedSections() {
			return this.filteredSections.map((section, index) => {
				const name = section && section.component
				const id = (section && section.id) || name || `section-${index}`
				return {
					id,
					name,
					title: (section && section.title) || '',
					colSpan: section && section.colSpan,
					placement: section && section.placement,
					component: this.resolveSectionComponent(name),
					props: this.resolveSectionProps(section),
				}
			})
		},
	},

	methods: {
		/**
		 * Resolve a section's host-app component by registry name. Precedence
		 * matches CnPageRenderer.resolveCustomComponent: the v2 `cnRegistry`
		 * (any kind exposing a `.component`) wins, else the legacy
		 * `cnCustomComponents` map. Returns null when neither has the name —
		 * the section then renders an inline error.
		 *
		 * @param {string} name The registry component name.
		 * @return {object|null} The resolved Vue component, or null.
		 */
		resolveSectionComponent(name) {
			if (typeof name !== 'string' || name === '') return null
			const reg = (this.cnRegistry && this.cnRegistry[name]) || null
			if (reg && reg.component) return reg.component
			const legacy = this.cnCustomComponents && this.cnCustomComponents[name]
			return legacy || null
		},

		/**
		 * Resolve a section's `props` map: every value is passed through
		 * resolveFilterValue with this page's context so `@objectId` /
		 * `@object.<field>` / `@workspace.<key>` / time tokens resolve. A value
		 * that resolves to an unset OPTIONAL token (`@…?` left as-is, or a
		 * required `@object.<field>` whose field is absent) is DROPPED from the
		 * props so the child sees `undefined` rather than a raw `@…` string.
		 *
		 * @param {object} section The section descriptor.
		 * @return {object} The token-resolved props for the host component.
		 */
		resolveSectionProps(section) {
			const raw = (section && section.props && typeof section.props === 'object') ? section.props : {}
			const ctx = this.context || {}
			const out = {}
			for (const [key, value] of Object.entries(raw)) {
				const resolved = resolveFilterValue(value, ctx)
				// Drop a value that stayed an unresolved `@`-token (optional
				// workspace token, or an @object/@objectId with no context yet)
				// so the child receives undefined instead of a literal token.
				if (typeof resolved === 'string' && resolved.charAt(0) === '@') {
					continue
				}
				out[key] = resolved
			}
			return out
		},

		/**
		 * Layout style for a section — a grid `grid-column: span N` when the
		 * grid is active and the section declares a `colSpan`; otherwise none.
		 *
		 * @param {object} entry A resolved section.
		 * @return {object} An inline-style object.
		 */
		sectionStyle(entry) {
			if (!this.useGrid || typeof entry.colSpan !== 'number') return {}
			const span = Math.max(1, Math.min(12, entry.colSpan))
			return { gridColumn: `span ${span}` }
		},

		/**
		 * Inline message for a section whose `component` name did not resolve.
		 *
		 * @param {object} entry A resolved section.
		 * @return {string}
		 */
		unresolvedLabel(entry) {
			return t('nextcloud-vue', 'Section component "{name}" is not registered.', { name: entry.name || entry.id })
		},
	},
}
</script>

<style scoped>
.cn-body-sections {
	display: flex;
	flex-direction: column;
	gap: 16px;
	width: 100%;
}

.cn-body-sections--grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 16px;
}

.cn-body-sections__section {
	min-width: 0;
}

.cn-body-sections__title {
	margin: 0 0 8px;
	font-size: 16px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-body-sections__error {
	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	background-color: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}
</style>
