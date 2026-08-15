<!--
  CnPhotosTab — bespoke sidebar tab for the `photos` integration leaf.

  Replaces the generic `CnIntegrationTab` for the `photos` leaf: renders
  the linked NC Photos albums as a card grid (cover thumbnail, album
  name, photo count, last-edited date). Clicking a card deep-links into
  the NC Photos app at `/index.php/apps/photos/albums/{albumId}`.

  Tier-2 surface (this commit):
    - "Link existing album"  → opens CnPhotoAlbumPicker (modal)
    - "Create new album"     → opens CnPhotoAlbumCreate (modal)
    - Per-tile unlink        → DELETE …/photos/{albumId}

  Talks to the OpenRegister Tier-2 photo-link endpoints
    GET     /api/objects/{r}/{s}/{id}/photos            — list
    POST    /api/objects/{r}/{s}/{id}/photos            — link existing
    POST    /api/objects/{r}/{s}/{id}/photos/new        — create + link
    DELETE  /api/objects/{r}/{s}/{id}/photos/{albumId}  — unlink
    GET     /api/integrations/photos/available          — picker source
  served by `OCA\OpenRegister\Controller\PhotoLinksController`.

  The endpoint returns rows shaped:
    { id, title, url, albumId, albumName, coverPhotoUrl, photoCount,
      lastEdited, data: { … } }

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

		<div class="cn-photos-tab__actions">
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing album') }}
			</NcButton>
			<NcButton variant="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new album') }}
			</NcButton>
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
			<NcButton variant="primary" @click="openPhotosApp">
				<template #icon>
					<ImageIcon :size="20" />
				</template>
				{{ openPhotosLabel }}
			</NcButton>
		</div>

		<!-- Photo mosaic grid (mirrors the NC Photos timeline) -->
		<div v-else class="cn-photos-tab__grid">
			<div
				v-for="album in albums"
				:key="albumKey(album)"
				class="cn-photos-tab__tile">
				<a
					:href="albumUrl(album)"
					class="cn-photos-tab__tile-link"
					target="_blank"
					rel="noopener noreferrer"
					:title="albumName(album)">
					<div class="cn-photos-tab__cover">
						<img
							v-if="coverUrl(album)"
							:src="coverUrl(album)"
							:alt="albumName(album)"
							class="cn-photos-tab__cover-img"
							loading="lazy"
							@error="onCoverError(album)">
						<span v-else class="cn-photos-tab__cover-placeholder">
							<ImageMultiple :size="36" class="cn-photos-tab__cover-fallback" />
						</span>
						<!-- Photo-count badge, top-left (mirrors album stack overlay) -->
						<span v-if="photoCount(album) !== null" class="cn-photos-tab__badge">
							<ImageMultiple :size="12" />
							<span class="cn-photos-tab__badge-count">{{ photoCountLabel(album) }}</span>
						</span>
						<!-- Hover scrim with name + date -->
						<div class="cn-photos-tab__meta">
							<span class="cn-photos-tab__name">{{ albumName(album) }}</span>
							<span v-if="lastEdited(album)" class="cn-photos-tab__when">
								{{ formatWhen(lastEdited(album)) }}
							</span>
						</div>
					</div>
				</a>
				<NcButton
					type="tertiary-no-background"
					:aria-label="t('nextcloud-vue', 'Unlink album')"
					class="cn-photos-tab__unlink"
					@click="unlinkAlbum(album)">
					<template #icon>
						<LinkOff :size="16" />
					</template>
				</NcButton>
			</div>
		</div>

		<CnPhotoAlbumPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnPhotoAlbumCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ImageIcon from 'vue-material-design-icons/Image.vue'
import ImageMultiple from 'vue-material-design-icons/ImageMultiple.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnPhotoAlbumCreate from '../../../components/CnPhotoAlbumCreate/CnPhotoAlbumCreate.vue'
import CnPhotoAlbumPicker from '../../../components/CnPhotoAlbumPicker/CnPhotoAlbumPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnPhotosTab — bespoke album grid for the `photos` integration.
 *
 * Renders one tile per linked NC Photos album with cover thumbnail,
 * album name, photo count, and last-edited date. Clicking a tile opens
 * the album in the NC Photos app in a new tab. Tier-2: includes
 * link/create modals and per-tile unlink.
 */
