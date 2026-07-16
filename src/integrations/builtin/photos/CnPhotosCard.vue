<!--
  CnPhotosCard — bespoke surface-aware widget for the `photos`
  integration.

  Replaces the generic CnIntegrationCard for the `photos` leaf. Branches
  on `surface` per ADR-019 AD-19:
    - user-dashboard / app-dashboard : count headline "N albums" + the
        first album's cover thumbnail + a "view all" trail-off.
    - detail-page                    : a compact 2-column thumbnail grid
        of the linked albums (COMPACT_LIMIT cap) with "view all".
    - single-entity                  : a chip with the cover thumbnail +
        album name for reference-property auto-rendering.

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnPhotosTab; for `single-entity` the optional `value` prop addresses a
  single album by id.

  See `openregister/openspec/changes/integration-photos/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-photos-card__chip" :title="albumName(entity)">
				<img
					v-if="coverUrl(entity)"
					:src="coverUrl(entity)"
					:alt="''"
					class="cn-photos-card__chip-cover"
					@error="onCoverError(entity)">
				<ImageIcon v-else :size="14" />
				<a
					:href="albumUrl(entity)"
					target="_blank"
					rel="noopener noreferrer">{{ albumName(entity) }}</a>
			</span>
			<span v-else class="cn-photos-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + first cover -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-photos-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="albums.length === 0" class="cn-photos-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-photos-card__headline">
				<div class="cn-photos-card__headline-line">
					<strong>{{ albumCountLabel }}</strong>
					<span v-if="totalPhotoCount !== null" class="cn-photos-card__photo-total">
						· {{ totalPhotosLabel }}
					</span>
				</div>
				<div v-if="firstAlbum" class="cn-photos-card__headline-album">
					<div class="cn-photos-card__headline-cover">
						<img
							v-if="coverUrl(firstAlbum)"
							:src="coverUrl(firstAlbum)"
							:alt="''"
							class="cn-photos-card__headline-cover-img"
							@error="onCoverError(firstAlbum)">
						<ImageMultiple v-else :size="18" />
					</div>
					<a
						:href="albumUrl(firstAlbum)"
						target="_blank"
						rel="noopener noreferrer"
						class="cn-photos-card__headline-name">
						{{ albumName(firstAlbum) }}
					</a>
				</div>
				<div v-if="albums.length > 1" class="cn-photos-card__view-all">
					<a
						:href="photosAppUrl"
						target="_blank"
						rel="noopener noreferrer">{{ viewAllLabel }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact grid -->
		<template v-else>
			<div v-if="degraded" class="cn-photos-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="albums.length === 0" class="cn-photos-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-photos-card__grid">
				<a
					v-for="album in displayedAlbums"
					:key="albumKey(album)"
					:href="albumUrl(album)"
					class="cn-photos-card__tile"
					target="_blank"
					rel="noopener noreferrer"
					:title="albumName(album)">
					<div class="cn-photos-card__tile-cover">
						<img
							v-if="coverUrl(album)"
							:src="coverUrl(album)"
							:alt="''"
							class="cn-photos-card__tile-cover-img"
							loading="lazy"
							@error="onCoverError(album)">
						<ImageMultiple v-else :size="20" class="cn-photos-card__tile-fallback" />
					</div>
					<span class="cn-photos-card__tile-name">{{ albumName(album) }}</span>
				</a>
			</div>
			<div v-if="albums.length > COMPACT_LIMIT" class="cn-photos-card__view-all">
				<a
					:href="photosAppUrl"
					target="_blank"
					rel="noopener noreferrer">{{ viewAllLabel }}</a>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import ImageIcon from 'vue-material-design-icons/Image.vue'
import ImageMultiple from 'vue-material-design-icons/ImageMultiple.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 4

/**
 * CnPhotosCard — bespoke surface-aware widget for the `photos`
 * integration.
 *
 * Renders Photos-aware metadata (album count, cover thumbnail, total
 * photo count) across all four AD-19 surfaces. See the file-level
 * docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnPhotosCard',

	components: { CnDetailCard, NcLoadingIcon, ImageIcon, ImageMultiple },

	props: {
		/** Stable integration id (forwarded from the registry — always `'photos'`). */
		integrationId: { type: String, default: 'photos' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (album id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Photos') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => ImageIcon },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No albums linked yet') },
		/** Pre-translated 503 unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Photos is currently unavailable.') },
		/** Pre-translated "view all" trail-off link label. */
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all in Photos') },
		/** URL of the NC Photos app entry. */
		photosAppUrl: { type: String, default: '/index.php/apps/photos' },
	},

	data() {
		return {
			COMPACT_LIMIT,
			albums: [],
			entity: null,
			loading: false,
			degraded: '',
			brokenCovers: {},
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedAlbums() {
			return this.albums.slice(0, COMPACT_LIMIT)
		},

		albumCountLabel() {
			const total = this.albums.length
			return n('nextcloud-vue', '{count} album', '{count} albums', total, { count: total })
		},

		totalPhotoCount() {
			let total = 0
			let any = false
			for (const a of this.albums) {
				const c = this.photoCount(a)
				if (c !== null) {
					total += c
					any = true
				}
			}
			return any ? total : null
		},

		totalPhotosLabel() {
			const count = this.totalPhotoCount ?? 0
			return n('nextcloud-vue', '{count} photo', '{count} photos', count, { count })
		},

		firstAlbum() {
			return this.albums.length > 0 ? this.albums[0] : null
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		albumKey(album) {
			return (album && (album.id ?? album.data?.album_id)) || ''
		},

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

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
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
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosCard] failed to fetch albums', err)
				this.albums = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (this.value === '' || this.value === undefined || this.value === null || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosCard] failed to fetch single album', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-photos-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-photos-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-photos-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-photos-card__photo-total {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	font-weight: 400;
}

.cn-photos-card__headline-album {
	display: flex;
	align-items: center;
	gap: 8px;
	overflow: hidden;
}

.cn-photos-card__headline-cover {
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius);
	overflow: hidden;
	flex-shrink: 0;
	background: var(--color-background-darker, var(--color-background-dark));
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-photos-card__headline-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cn-photos-card__headline-name {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.95em;
}

.cn-photos-card__headline-name:hover {
	text-decoration: underline;
}

.cn-photos-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px 4px 4px;
	border-radius: 14px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
}

.cn-photos-card__chip-cover {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;
}

.cn-photos-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-photos-card__chip a:hover {
	text-decoration: underline;
}

.cn-photos-card__grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 8px;
}

.cn-photos-card__tile {
	display: flex;
	flex-direction: column;
	gap: 4px;
	text-decoration: none;
	color: inherit;
	border-radius: var(--border-radius);
	overflow: hidden;
	background: var(--color-background-hover);
}

.cn-photos-card__tile:hover,
.cn-photos-card__tile:focus-within {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-photos-card__tile-cover {
	width: 100%;
	aspect-ratio: 1 / 1;
	background: var(--color-background-darker, var(--color-background-dark));
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.cn-photos-card__tile-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cn-photos-card__tile-fallback {
	color: var(--color-text-maxcontrast);
}

.cn-photos-card__tile-name {
	padding: 4px 6px 6px;
	font-size: 12px;
	color: var(--color-main-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-photos-card__view-all {
	margin-top: 6px;
	font-size: 0.8em;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-photos-card__view-all a {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-photos-card__view-all a:hover {
	text-decoration: underline;
}
</style>
