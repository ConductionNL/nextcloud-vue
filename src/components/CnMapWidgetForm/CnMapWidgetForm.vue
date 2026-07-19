<!--
  CnMapWidgetForm — configuration form for the `map` dashboard widget.

  Picks an OpenRegister register/schema and plots its objects on a Leaflet map,
  reading each object's location from `@self.geo` (what CnObjectGeoWidget writes).
  Everything else — centre, zoom, height, popup field, clustering — is presentation.

  Used by both `CnAddWidgetModal` and the cog `CnWidgetStyleEditorModal`.
-->
<template>
	<div class="cn-map-widget-form">
		<CnRegisterSchemaSelect
			:register="source.register"
			:schema="source.schema"
			@update:register="updateSource('register', $event)"
			@update:schema="updateSource('schema', $event)" />

		<CnFieldPicker
			v-if="source.register && source.schema"
			:value="popupField"
			:register="source.register"
			:schema="source.schema"
			:label="t('nextcloud-vue', 'Popup field')"
			@input="popupField = $event" />

		<p v-if="source.register && source.schema" class="cn-map-widget-form__hint">
			{{ t('nextcloud-vue', 'Objects are plotted from their location (@self.geo). Objects without one are skipped.') }}
		</p>

		<div class="cn-map-widget-form__row">
			<NcTextField
				:model-value="String(zoom)"
				type="number"
				:label="t('nextcloud-vue', 'Zoom')"
				:label-visible="true"
				@update:model-value="onZoom" />

			<NcTextField
				:model-value="height"
				:label="t('nextcloud-vue', 'Height')"
				:label-visible="true"
				placeholder="400px"
				@update:model-value="height = $event" />
		</div>

		<div class="cn-map-widget-form__row">
			<NcTextField
				:model-value="String(center[0])"
				type="number"
				:label="t('nextcloud-vue', 'Centre latitude')"
				:label-visible="true"
				@update:model-value="onCentre(0, $event)" />

			<NcTextField
				:model-value="String(center[1])"
				type="number"
				:label="t('nextcloud-vue', 'Centre longitude')"
				:label-visible="true"
				@update:model-value="onCentre(1, $event)" />
		</div>

		<NcCheckboxRadioSwitch :checked.sync="autoFit" type="switch">
			{{ t('nextcloud-vue', 'Zoom to fit the plotted objects') }}
		</NcCheckboxRadioSwitch>

		<NcCheckboxRadioSwitch :checked.sync="clustering" type="switch">
			{{ t('nextcloud-vue', 'Group nearby objects into clusters') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import { NcTextField, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'

// The Netherlands, roughly — a sane default centre for a Dutch-government library.
// autoFit is on by default, so this only shows before any object is plotted.
const DEFAULT_CENTRE = [52.13, 5.29]

// Without a basemap the widget renders a grey box: CnMapWidget's `basemaps` prop is
// opt-in and empty by default. The Nextcloud CSP already allows *.tile.openstreetmap.org.
const DEFAULT_BASEMAPS = [
	{
		name: 'OpenStreetMap',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '© OpenStreetMap contributors',
		options: { maxZoom: 19 },
	},
]

const DEFAULT_CONTENT = {
	register: '',
	schema: '',
	center: DEFAULT_CENTRE,
	zoom: 7,
	height: '400px',
	popupField: '',
	clustering: false,
	autoFit: true,
	basemaps: DEFAULT_BASEMAPS,
}

/**
 * CnMapWidgetForm — configures the `map` dashboard widget.
 *
 * Emits `update:content` with the assembled content blob on every change.
 * `validate()` requires a register + schema: a map with no data source would render
 * an empty basemap, which looks broken rather than empty.
 *
 * @slot default No slots — the form is fully declarative.
 */
export default {
	name: 'CnMapWidgetForm',

	components: { NcTextField, NcCheckboxRadioSwitch, CnRegisterSchemaSelect, CnFieldPicker },

	props: {
		/**
		 * The placement being edited (pre-fills every control from
		 * `editingWidget.content`), or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const centre = Array.isArray(initial.center) && initial.center.length === 2
			? initial.center
			: DEFAULT_CENTRE
		return {
			source: {
				register: initial.register ?? '',
				schema: initial.schema ?? '',
			},
			center: [Number(centre[0]), Number(centre[1])],
			zoom: Number.isFinite(initial.zoom) ? initial.zoom : 7,
			height: initial.height || '400px',
			popupField: initial.popupField ?? '',
			clustering: initial.clustering === true,
			autoFit: initial.autoFit !== false,
			// Preserved verbatim: the form does not expose a basemap picker, and dropping
			// it on save would turn the user's map into a grey box.
			basemaps: Array.isArray(initial.basemaps) && initial.basemaps.length
				? initial.basemaps
				: DEFAULT_BASEMAPS,
		}
	},

	computed: {
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				register: this.source.register,
				schema: this.source.schema,
				center: this.center,
				zoom: this.zoom,
				height: this.height,
				popupField: this.popupField,
				clustering: this.clustering,
				autoFit: this.autoFit,
				basemaps: this.basemaps,
				// CnMapWidget reads its markers from here; `dataSource.{register, schema}`
				// is the shape its resolver understands.
				markers: {
					dataSource: { register: this.source.register, schema: this.source.schema },
					popupField: this.popupField,
					clustering: this.clustering,
				},
			}
		},
	},

	watch: {
		assembledContent: {
			handler(content) {
				this.$emit('update:content', content)
			},
			deep: true,
			immediate: true,
		},
	},

	methods: {
		t,

		/**
		 * Update one half of the data source. Changing the register invalidates the
		 * schema and the popup field, which belonged to the old schema.
		 *
		 * @param {'register'|'schema'} key Which half changed.
		 * @param {string} value The new value.
		 */
		updateSource(key, value) {
			this.source[key] = value
			if (key === 'register') {
				this.source.schema = ''
				this.popupField = ''
			}
		},

		/**
		 * Zoom is a number; an empty or non-numeric field must not become NaN.
		 *
		 * @param {string} value The raw input value.
		 */
		onZoom(value) {
			const n = Number(value)
			this.zoom = Number.isFinite(n) ? n : 7
		},

		/**
		 * Update one coordinate of the centre, ignoring non-numeric input.
		 *
		 * @param {number} index 0 for latitude, 1 for longitude.
		 * @param {string} value The raw input value.
		 */
		onCentre(index, value) {
			const n = Number(value)
			if (!Number.isFinite(n)) return
			this.center[index] = n
		},

		/**
		 * A map with no data source renders an empty basemap, which reads as broken
		 * rather than empty — so require one.
		 *
		 * @return {boolean} Whether the form is valid.
		 */
		validate() {
			return Boolean(this.source.register && this.source.schema)
		},
	},
}
</script>

<style scoped>
.cn-map-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-map-widget-form__row {
	display: flex;
	gap: 8px;
}

.cn-map-widget-form__row > * {
	flex: 1;
	min-width: 0;
}

.cn-map-widget-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 90%;
	margin: 0;
}
</style>
