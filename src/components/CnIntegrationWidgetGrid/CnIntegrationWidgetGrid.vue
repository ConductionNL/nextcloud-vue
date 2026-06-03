<!--
  CnIntegrationWidgetGrid — responsive grid of every integration's widget
  for a given surface (app-dashboard or user-dashboard).

  Iterates `useIntegrationRegistry().integrations.value`, resolves each
  provider's surface-appropriate widget via the registry's AD-19
  fallback rule, and mounts them in a 3/2/1-column responsive grid.

  Per ADR-019, the umbrella widget is ignorant of leaf data shapes — each
  leaf's widget knows how to render itself for its declared surface.
  Leaves that don't need an object context (the dashboard surfaces)
  render their compact summary; leaves that require an object context
  degrade to their empty state.

  Used by:
    - OpenRegister's app-dashboard view to fill the third row of the
      dashboard with one card per registered integration.
    - The NC user-dashboard umbrella entry bundle to render the same
      list inside the NC dashboard tile.

  @example
  <CnIntegrationWidgetGrid surface="app-dashboard" />
-->
<template>
	<div class="cn-integration-widget-grid" :data-surface="surface">
		<div v-if="visibleIntegrations.length === 0" class="cn-integration-widget-grid__empty">
			<!-- @slot empty Custom empty-state content shown when no integrations are visible. Defaults to the `emptyLabel` text. -->
			<slot name="empty">
				{{ emptyLabel }}
			</slot>
		</div>
		<div v-else class="cn-integration-widget-grid__grid" :style="gridStyles">
			<div
				v-for="integration in visibleIntegrations"
				:key="integration.id"
				class="cn-integration-widget-grid__cell"
				:style="cellStyles(integration)">
				<component
					:is="resolveWidget(integration.id, surface)"
					v-if="resolveWidget(integration.id, surface)"
					v-bind="widgetProps(integration)" />
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard']

/**
 * CnIntegrationWidgetGrid — responsive grid that renders every registered
 * integration's widget for a given dashboard surface.
 *
 * @deprecated Superseded by `CnIntegrationWidget` (tabbed, app-faithful
 * per-leaf content + single-integration mode). Kept until all consumers
 * migrate; a later cleanup PR removes it. New code should use
 * `CnIntegrationWidget`.
 */
export default {
	name: 'CnIntegrationWidgetGrid',

	setup() {
		const { integrations, resolveWidget } = useIntegrationRegistry()
		return {
			registryIntegrations: integrations,
			resolveWidget,
		}
	},

	props: {
		/**
		 * Dashboard surface to render. Must be one of:
		 *   - 'app-dashboard'  — mounted on an OR app's main dashboard
		 *   - 'user-dashboard' — mounted on NC's global dashboard
		 */
		surface: {
			type: String,
			required: true,
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/**
		 * Number of columns at >=1200px screens. Tablets fall back to 2,
		 * mobile to 1 via CSS media queries.
		 */
		columns: {
			type: Number,
			default: 3,
		},
		/**
		 * Optional reference context forwarded to widgets that need a
		 * concrete object — irrelevant for true dashboard surfaces but
		 * kept as an escape hatch.
		 *
		 * @type {{ register: string, schema: string, objectId: string }|null}
		 */
		referenceContext: {
			type: Object,
			default: null,
		},
		/** Pre-translated empty-state label. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No integrations available yet.'),
		},
	},

	computed: {
		/**
		 * The integrations registry, filtered to those that resolve a
		 * widget for the current surface. We deliberately do NOT filter
		 * on a non-existent `surfaces` array — every provider in AD-19
		 * is eligible for every surface (via the registry's fallback);
		 * widgets that have nothing to render simply show their empty
		 * state.
		 *
		 * @return {object[]} Integration descriptors that resolve a widget for this surface.
		 */
		visibleIntegrations() {
			return (this.registryIntegrations || []).filter(integration => {
				// Backward-compat: honor an optional `surfaces` array on the
				// descriptor when present (matches the PHP-side IntegrationsCapability
				// shape). When absent (the JS leaf descriptors as of Phase E),
				// every provider is eligible for every surface — the AD-19
				// fallback rule already grants resolveWidget(...) a default
				// component.
				if (Array.isArray(integration.surfaces) && integration.surfaces.length > 0) {
					if (!integration.surfaces.includes(this.surface)) {
						return false
					}
				}
				return this.resolveWidget(integration.id, this.surface) !== null
			})
		},
		/**
		 * Grid styles. Three columns desktop, tablet/mobile fall back via media queries.
		 */
		gridStyles() {
			return {
				'--cn-iwg-columns': this.columns,
			}
		},
	},

	methods: {
		/**
		 * Per-cell styles that honour the integration's `defaultSize`
		 * grid span (w on the column axis). h is exposed as a CSS var
		 * for downstream widget content sizing.
		 *
		 * @param {object} integration Registry descriptor.
		 * @return {object} Style object.
		 */
		cellStyles(integration) {
			const defaultSize = integration.defaultSize || {}
			const span = Math.min(Math.max(defaultSize.w || 1, 1), this.columns)
			const minH = (defaultSize.h || 0) * 80
			return {
				'grid-column': `span ${span}`,
				'--cn-iwg-min-height': minH > 0 ? `${minH}px` : 'auto',
			}
		},
		/**
		 * Props forwarded to each widget. We pass the integration id,
		 * surface, and pre-translated title; reference context fields
		 * (register/schema/objectId) default to empty strings so that
		 * widgets requiring an object simply render their empty state
		 * instead of throwing on undefined props.
		 *
		 * @param {object} integration Registry descriptor.
		 * @return {object} Props object.
		 */
		widgetProps(integration) {
			const ref = this.referenceContext || {}
			return {
				integrationId: integration.id,
				surface: this.surface,
				title: integration.label,
				icon: integration.icon || null,
				register: ref.register || '',
				schema: ref.schema || '',
				objectId: ref.objectId || '',
			}
		},
	},
}
</script>

<style scoped>
.cn-integration-widget-grid {
	width: 100%;
}

.cn-integration-widget-grid__grid {
	display: grid;
	grid-template-columns: repeat(var(--cn-iwg-columns, 3), minmax(0, 1fr));
	gap: calc(3 * var(--default-grid-baseline, 4px));
}

@media (max-width: 1199px) {
	.cn-integration-widget-grid__grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.cn-integration-widget-grid__cell {
		grid-column: span 1 !important;
	}
}

@media (max-width: 767px) {
	.cn-integration-widget-grid__grid {
		grid-template-columns: 1fr;
	}

	.cn-integration-widget-grid__cell {
		grid-column: 1 !important;
	}
}

.cn-integration-widget-grid__cell {
	min-height: var(--cn-iwg-min-height, auto);
	display: flex;
	flex-direction: column;
}

.cn-integration-widget-grid__cell > * {
	flex: 1;
	min-height: 0;
}

.cn-integration-widget-grid__empty {
	padding: 24px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}
</style>
