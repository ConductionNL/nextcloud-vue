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
			:show-more-url="widget.widgetUrl"
			:loading="loading"
			:item-menu="false"
			:round-icons="widget.itemIconsRound">
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

		<!-- Loading state -->
		<div v-else-if="loading" class="cn-widget-renderer__loading">
			<NcLoadingIcon :size="32" />
		</div>

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
import { NcDashboardWidget, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

/**
 * CnWidgetRenderer — Renders Nextcloud Dashboard API widgets.
 *
 * Fetches widget items from the OCS Dashboard API and displays them
 * using the standard NcDashboardWidget component.
 *
 * ```vue
 * <CnWidgetRenderer :widget="ncWidget" />
 * ```
 */
export default {
	name: 'CnWidgetRenderer',

	components: {
		NcDashboardWidget,
		NcEmptyContent,
		NcLoadingIcon,
		AlertCircleOutline,
	},

	props: {
		/**
		 * Nextcloud widget object from the Dashboard API.
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

	data() {
		return {
			loading: false,
			items: [],
			emptyMessage: '',
			refreshInterval: null,
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
			return this.items.map(item => ({
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
		if (this.isApiWidget) {
			await this.loadItems()

			if (this.widget.reloadInterval && this.widget.reloadInterval > 0) {
				this.refreshInterval = setInterval(
					() => this.loadItems(),
					this.widget.reloadInterval * 1000,
				)
			}
		}
	},

	beforeDestroy() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval)
		}
	},

	methods: {
		async loadItems() {
			this.loading = true
			try {
				const version = this.isApiWidgetV2 ? 2 : 1
				const url = generateOcsUrl(
					`/apps/dashboard/api/v${version}/widget-items`,
				)
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
				console.error(`[CnWidgetRenderer] Failed to load items for ${this.widget.id}:`, error)
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-widget-renderer {
	height: 100%;
	padding: 8px;
}

.cn-widget-renderer__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}
</style>
