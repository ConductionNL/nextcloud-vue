<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-address-search" data-testid="cn-address-search">
		<CnSearchSelect
			v-if="!manualShown"
			:modelValue="selectedOption ? selectedOption.id : null"
			:options="shownOptions"
			:inputLabel="inputLabel || t('nextcloud-vue', 'Search an address')"
			:labelOutside="labelOutside"
			:placeholder="placeholder || t('nextcloud-vue', 'Street, postcode or place')"
			:loading="searching"
			:filterable="false"
			:clearable="clearable"
			:disabled="disabled"
			@search="onSearch"
			@update:modelValue="onPick" />
		<p v-if="unavailable && !manualFallback"
			class="cn-address-search__note"
			role="status"
			data-testid="cn-address-search-unavailable">
			{{ t('nextcloud-vue', 'Address search is not available right now.') }}
		</p>
		<template v-if="manualShown">
			<CnNoticeWidget
				v-if="unavailable"
				:inline="true"
				:content="unavailableNotice"
				data-testid="cn-address-search-unavailable" />
			<div class="cn-address-search__manual" data-testid="cn-address-search-manual">
				<NcTextField
					:modelValue="typed.street"
					:label="manualLabel('street', t('nextcloud-vue', 'Street and house number'))"
					:labelOutside="true"
					:disabled="disabled"
					data-testid="cn-address-search-street"
					@update:modelValue="setManual('street', $event)" />
				<NcTextField
					:modelValue="typed.postcode"
					:label="manualLabel('postcode', t('nextcloud-vue', 'Postcode'))"
					:labelOutside="true"
					:disabled="disabled"
					data-testid="cn-address-search-postcode"
					@update:modelValue="setManual('postcode', $event)" />
				<NcTextField
					v-if="manualCity"
					class="cn-address-search__city"
					:modelValue="typed.city"
					:label="manualLabel('city', t('nextcloud-vue', 'Place'))"
					:labelOutside="true"
					:disabled="disabled"
					data-testid="cn-address-search-city"
					@update:modelValue="setManual('city', $event)" />
			</div>
		</template>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcTextField } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { stripTrailingSlashes } from '../../utils/trailingSlashes.js'
import { CnNoticeWidget } from '../CnNoticeWidget/index.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'

/** How long typing rests before a search runs, in ms. */
const SEARCH_DELAY = 250

/** The id the current value carries in the option list. */
const CURRENT_ID = '__cn-address-current'

/**
 * WGS84 coordinates from a Locatieserver document: a normalised
 * `location.coordinates` (`[lng, lat]`) or a raw `centroide_ll` WKT point.
 *
 * @param {object|null} doc The document.
 * @return {{lat: number, lng: number}|null} The coordinates, or null.
 */
export function addressCoordinates(doc) {
	if (!doc) {
		return null
	}
	if (Array.isArray(doc.location?.coordinates)) {
		const [lng, lat] = doc.location.coordinates
		return { lat, lng }
	}
	const match = typeof doc.centroide_ll === 'string' ? doc.centroide_ll.match(/POINT\(([^ ]+) ([^ ]+)\)/) : null
	return match ? { lng: parseFloat(match[1]), lat: parseFloat(match[2]) } : null
}

/**
 * A Locatieserver document's display text.
 *
 * @param {object|null} doc The document.
 * @return {string} The address text.
 */
export function addressText(doc) {
	return doc ? doc.displayName || doc.weergavenaam || doc.display || '' : ''
}

/**
 * CnAddressSearch — an address field over the PDOK Locatieserver (BAG
 * addresses, streets, places and postcodes): suggestions as the user types,
 * a free-text search when nothing is suggested, and on a pick the full
 * document with its coordinates. Built on CnSearchSelect.
 *
 * Browsers never call api.pdok.nl directly (ADR-022): requests go to a
 * PDOK proxy with `suggest`, `free` and `lookup/{id}` routes. By default
 * that is the `/api/pdok` route of the first installed app among
 * `appCandidates` (integriq, then openconnector); `endpoint` names another
 * base URL. When the proxy answers 404 or 503 the field says address search
 * is unavailable and stays usable, so a form around it can still be saved.
 *
 * `select` emits `{ result, coordinates, address }`: the looked-up document,
 * `{ lat, lng }` or null, and the display text. `update:modelValue` emits
 * the display text, or null when cleared.
 *
 * With `manualFallback`, an unavailable search turns into a warning notice
 * (`unavailableTitle`, `unavailableText`) and fields to type the address in
 * (street and house number, postcode, and the place with `manualCity`), as
 * DqZaakLocatie draws when PDOK does not answer. Typing emits
 * `update:modelValue` with the joined text and `select` with
 * `{ result: null, coordinates: null, address, manual: { street, postcode, city } }`.
 * `manual` opens those fields without waiting for a failure.
 *
 * ```vue
 * <CnAddressSearch v-model="caseObject.address" @select="onAddress" />
 * ```
 */
