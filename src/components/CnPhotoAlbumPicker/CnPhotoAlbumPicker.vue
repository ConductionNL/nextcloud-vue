<!--
  CnPhotoAlbumPicker — modal for picking an existing NC Photos album to
  link to the parent OR object.

  Flow:
    1. Load albums via GET /api/integrations/photos/available
    2. Filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select an album tile (cover thumbnail + name + photo count)
    4. Confirm → emit `link` with `{ albumId }`

  All API calls are wrapped in best-effort try/catch so a transient
  Photos failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnPhotoAlbumPicker/` (NcDialog-based; matches the
  deck/poll/talk picker pattern).

  ADR-019: drives the `photos` integration leaf's "link existing"
  surface; emits `link` so the parent (CnPhotosTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-photo-album-picker"
		@closing="onClose">
		<div class="cn-photo-album-picker">
			<NcNoteCard v-if="error" type="error" class="cn-photo-album-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search albums')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-photo-album-picker__search"
				@update:value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visibleAlbums.length === 0"
				:name="t('nextcloud-vue', 'No albums available')"
				:description="t('nextcloud-vue', 'Create an album in NC Photos first, or use the create dialog.')" />
			<ul v-else class="cn-photo-album-picker__grid">
				<li
					v-for="album in visibleAlbums"
					:key="album.id"
					class="cn-photo-album-picker__tile"
					:class="{ 'cn-photo-album-picker__tile--selected': selectedAlbumId === album.id }">
					<button type="button" class="cn-photo-album-picker__tile-button" @click="pickAlbum(album)">
						<span class="cn-photo-album-picker__cover">
							<img
								v-if="coverUrl(album)"
								:src="coverUrl(album)"
								:alt="album.name"
								class="cn-photo-album-picker__cover-img"
								loading="lazy"
								@error="onCoverError(album)">
							<ImageMultiple v-else :size="32" class="cn-photo-album-picker__cover-fallback" />
						</span>
						<span class="cn-photo-album-picker__name">{{ album.name }}</span>
						<span v-if="countLabel(album)" class="cn-photo-album-picker__count">{{ countLabel(album) }}</span>
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
				:disabled="selectedAlbumId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link album') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnPhotoAlbumPicker — pick an existing Photos album. Emits `link` with
 * the chosen album id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import ImageMultiple from 'vue-material-design-icons/ImageMultiple.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnPhotoAlbumPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, ImageMultiple },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing album') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			albums: [],
			search: '',
			selectedAlbumId: null,
			searchTimer: null,
			brokenCovers: {},
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — so the user sees instant feedback even between
		 * debounce ticks.
		 *
		 * @return {Array} The filtered album rows.
		 */
		visibleAlbums() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.albums
			}
			return this.albums.filter(album => (album.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchAlbums()
	},

	beforeDestroy() {
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

		async fetchAlbums(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/photos/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.albums = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Photos is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load albums.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotoAlbumPicker] fetch albums failed', err)
				this.error = t('nextcloud-vue', 'Could not load albums.')
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
				this.fetchAlbums(this.search.trim())
			}, 300)
		},

		pickAlbum(album) {
			this.selectedAlbumId = album.id
		},

		coverUrl(album) {
			if (!album || this.brokenCovers[album.id]) {
				return ''
			}
			return album.coverPhotoUrl || ''
		},

		onCoverError(album) {
			this.$set(this.brokenCovers, album.id, true)
		},

		countLabel(album) {
			const raw = album?.photoCount
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const count = Number(raw)
			if (!Number.isFinite(count)) {
				return ''
			}
			return n('nextcloud-vue', '{count} photo', '{count} photos', count, { count })
		},

		confirm() {
			if (this.selectedAlbumId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ albumId }`.
			 */
			this.$emit('link', { albumId: this.selectedAlbumId })
		},
	},
}
</script>

<style scoped>
.cn-photo-album-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-photo-album-picker__error {
	margin: 4px 0;
}

.cn-photo-album-picker__search {
	width: 100%;
}

.cn-photo-album-picker__grid {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 10px;
}

.cn-photo-album-picker__tile {
	border-radius: var(--border-radius);
}

.cn-photo-album-picker__tile-button {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	padding: 0 0 6px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
	overflow: hidden;
}

.cn-photo-album-picker__tile-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-photo-album-picker__tile--selected .cn-photo-album-picker__tile-button {
	border-color: var(--color-primary-element);
}

.cn-photo-album-picker__cover {
	position: relative;
	aspect-ratio: 1 / 1;
	width: 100%;
	background: var(--color-background-darker, var(--color-background-dark));
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.cn-photo-album-picker__cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.cn-photo-album-picker__cover-fallback {
	color: var(--color-text-maxcontrast);
}

.cn-photo-album-picker__name {
	font-size: 13px;
	font-weight: 500;
	padding: 0 8px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-photo-album-picker__count {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	padding: 0 8px;
}
</style>
