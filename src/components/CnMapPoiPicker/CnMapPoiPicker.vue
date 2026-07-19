<!--
  CnMapPoiPicker — modal for picking an existing NC Maps favorite (POI)
  to link to the parent OR object.

  Flow:
    1. Load POIs via GET /api/integrations/maps/available
    2. Filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select a POI row (name + category badge + coordinates)
    4. Confirm → emit `link` with `{ favoriteId }`

  All API calls are wrapped in best-effort try/catch so a transient Maps
  failure surfaces a user-visible inline error rather than a modal crash.
  The modal stays open across errors so the user can retry without
  losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnMapPoiPicker/` (NcDialog-based; matches the
  photo/deck/poll/talk picker pattern).

  ADR-019: drives the `maps` integration leaf's "link existing" surface;
  emits `link` so the parent (CnMapsTab) can POST the selection to the OR
  endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-map-poi-picker"
		@closing="onClose">
		<div class="cn-map-poi-picker">
			<NcNoteCard v-if="error" type="error" class="cn-map-poi-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search locations')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-map-poi-picker__search"
				@update:model-value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visiblePois.length === 0"
				:name="t('nextcloud-vue', 'No locations available')"
				:description="t('nextcloud-vue', 'Add a favorite in NC Maps first, or use the create dialog.')" />
			<ul v-else class="cn-map-poi-picker__list">
				<li
					v-for="poi in visiblePois"
					:key="poi.id"
					class="cn-map-poi-picker__row"
					:class="{ 'cn-map-poi-picker__row--selected': selectedFavoriteId === poi.id }">
					<button type="button" class="cn-map-poi-picker__row-button" @click="pickPoi(poi)">
						<span class="cn-map-poi-picker__row-icon">
							<MapMarker :size="20" />
						</span>
						<span class="cn-map-poi-picker__row-main">
							<span class="cn-map-poi-picker__row-header">
								<span class="cn-map-poi-picker__name">{{ poi.name }}</span>
								<span v-if="poi.category" class="cn-map-poi-picker__category">{{ poi.category }}</span>
							</span>
							<span v-if="coordsLabel(poi)" class="cn-map-poi-picker__coords">{{ coordsLabel(poi) }}</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="selectedFavoriteId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link location') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnMapPoiPicker — pick an existing Maps favorite (POI). Emits `link`
 * with the chosen favorite id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnMapPoiPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, MapMarker },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing location') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			pois: [],
			search: '',
			selectedFavoriteId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — so the user sees instant feedback even between
		 * debounce ticks.
		 *
		 * @return {Array} The filtered POI rows.
		 */
		visiblePois() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.pois
			}
			return this.pois.filter(poi => (poi.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchPois()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		async fetchPois(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/maps/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.pois = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Maps is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load locations.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnMapPoiPicker] fetch locations failed', err)
				this.error = t('nextcloud-vue', 'Could not load locations.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			// Debounce server-side filter; client-side filter is live.
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchPois(this.search.trim())
			}, 300)
		},

		pickPoi(poi) {
			this.selectedFavoriteId = poi.id
		},

		coordsLabel(poi) {
			const lat = Number(poi?.lat)
			const lng = Number(poi?.lng)
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
				return ''
			}
			return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
		},

		confirm() {
			if (this.selectedFavoriteId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ favoriteId }`.
			 */
			this.$emit('link', { favoriteId: this.selectedFavoriteId })
		},
	},
}
</script>

<style scoped>
.cn-map-poi-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-map-poi-picker__error {
	margin: 4px 0;
}

.cn-map-poi-picker__search {
	width: 100%;
}

.cn-map-poi-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-map-poi-picker__row {
	border-radius: var(--border-radius);
}

.cn-map-poi-picker__row-button {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-map-poi-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-map-poi-picker__row--selected .cn-map-poi-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-map-poi-picker__row-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	padding-top: 2px;
}

.cn-map-poi-picker__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-map-poi-picker__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-map-poi-picker__name {
	flex: 1;
	min-width: 0;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-map-poi-picker__category {
	flex-shrink: 0;
	font-size: 0.7em;
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--color-background-darker, var(--color-background-dark));
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.cn-map-poi-picker__coords {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
	font-family: var(--font-face-monospace, monospace);
}
</style>
