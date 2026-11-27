<!--
  CnWidgetRenderer — Renders Nextcloud Dashboard API widgets (v1/v2).

  Loads widget items from the Nextcloud widget API and displays them
  using NcDashboardWidget. Supports auto-refresh for widgets that
  define a reload interval.
-->
<template>
	<div class="cn-widget-renderer">
		<!-- API Widget V1 or V2 -->
		<NcDashboardWidget
			v-if="isApiWidget"
			:items="widgetItems"
			:showMoreUrl="widget.widgetUrl"
			:loading="false"
			:itemMenu="false"
			:roundIcons="widget.itemIconsRound">
			<template #empty-content>
				<NcEmptyContent
					v-if="emptyMessage"
					:description="emptyMessage">
					<template #icon>
						<span v-if="widget.iconClass" :class="widget.iconClass" />
					</template>
				</NcEmptyContent>
			</template>
		</NcDashboardWidget>

		<!-- Fallback for unknown widget types -->
		<NcEmptyContent
			v-else
			:description="unavailableText">
			<template #icon>
				<AlertCircleOutline :size="48" />
			</template>
		</NcEmptyContent>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'
import { NcDashboardWidget, NcEmptyContent } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'

/**
 * CnWidgetRenderer — Renders Nextcloud Dashboard API widgets.
 *
 * Fetches widget items from the OCS Dashboard API and displays them
 * using the standard NcDashboardWidget component.
 *
 * It draws no spinner for its first fetch: it emits `loaded` once that
 * fetch settles (items, empty or error), and its host's `CnWidgetWrapper`
 * draws the widget's placeholder until then. A refresh keeps the items it
 * shows and does not emit `loaded` again.
 *
 * ```vue
 * <CnWidgetWrapper :loading="!loaded" :placeholder="shape">
 *   <CnWidgetRenderer :widget="ncWidget" @loaded="loaded = true" />
 * </CnWidgetWrapper>
 * ```
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-6
 */
export default {
	name: 'CnWidgetRenderer',

	components: {
		NcDashboardWidget,
		NcEmptyContent,
		AlertCircleOutline,
	},

	props: {
		/**
		 * Nextcloud widget object from the Dashboard API.
		 *
		 * @type {{ id: string, title: string, iconClass: string, iconUrl: string, widgetUrl: string, itemIconsRound: boolean, itemApiVersions: number[], reloadInterval: number, buttons: Array }}
		 */
		widget: {
			type: Object,
			required: true,
		},

		/** Text shown when widget is not available */
		unavailableText: {
			type: String,
			default: 'Widget not available',
		},
	},

	emits: ['loaded'],

	data() {
		return {
			loading: false,
			items: [],
			emptyMessage: '',
			refreshInterval: null,
			hasLoaded: false,
		}
	},

	computed: {
		isApiWidgetV2() {
			return this.widget?.itemApiVersions?.includes(2)
		},

		isApiWidgetV1() {
			return this.widget?.itemApiVersions?.includes(1)
		},

		isApiWidget() {
			return this.isApiWidgetV1 || this.isApiWidgetV2
		},

		widgetItems() {
			return this.items.map((item) => ({
				id: item.sinceId || item.id || String(Math.random()),
				targetUrl: item.link || item.targetUrl || '',
				avatarUrl: item.iconUrl || item.avatarUrl || '',
				avatarUsername: item.avatarUsername || '',
				overlayIconUrl: item.overlayIconUrl || '',
				mainText: item.title || item.mainText || '',
				subText: item.subtitle || item.subText || '',
			}))
		},
	},

	async mounted() {
		if (!this.isApiWidget) {
			// Nothing to fetch: the content is there with the first render.
			this.markLoaded()
			return
		}
		await this.loadItems()

		if (this.widget.reloadInterval && this.widget.reloadInterval > 0) {
			this.refreshInterval = setInterval(
				() => this.loadItems(),
				this.widget.reloadInterval * 1000,
			)
		}
	},

	beforeUnmount() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval)
		}
	},

	methods: {
		async loadItems() {
			this.loading = true
			try {
				const version = this.isApiWidgetV2 ? 2 : 1
				const url = generateOcsUrl(`/apps/dashboard/api/v${version}/widget-items`)
				const response = await axios.get(url, {
					params: { widgets: [this.widget.id] },
				})

				const data = response.data?.ocs?.data
				if (data && data[this.widget.id]) {
					const widgetData = data[this.widget.id]
					this.items = widgetData.items || widgetData || []
					this.emptyMessage = widgetData.emptyContentMessage || ''
				}
			} catch (error) {
				// eslint-disable-next-line no-console -- the failure is already handled; the console is the only channel a host app can read the detail on
				console.error(`[CnWidgetRenderer] Failed to load items for ${this.widget.id}:`, error)
			} finally {
				this.loading = false
				this.markLoaded()
			}
		},

		/**
		 * Emit `loaded` once, when the first load has settled. A later
		 * fetch (auto-refresh) keeps the items it shows and stays silent.
		 *
		 * @return {void}
		 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-6
		 */
		markLoaded() {
			if (this.hasLoaded) {
				return
			}
			this.hasLoaded = true
			/**
			 * The first load has settled, with items, none or an error.
			 * Emitted once.
			 */
			this.$emit('loaded')
		},
	},
}
</script>

<style scoped>
.cn-widget-renderer {
	height: 100%;
	padding: 8px;
}
</style>