export default {
	name: 'CnAddressSearch',

	components: { CnNoticeWidget, CnSearchSelect, NcTextField },

	props: {
		/** The chosen address text. */
		modelValue: {
			type: String,
			default: null,
		},

		/** Base URL of the PDOK proxy; empty resolves it from `appCandidates`. */
		endpoint: {
			type: String,
			default: '',
		},

		/** App ids that serve `/api/pdok`, newest first; the first installed one wins. */
		appCandidates: {
			type: Array,
			default: () => ['integriq', 'openconnector'],
		},

		/** The field's label; defaults to "Search an address". */
		inputLabel: {
			type: String,
			default: '',
		},

		/** Draw the label above the field. */
		labelOutside: {
			type: Boolean,
			default: false,
		},

		/** Placeholder; defaults to "Street, postcode or place". */
		placeholder: {
			type: String,
			default: '',
		},

		/** Offer a clear button. */
		clearable: {
			type: Boolean,
			default: true,
		},

		/** Disable the field. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** The fewest characters a search needs. */
		minLength: {
			type: Number,
			default: 3,
		},

		/** The most results a free-text search returns. */
		rows: {
			type: Number,
			default: 10,
		},

		/** When the search is unavailable, offer fields to type the address in. */
		manualFallback: {
			type: Boolean,
			default: false,
		},

		/** Show the typed-address fields from the start. */
		manual: {
			type: Boolean,
			default: false,
		},

		/** Ask for the place as well as street and postcode. */
		manualCity: {
			type: Boolean,
			default: false,
		},

		/** Labels of the typed-address fields: `{ street?, postcode?, city? }`. */
		manualLabels: {
			type: Object,
			default: () => ({}),
		},

		/** The notice title when search is unavailable. Default "Address search is not available right now". */
		unavailableTitle: {
			type: String,
			default: '',
		},

		/** The notice text when search is unavailable. Default "Type the address yourself." */
		unavailableText: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue', 'select'],

	data() {
		return {
			options: [],
			searching: false,
			unavailable: false,
			timer: null,
			searchSeq: 0,
			typed: { street: '', postcode: '', city: '' },
		}
	},

	computed: {
		/**
		 * Whether the typed-address fields show: asked for, or the search is
		 * unavailable and the fallback is on.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/address-search-manual-fallback/specs/address-search/spec.md#requirement-an-unavailable-address-search-falls-back-to-typed-fields
		 */
		manualShown() {
			return this.manual || (this.manualFallback && this.unavailable)
		},

		/**
		 * @return {object} The stacked warning notice above the typed fields.
		 * @spec openspec/changes/address-search-manual-fallback/specs/address-search/spec.md#requirement-an-unavailable-address-search-falls-back-to-typed-fields
		 */
		unavailableNotice() {
			return {
				variant: 'warning',
				layout: 'stacked',
				title: this.unavailableTitle || t('nextcloud-vue', 'Address search is not available right now'),
				text: this.unavailableText || t('nextcloud-vue', 'Type the address yourself.'),
			}
		},

		/**
		 * The current value as an option, so the field shows it.
		 *
		 * @return {object|null}
		 */
		selectedOption() {
			return this.modelValue ? { id: CURRENT_ID, label: this.modelValue, icon: 'MapMarkerOutline' } : null
		},

		/**
		 * The suggestions, with the current value kept in the list.
		 *
		 * @return {Array<object>}
		 */
		shownOptions() {
			return this.selectedOption ? [this.selectedOption, ...this.options] : this.options
		},

		/**
		 * The proxy's base URL.
		 *
		 * @spec openspec/changes/address-search/specs/address-search/spec.md#requirement-an-address-field-over-the-pdok-locatieserver
		 * @return {string}
		 */
		baseUrl() {
			if (this.endpoint) {
				return stripTrailingSlashes(this.endpoint)
			}
			const roots = (typeof window !== 'undefined' && window.OC && window.OC.appswebroots) || {}
			const app = this.appCandidates.find((id) => Object.hasOwn(roots, id)) || this.appCandidates[0] || 'integriq'
			return generateUrl(`/apps/${app}/api/pdok`)
		},
	},

	beforeUnmount() {
		clearTimeout(this.timer)
	},

	methods: {
		t,

		/**
		 * @param {string} key `street`, `postcode` or `city`.
		 * @param {string} fallback The default label.
		 * @return {string} The label.
		 * @spec openspec/changes/address-search-manual-fallback/specs/address-search/spec.md#requirement-an-unavailable-address-search-falls-back-to-typed-fields
		 */
		manualLabel(key, fallback) {
			const label = this.manualLabels && this.manualLabels[key]
			return typeof label === 'string' && label !== '' ? label : fallback
		},

		/**
		 * Keep a typed part and emit the address it makes.
		 *
		 * @param {string} key `street`, `postcode` or `city`.
		 * @param {string} value The typed text.
		 * @spec openspec/changes/address-search-manual-fallback/specs/address-search/spec.md#requirement-an-unavailable-address-search-falls-back-to-typed-fields
		 */
		setManual(key, value) {
			this.typed = { ...this.typed, [key]: String(value ?? '') }
			const { street, postcode, city } = this.typed
			const address = [street.trim(), [postcode.trim(), city.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ')
			this.$emit('update:modelValue', address || null)
			this.$emit('select', { result: null, coordinates: null, address, manual: { ...this.typed } })
		},

		/**
		 * A document as a picker option.
		 *
		 * @param {object} doc The Locatieserver document.
		 * @param {number} index Its place in the list, for documents without an id.
		 * @return {object|null} The option, or null without a text.
		 */
		optionOf(doc, index) {
			const label = addressText(doc)
			if (!label) {
				return null
			}
			const kinds = {
				adres: t('nextcloud-vue', 'Address'),
				address: t('nextcloud-vue', 'Address'),
				weg: t('nextcloud-vue', 'Street'),
				woonplaats: t('nextcloud-vue', 'Place'),
				city: t('nextcloud-vue', 'Place'),
				postcode: t('nextcloud-vue', 'Postcode'),
			}
			const municipality = doc.gemeentenaam && !label.includes(doc.gemeentenaam) ? doc.gemeentenaam : ''
			return {
				id: doc.id || `${CURRENT_ID}-${index}`,
				label,
				secondary: [kinds[doc.type] || '', municipality].filter(Boolean).join(' · '),
				icon: 'MapMarkerOutline',
				doc,
			}
		},

		/**
		 * Call the proxy; 404 or 503 marks search unavailable and yields `fallback`.
		 *
		 * @param {string} path The route under the base URL.
		 * @param {object} params The query parameters.
		 * @param {Array<object>} fallback What a degraded answer yields.
		 * @return {Promise<Array<object>>} The documents.
		 */
		async request(path, params, fallback) {
			try {
				const { data } = await axios.get(prefixUrl(`${this.baseUrl}/${path}`), { params })
				this.unavailable = false
				return Array.isArray(data?.docs) ? data.docs : fallback
			} catch (error) {
				const status = error?.response?.status
				if (status === 404 || status === 503) {
					this.unavailable = true
				}
				return fallback
			}
		},

		/**
		 * Search after typing rests.
		 *
		 * @param {string} query The typed text.
		 */
		onSearch(query) {
			clearTimeout(this.timer)
			const term = String(query || '').trim()
			if (term.length < this.minLength) {
				this.options = []
				return
			}
			this.timer = setTimeout(() => this.search(term), SEARCH_DELAY)
		},

		/**
		 * Suggest addresses for the term; without suggestions, search free text.
		 *
		 * @spec openspec/changes/address-search/specs/address-search/spec.md#requirement-an-address-field-over-the-pdok-locatieserver
		 * @param {string} term The search term.
		 * @return {Promise<void>}
		 */
		async search(term) {
			const seq = ++this.searchSeq
			this.searching = true
			let docs = await this.request('suggest', { q: term }, [])
			if (!docs.length && !this.unavailable && seq === this.searchSeq) {
				docs = await this.request('free', { q: term, rows: this.rows }, [])
			}
			if (seq !== this.searchSeq) {
				return
			}
			this.options = docs.map((doc, index) => this.optionOf(doc, index)).filter(Boolean)
			this.searching = false
		},

		/**
		 * Take the picked suggestion: look up the full document, then emit it.
		 *
		 * @spec openspec/changes/address-search/specs/address-search/spec.md#requirement-an-address-field-over-the-pdok-locatieserver
		 * @param {string|null} id The picked option's id.
		 * @return {Promise<void>}
		 */
		async onPick(id) {
			if (id === CURRENT_ID) {
				return
			}
			const option = id === null ? null : this.options.find((o) => String(o.id) === String(id))
			if (!option) {
				/** @event update:modelValue The chosen address text, or null when cleared. */
				this.$emit('update:modelValue', null)
				/** @event select `{ result, coordinates, address }` for the chosen address, or null when cleared. */
				this.$emit('select', null)
				return
			}
			let result = option.doc
			if (option.doc.id) {
				const [full] = await this.request(`lookup/${encodeURIComponent(option.doc.id)}`, {}, [])
				result = full || option.doc
			}
			const address = addressText(result) || option.label
			this.options = []
			this.$emit('update:modelValue', address)
			this.$emit('select', { result, coordinates: addressCoordinates(result), address })
		},
	},
}
</script>

<style scoped>
.cn-address-search {
	width: 100%;
}

.cn-address-search__manual {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 120px;
	gap: 12px;
	margin-top: 12px;
}

.cn-address-search__city {
	grid-column: 1 / -1;
}

.cn-address-search__note {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}
</style>
