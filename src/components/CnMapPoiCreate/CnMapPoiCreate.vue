<!--
  CnMapPoiCreate — inline-create dialog for a fresh NC Maps favorite
  (POI) linked to the parent OR object.

  Form fields:
    - Name      (NcTextField, required)
    - Latitude  (NcTextField type=number, required)
    - Longitude (NcTextField type=number, required)
    - Category  (NcTextField, optional)
    - Comment   (NcTextArea, optional)

  Coordinates are entered as plain numbers — this dialog deliberately
  does NOT embed an inline map picker. The only inline map primitive in
  this repo (`CnMapWidget`) is a heavy Leaflet wrapper meant for
  full-page rendering, far too heavy for a sidebar modal. A lightweight
  coordinate form keeps the create flow snappy; a future revision can
  add a map picker once a lightweight static-map primitive lands.

  On submit, emits `create` with `{ name, lat, lng, category, comment }`.
  The parent (CnMapsTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/maps/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnMapPoiCreate/` (NcDialog-based; matches the
  photo/poll/talk/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-map-poi-create"
		@closing="onClose">
		<form class="cn-map-poi-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-map-poi-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Location name')"
				:maxlength="255"
				required />

			<div class="cn-map-poi-create__coords">
				<NcTextField
					v-model="lat"
					type="number"
					:label="t('nextcloud-vue', 'Latitude')"
					:placeholder="t('nextcloud-vue', 'e.g. 52.37403')"
					inputmode="decimal"
					required />
				<NcTextField
					v-model="lng"
					type="number"
					:label="t('nextcloud-vue', 'Longitude')"
					:placeholder="t('nextcloud-vue', 'e.g. 4.88969')"
					inputmode="decimal"
					required />
			</div>

			<NcTextField
				v-model="category"
				:label="t('nextcloud-vue', 'Category (optional)')"
				:maxlength="255" />

			<NcTextArea
				v-model="comment"
				:label="t('nextcloud-vue', 'Comment (optional)')"
				resize="vertical" />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create location') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnMapPoiCreate — inline-create dialog. Emits `create` with the form
 * payload; the parent submits to OR. Coordinates are typed as numbers
 * (no inline map picker — see the file-header note).
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnMapPoiCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new location') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			name: '',
			lat: '',
			lng: '',
			category: '',
			comment: '',
		}
	},

	computed: {
		/**
		 * Whether the form carries a non-empty name and finite
		 * coordinates inside their valid WGS84 ranges.
		 *
		 * @return {boolean} True when submittable.
		 */
		canSubmit() {
			if (this.name.trim() === '') {
				return false
			}
			const lat = Number(this.lat)
			const lng = Number(this.lng)
			return this.lat !== '' && this.lng !== ''
				&& Number.isFinite(lat) && Number.isFinite(lng)
				&& lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
		},
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

		submit() {
			if (!this.canSubmit) {
				this.error = t('nextcloud-vue', 'Enter a name and valid coordinates (lat -90..90, lng -180..180).')
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ name, lat, lng, category, comment }`.
			 */
			this.$emit('create', {
				name: this.name.trim(),
				lat: Number(this.lat),
				lng: Number(this.lng),
				category: this.category.trim() || null,
				comment: this.comment.trim() || null,
			})
		},
	},
}
</script>

<style scoped>
.cn-map-poi-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-map-poi-create__error {
	margin: 4px 0;
}

.cn-map-poi-create__coords {
	display: flex;
	gap: 10px;
}

.cn-map-poi-create__coords > * {
	flex: 1;
	min-width: 0;
}
</style>
