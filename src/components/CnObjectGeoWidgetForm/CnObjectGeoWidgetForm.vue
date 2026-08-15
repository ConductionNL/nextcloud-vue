<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-geo-form">
		<h4 class="cn-object-geo-form__section">
			{{ t('nextcloud-vue', 'Location map widget') }}
		</h4>

		<NcTextField
			:model-value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Location"
			@update:model-value="updateField('title', $event)" />

		<NcCheckboxRadioSwitch :model-value="editable" @update:model-value="updateField('editable', $event)">
			{{ t('nextcloud-vue', 'Allow editing the location on the map') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-object-geo-form__hint">
			{{ t('nextcloud-vue', 'When enabled, users can click the map to set this object’s location. Turn off for a read-only map.') }}
		</p>

		<NcCheckboxRadioSwitch
			:model-value="addressSearch"
			:disabled="!editable"
			@update:model-value="updateField('addressSearch', $event)">
			{{ t('nextcloud-vue', 'Show an address search box') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-object-geo-form__hint">
			{{ t('nextcloud-vue', 'Look a place up by address and drop the marker there, instead of clicking the map. Only available on an editable map.') }}
		</p>

		<h4 class="cn-object-geo-form__section">
			{{ t('nextcloud-vue', 'Base map') }}
		</h4>

		<NcSelect
			:model-value="selectedBasemapOption"
			:options="basemapOptions"
			:input-label="t('nextcloud-vue', 'Base map')"
			:clearable="false"
			label="label"
			@update:model-value="onBasemapSelect" />

		<NcCheckboxRadioSwitch :model-value="allowBasemapSwitch" @update:model-value="updateField('allowBasemapSwitch', $event)">
			{{ t('nextcloud-vue', 'Let users switch the base map') }}
		</NcCheckboxRadioSwitch>
		<p class="cn-object-geo-form__hint">
			{{ t('nextcloud-vue', 'Each base map loads its tiles from a different server. The app must allow that server in its content-security-policy, or the map stays blank.') }}
		</p>

		<h4 class="cn-object-geo-form__section">
			{{ t('nextcloud-vue', 'Map controls') }}
		</h4>

		<NcCheckboxRadioSwitch :model-value="fitControl" @update:model-value="updateField('fitControl', $event)">
			{{ t('nextcloud-vue', 'Recenter button') }}
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch :model-value="locateControl" @update:model-value="updateField('locateControl', $event)">
			{{ t('nextcloud-vue', 'Locate-me button') }}
		</NcCheckboxRadioSwitch>
		<NcCheckboxRadioSwitch :model-value="fullscreenControl" @update:model-value="updateField('fullscreenControl', $event)">
			{{ t('nextcloud-vue', 'Fullscreen button') }}
		</NcCheckboxRadioSwitch>

		<h4 class="cn-object-geo-form__section">
			{{ t('nextcloud-vue', 'Size and zoom') }}
		</h4>

		<NcTextField
			:model-value="height"
			:label="t('nextcloud-vue', 'Map height')"
			placeholder="360px"
			@update:model-value="updateField('height', $event)" />

		<NcTextField
			:model-value="String(defaultZoom)"
			type="number"
			:label="t('nextcloud-vue', 'Zoom when no location is set')"
			placeholder="7"
			@update:model-value="onZoomInput" />
		<p class="cn-object-geo-form__hint">
			{{ t('nextcloud-vue', 'Zoom ranges from 1 (the whole world) to 19 (street level). Once the object has a location, the map zooms to it.') }}
		</p>
	</div>
</template>

<script>
import { NcTextField, NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	editable: true,
	addressSearch: false,
	basemap: 'standard',
	allowBasemapSwitch: false,
	fitControl: true,
	locateControl: true,
	fullscreenControl: true,
	height: '360px',
	defaultZoom: 7,
})

/** Zoom bounds Leaflet actually supports for the OSM-family tile sets. */
const MIN_ZOOM = 1
const MAX_ZOOM = 19

/**
 * CnObjectGeoWidgetForm — the config sub-form for an `object-geo` widget
 * (`CnObjectGeoWidget`). Edits the title, whether the map is editable, the
 * optional address search, the base map (and whether users may switch it), which
 * map controls are shown, and the map's height / fallback zoom. Emits
 * `update:content` with the assembled blob. Used by `CnAddWidgetModal` and the
 * per-widget cog editor.
 */
export default {
	name: 'CnObjectGeoWidgetForm',

	components: { NcTextField, NcCheckboxRadioSwitch, NcSelect },

	props: {
		/** The placement being edited (pre-fills from `editingWidget.content`), or null. @type {{content: object}|null} */
		editingWidget: { type: Object, default: null },
		/** Initial content values when not editing (registry defaults). @type {object} */
		value: { type: Object, default: () => ({ ...DEFAULT_CONTENT }) },
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			title: initial.title ?? '',
			editable: initial.editable !== false,
			addressSearch: initial.addressSearch === true,
			basemap: initial.basemap ?? DEFAULT_CONTENT.basemap,
			allowBasemapSwitch: initial.allowBasemapSwitch === true,
			fitControl: initial.fitControl !== false,
			locateControl: initial.locateControl !== false,
			fullscreenControl: initial.fullscreenControl !== false,
			height: initial.height ?? DEFAULT_CONTENT.height,
			defaultZoom: initial.defaultZoom ?? DEFAULT_CONTENT.defaultZoom,
		}
	},

	computed: {
		/** The base maps offered by the picker. */
		basemapOptions() {
			return [
				{ id: 'standard', label: t('nextcloud-vue', 'Standard') },
				{ id: 'humanitarian', label: t('nextcloud-vue', 'Humanitarian') },
				{ id: 'terrain', label: t('nextcloud-vue', 'Terrain') },
			]
		},

		/** The picker option matching the stored `basemap` id. */
		selectedBasemapOption() {
			return this.basemapOptions.find((o) => o.id === this.basemap) || this.basemapOptions[0]
		},

		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				title: this.title,
				editable: this.editable,
				addressSearch: this.addressSearch,
				basemap: this.basemap,
				allowBasemapSwitch: this.allowBasemapSwitch,
				fitControl: this.fitControl,
				locateControl: this.locateControl,
				fullscreenControl: this.fullscreenControl,
				height: this.height,
				defaultZoom: this.defaultZoom,
			}
		},
	},

	methods: {
		t,
		/**
		 * Set a field and emit the assembled content.
		 *
		 * @param {string} field The field name.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Store the picked base map by id (NcSelect hands back the whole option).
		 *
		 * @param {{id: string}|null} option The chosen option.
		 * @return {void}
		 */
		onBasemapSelect(option) {
			if (!option || !option.id) return
			this.updateField('basemap', option.id)
		},

		/**
		 * Coerce the zoom field to a number and clamp it to what the tile sets
		 * actually serve — NcTextField hands back a string, and an out-of-range zoom
		 * renders a blank map.
		 *
		 * @param {string} value The raw input value.
		 * @return {void}
		 */
		onZoomInput(value) {
			const parsed = Number.parseInt(value, 10)
			if (!Number.isFinite(parsed)) return
			this.updateField('defaultZoom', Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed)))
		},

		/**
		 * Validate the form; an empty array means valid. The geo widget inherits
		 * its object from the page, so no field is required.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			return []
		},
	},
}
</script>

<style scoped>
.cn-object-geo-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-object-geo-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-object-geo-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 0;
}
</style>
