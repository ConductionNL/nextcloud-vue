<!--
  CnWidgetCardGrid — built-in v2 widget rendering a grid of CnObjectCard items.

  Referenced in v2 manifests via `widgetKey: "card-grid"`. Renders the grid on
  the shared CnWidgetWrapper chrome (title + standard overflow Actions menu:
  Refresh / Documentation / Request a feature) and renders each item in
  `objects` as a CnObjectCard, replacing the v1.3.0 `cardComponent` field
  pattern.

  Spec: REQ-MVR-010 (manifest-v2-renderer) — built-in widget: card-grid
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widgetId="widgetId"
		:documentationUrl="documentationUrl"
		:refreshing="epLoading"
		:chromeless="chromeless"
		flush>
		<div class="cn-widget-card-grid" :class="{ 'cn-widget-card-grid--in-cell': chromeless }">
			<CnObjectCard
				v-for="(item, index) in cards"
				:key="item.id || index"
				:object="item" />
		</div>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { inject, ref } from 'vue'
import CnObjectCard from '../CnObjectCard/CnObjectCard.vue'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

/**
 * CnWidgetCardGrid — built-in v2 widget rendering a grid of CnObjectCard items.
 *
 * Renders the card grid on the shared CnWidgetWrapper chrome, which supplies
 * the widget title and the standard overflow Actions menu (Refresh /
 * Documentation / Request a feature). Each entry in `objects` is rendered as a
 * CnObjectCard. Without `objects`, an `endpointSource` (`{ url, method?,
 * params?, responsePath? }`, as on the object table) supplies them: the
 * payload after `responsePath` is the array of objects.
 */
export default {
	name: 'CnWidgetCardGrid',

	components: { CnObjectCard, CnWidgetWrapper },

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Items'),
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

		/**
		 * Draw no frame, title or Actions menu of its own: the surface around
		 * the grid already drew the card (a dashboard cell). The cards then
		 * take the cell's inset.
		 */
		chromeless: {
			type: Boolean,
			default: false,
		},

		/** Array of object records to render as cards. */
		objects: {
			type: Array,
			default: () => [],
		},

		/**
		 * Read the objects from an app endpoint: `{ url, method?, params?,
		 * responsePath? }`, with the token grammar of widget filters. Ignored
		 * while `objects` holds any.
		 *
		 * @type {object|null}
		 */
		endpointSource: {
			type: Object,
			default: null,
		},
	},

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref(null))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const unwrap = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)
		const { data, loading } = useEndpointSource(
			() => ((props.objects && props.objects.length > 0) ? null : props.endpointSource),
			{
				ctx: () => ({
					...(resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}),
					workspace: unwrap(workspaceRaw) || {},
					config: unwrap(appConfigRaw) || {},
				}),
				widgetId: () => props.widgetId,
			},
		)
		return { epData: data, epLoading: loading }
	},

	computed: {
		/**
		 * The objects drawn: `objects` when given, else the endpoint's array.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/endpoint-source-card-grid-record-list/specs/dashboard-page/spec.md#requirement-a-record-list-and-a-card-grid-can-read-an-endpoint
		 */
		cards() {
			if (this.objects && this.objects.length > 0) {
				return this.objects
			}
			return Array.isArray(this.epData) ? this.epData : []
		},
	},
}
</script>

<style>
.cn-widget-card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: calc(2 * var(--default-grid-baseline, 4px));
}

/* In a dashboard cell that draws the titled card, the cards keep an inset
   from its edge; in a borderless cell they stand flush.
   @spec openspec/changes/card-grid-dashboard-frame/specs/card-grid-dashboard-frame/spec.md#requirement-a-card-grid-on-a-dashboard-draws-no-frame-of-its-own */
.cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-widget-card-grid--in-cell {
	box-sizing: border-box;
	padding: 16px;
}
</style>
