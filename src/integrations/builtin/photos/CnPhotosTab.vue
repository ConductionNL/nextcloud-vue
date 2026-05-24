<!--
  CnPhotosTab — bespoke sidebar tab for the `photos` integration leaf.

  Replaces the generic `CnIntegrationTab` for the `photos` leaf: renders
  the linked NC Photos albums as a card grid (cover thumbnail, album
  name, photo count, last-edited date). Clicking a card deep-links into
  the NC Photos app at `/index.php/apps/photos/albums/{albumName}`.

  Talks to the OR pluggable-integration sub-resource:
    GET /api/objects/{register}/{schema}/{objectId}/integrations/photos
  served by `OCA\OpenRegister\Service\Integration\Providers\PhotosProvider`
  (which queries `OCA\Photos\Album\AlbumMapper` filtered by the
  `[or:{uuid}]` marker in `photos_albums.name`).

  The provider returns rows shaped:
    { id, title, url, data: { album_id, name, user, created } }

  Empty + loading + error + 503 unavailable states follow ADR-017 and
  AD-23 graceful degradation. All UI strings are passed through
  `t('nextcloud-vue', ...)` per ADR-007. Styling uses Nextcloud CSS
  variables only so the nldesign overrides apply transparently
  (ADR-010).

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which loses the cover thumbnail + photo count + recency — the three
  signals users rely on when triaging which album is relevant for a
  case. The bespoke tab surfaces them per card.
-->
<template>
	<div class="cn-sidebar-tab cn-photos-tab">
		<!-- 503 unavailable banner (AD-23) -->
		<div v-if="degraded" class="cn-photos-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<!-- Loading -->
		<NcLoadingIcon v-if="loading" />

		<!-- Error -->
		<div v-else-if="error" class="cn-photos-tab__error" role="alert">
			{{ error }}
		</div>

		<!-- Empty -->
		<div v-else-if="albums.length === 0" class="cn-sidebar-tab__empty cn-photos-tab__empty">
			<ImageIcon :size="32" class="cn-photos-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openPhotosApp">
				<template #icon>
					<ImageIcon :size="20" />
				</template>
				{{ openPhotosLabel }}
			</NcButton>
		</div>

		<!-- Album grid -->
		<div v-else class="cn-photos-tab__grid">
			<a
				v-for="album in albums"
				:key="albumKey(album)"
				:href="albumUrl(album)"
				class="cn-photos-tab__tile"
				target="_blank"
				rel="noopener noreferrer">
				<div class="cn-photos-tab__cover">
					<img
						v-if="coverUrl(album)"
						:src="coverUrl(album)"
						:alt="albumName(album)"
						class="cn-photos-tab__cover-img"
						loading="lazy"
						@error="onCoverError(album)">
					<ImageMultiple v-else :size="36" class="cn-photos-tab__cover-fallback" />
				</div>
				<div class="cn-photos-tab__meta">
					<span class="cn-photos-tab__name">{{ albumName(album) }}</span>
					<span class="cn-photos-tab__sub">
						<span v-if="photoCount(album) !== null" class="cn-photos-tab__count">
							{{ photoCountLabel(album) }}
						</span>
						<span v-if="lastEdited(album)" class="cn-photos-tab__when">
							· {{ formatWhen(lastEdited(album)) }}
						</span>
					</span>
				</div>
			</a>
		</div>
	</div>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ImageIcon from 'vue-material-design-icons/Image.vue'
import ImageMultiple from 'vue-material-design-icons/ImageMultiple.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnPhotosTab — bespoke album grid for the `photos` integration.
 *
 * Renders one tile per linked NC Photos album with cover thumbnail,
 * album name, photo count, and last-edited date. Clicking a tile
 * opens the album in the NC Photos app in a new tab.
 */