export default {
	name: 'CnPhotosTab',

	components: {
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		ImageIcon,
		ImageMultiple,
		LinkOff,
		LinkVariant,
		Plus,
		CnPhotoAlbumPicker,
		CnPhotoAlbumCreate,
	},

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
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchAlbums() } } },
		register() { this.fetchAlbums() },
		schema() { this.fetchAlbums() },
	},

	methods: {
		t,

		/**
		 * Base for the Tier-2 photos endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		photosEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/photos`
		},

		albumKey(album) {
			return (album && (album.albumId ?? album.id ?? album.data?.album_id)) || ''
		},

		/**
		 * Resolve the displayable album name from the row, stripping any
		 * legacy `[or:{uuid}]` marker (pre-Tier-2 albums embedded the
		 * marker inside `name`).
		 *
		 * @param {object} album Provider row.
		 *
		 * @return {string} The display name.
		 */
		albumName(album) {
			const raw = (album && (album.albumName || album.title || album.name || album.data?.name)) || ''
			return String(raw).replace(/\s*\[or:[^\]]+\]\s*/g, ' ').trim() || t('nextcloud-vue', 'Untitled album')
		},

		albumUrl(album) {
			if (album && album.url) {
				return album.url
			}
			const id = this.albumKey(album)
			return `/index.php/apps/photos/albums/${encodeURIComponent(id)}`
		},

		coverUrl(album) {
			if (!album || this.brokenCovers[this.albumKey(album)]) {
				return ''
			}
			return album.coverPhotoUrl || album.data?.coverPhotoUrl || ''
		},

		onCoverError(album) {
			this.brokenCovers[this.albumKey(album)] = true
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
			if (!value) {
				return ''
			}
			try {
				// NC Photos stores `created` as a unix timestamp in
				// seconds; accept ISO strings transparently too.
				const num = Number(value)
				const d = Number.isFinite(num) && num > 0 && String(value).length <= 12
					? new Date(num * 1000)
					: new Date(value)
				if (Number.isNaN(d.getTime())) {
					return String(value)
				}
				return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (_) {
				return String(value)
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.photosEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchAlbums()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This album is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link album.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link album.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.photosEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchAlbums()
				} else {
					this.error = t('nextcloud-vue', 'Could not create album.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create album.')
			}
		},

		async unlinkAlbum(album) {
			const albumId = this.albumKey(album)
			if (!albumId) {
				return
			}
			try {
				const response = await fetch(`${this.photosEndpoint()}/${albumId}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchAlbums()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink album.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnPhotosTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink album.')
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
				const response = await fetch(this.photosEndpoint(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.albums = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503 || response.status === 501) {
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

.cn-photos-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
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

/*
 * Dense edge-to-edge mosaic that mirrors the NC Photos timeline: square
 * thumbnails packed tight with a thin main-background gutter (the same
 * 2px border NC Photos draws between tiles), name + date revealed in a
 * bottom scrim on hover/focus so the imagery dominates at rest.
 */
.cn-photos-tab__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
	gap: 2px;
	border-radius: var(--border-radius-large, var(--border-radius));
	overflow: hidden;
}

.cn-photos-tab__tile {
	position: relative;
}

.cn-photos-tab__unlink {
	position: absolute;
	top: 4px;
	right: 4px;
	z-index: 3;
	opacity: 0;
	background: var(--color-main-background);
	border-radius: 50%;
	transition: opacity 0.15s ease;
}

.cn-photos-tab__tile:hover .cn-photos-tab__unlink,
.cn-photos-tab__tile:focus-within .cn-photos-tab__unlink {
	opacity: 1;
}

.cn-photos-tab__tile-link {
	display: block;
	text-decoration: none;
	color: inherit;
}

.cn-photos-tab__cover {
	position: relative;
	aspect-ratio: 1 / 1;
	width: 100%;
	/* Match the NC Photos selection outline on focus. */
	border: 2px solid var(--color-main-background);
	box-sizing: border-box;
	background: var(--color-primary-element-light, var(--color-background-darker));
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.cn-photos-tab__tile-link:focus-visible .cn-photos-tab__cover {
	outline: var(--color-primary-element) solid 2px;
	outline-offset: -2px;
}

.cn-photos-tab__cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	transition: transform 0.2s ease;
}

.cn-photos-tab__tile:hover .cn-photos-tab__cover-img,
.cn-photos-tab__tile:focus-within .cn-photos-tab__cover-img {
	transform: scale(1.04);
}

.cn-photos-tab__cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.cn-photos-tab__cover-fallback {
	color: var(--color-primary-element);
}

/* Photo-count badge (mirrors the album stack count overlay). */
.cn-photos-tab__badge {
	position: absolute;
	top: 4px;
	left: 4px;
	z-index: 2;
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 6px 1px 4px;
	border-radius: var(--border-radius-pill, 12px);
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 11px;
	font-weight: 500;
	line-height: 1.6;
}

.cn-photos-tab__badge-count {
	white-space: nowrap;
}

/* Bottom scrim: hidden at rest, revealed on hover/focus. */
.cn-photos-tab__meta {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	padding: 16px 8px 6px;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0));
	opacity: 0;
	transition: opacity 0.15s ease;
	pointer-events: none;
}

.cn-photos-tab__tile:hover .cn-photos-tab__meta,
.cn-photos-tab__tile:focus-within .cn-photos-tab__meta {
	opacity: 1;
}

.cn-photos-tab__name {
	font-size: 12px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-photos-tab__when {
	font-size: 10px;
	color: rgba(255, 255, 255, 0.85);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