export default {
	name: 'CnPhotosTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, ImageIcon, ImageMultiple },

	props: {
		/** Stable integration id (forwarded from the registry — always `'photos'`). */
		integrationId: { type: String, default: 'photos' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No albums linked yet') },
		/** Pre-translated "Open Photos" CTA label. */
		openPhotosLabel: { type: String, default: () => t('nextcloud-vue', 'Open Photos') },
		/** Pre-translated 503 unavailable banner copy. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Photos is currently unavailable.') },
		/** URL of the NC Photos app entry. */
		photosAppUrl: { type: String, default: '/index.php/apps/photos' },
	},

	data() {
		return {
			albums: [],
			loading: false,
			error: '',
			degraded: '',
			brokenCovers: {},
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchAlbums() } } },
		register() { this.fetchAlbums() },
		schema() { this.fetchAlbums() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		albumKey(album) {
			return (album && (album.id ?? album.data?.album_id)) || ''
		},

		/**
		 * Resolve the displayable album name from the row, stripping the
		 * `[or:{uuid}]` marker (Photos provider keeps the marker inside
		 * the `name` for the LIKE query).
		 *
		 * @param {object} album Provider row.
		 *
		 * @return {string}
		 */
		albumName(album) {
			const raw = (album && (album.title || album.name || album.data?.name)) || ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim() || t('nextcloud-vue', 'Untitled album')
		},

		albumUrl(album) {
			if (album && album.url) {
				return album.url
			}
			const name = this.albumName(album)
			return `/index.php/apps/photos/albums/${encodeURIComponent(name)}`
		},

		coverUrl(album) {
			if (!album || this.brokenCovers[this.albumKey(album)]) {
				return ''
			}
			// Prefer an explicit cover URL from the provider; otherwise
			// fall back to the data envelope's coverPhotoUrl (future
			// enrichment) or null (placeholder icon renders).
			return album.coverPhotoUrl || album.data?.coverPhotoUrl || ''
		},

		onCoverError(album) {
			this.$set(this.brokenCovers, this.albumKey(album), true)
		},

		photoCount(album) {
			const raw = album?.photoCount ?? album?.data?.photoCount ?? album?.data?.count
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isFinite(num) ? num : null
		},

		photoCountLabel(album) {
			const count = this.photoCount(album)
			if (count === null) {
				return ''
			}
			return n('nextcloud-vue', '{count} photo', '{count} photos', count, { count })
		},

		lastEdited(album) {
			return album?.lastEdited
				|| album?.data?.lastEdited
				|| album?.data?.created
				|| ''
		},

		formatWhen(value) {
			if (!value) return ''
			try {
				// NC Photos stores `created` as a unix timestamp in
				// seconds; accept ISO strings transparently too.
				const num = Number(value)
				const d = Number.isFinite(num) && num > 0 && String(value).length <= 12
					? new Date(num * 1000)
					: new Date(value)
				if (Number.isNaN(d.getTime())) return String(value)
				return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (_) {
				return String(value)
			}
		},

		openPhotosApp() {
			if (typeof window !== 'undefined') {
				window.open(this.photosAppUrl, '_blank', 'noopener')
			}
		},

		async fetchAlbums() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.albums = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.albums = []
					this.degraded = this.unavailableLabel
				} else {
					this.albums = []
					this.error = t('nextcloud-vue', 'Could not load albums.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosTab] failed to fetch albums', err)
				this.albums = []
				this.error = t('nextcloud-vue', 'Could not load albums.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-photos-tab {
	padding: 12px;
	overflow-x: hidden;
}

.cn-photos-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-photos-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-photos-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-photos-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-photos-tab__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 10px;
}

.cn-photos-tab__tile {
	display: flex;
	flex-direction: column;
	gap: 6px;
	text-decoration: none;
	color: inherit;
	border-radius: var(--border-radius);
	overflow: hidden;
	background: var(--color-background-hover);
	transition: transform 0.15s ease;
}

.cn-photos-tab__tile:hover,
.cn-photos-tab__tile:focus-within {
	transform: translateY(-2px);
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-photos-tab__cover {
	position: relative;
	aspect-ratio: 1 / 1;
	width: 100%;
	background: var(--color-background-darker, var(--color-background-dark));
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.cn-photos-tab__cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.cn-photos-tab__cover-fallback {
	color: var(--color-text-maxcontrast);
}

.cn-photos-tab__meta {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px 8px 8px;
	min-width: 0;
}

.cn-photos-tab__name {
	font-size: 13px;
	font-weight: 500;
	color: var(--color-main-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-photos-tab__sub {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-photos-tab__count {
	font-weight: 500;
}

.cn-photos-tab__when {
	white-space: nowrap;
}
</style>
