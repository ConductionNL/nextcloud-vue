<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnSearchSelect
		class="cn-party-picker"
		:modelValue="selectedOption"
		:options="options"
		:inputLabel="inputLabel"
		:labelOutside="labelOutside"
		:placeholder="placeholder ? cnTranslate(placeholder) : ''"
		:loading="searching"
		:filterable="false"
		:clearable="clearable"
		:disabled="disabled"
		data-testid="cn-party-picker"
		@search="onSearch"
		@update:modelValue="onPick" />
</template>

<script>
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'

/** How long typing rests before a search runs, in ms. */
const SEARCH_DELAY = 250

/**
 * CnPartyPicker — one search field over several kinds of party: people and
 * organisations from OpenRegister register sets (BRP persons, KvK companies,
 * an app's own clients) and the reader's Nextcloud contacts, as rows with
 * initials, the name and a second line, in one list (board DqNieuweZaak
 * "Aanvrager": "Henk Visser · Inwoner · Beukenlaan 3", "Visser Bouw B.V. ·
 * Organisatie · KvK …"). Built on CnSearchSelect.
 *
 * `sources`: each `{ id, register, schema, label?, title?, secondary?,
 * limit?, icon? }` searches OpenRegister with `_search`; `title` and
 * `secondary` are templates filled from the row (default `{name}` / none),
 * `label` names the kind ("Resident") and starts the second line. A source
 * `{ id, type: "contacts", label? }` searches the reader's Nextcloud contacts.
 *
 * `update:modelValue` emits the chosen row's id (a contact has none and
 * emits its contact id); `select` emits the whole choice: `{ source, id,
 * label, secondary, row }`, so a host can store more than the id (a case's
 * initiator type, source id and display name). A `modelValue` the list does
 * not hold is shown by its `selectedLabel`, else looked up by id in the
 * OpenRegister sources.
 *
 * ```vue
 * <CnPartyPicker
 *   v-model="case.requester"
 *   input-label="Requester"
 *   :sources="[
 *     { id: 'person', register: 'dossiq', schema: 'brpPerson', label: 'Resident', title: '{firstName} {lastName}', secondary: '{residence.street} {residence.houseNumber}' },
 *     { id: 'company', register: 'dossiq', schema: 'kvkCompany', label: 'Organisation', title: '{tradeName}', secondary: 'KvK {sourceId}' },
 *     { id: 'contact', type: 'contacts', label: 'Contact' },
 *   ]"
 *   @select="onRequester" />
 * ```
 */
export default {
	name: 'CnPartyPicker',

	components: { CnSearchSelect },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The chosen party's id. */
		modelValue: {
			type: [String, Number],
			default: null,
		},

		/**
		 * Where to search: OpenRegister sets `{ id, register, schema, label?,
		 * title?, secondary?, limit?, icon? }`, or `{ id, type: "contacts",
		 * label? }` for the reader's Nextcloud contacts.
		 *
		 * @type {Array<object>}
		 */
		sources: {
			type: Array,
			default: () => [],
		},

		/** The field's label. */
		inputLabel: {
			type: String,
			default: '',
		},

		/** Draw the label above the field. */
		labelOutside: {
			type: Boolean,
			default: false,
		},

		/** Placeholder ("Name, BSN, trade name or KvK number"), through the host translate. */
		placeholder: {
			type: String,
			default: '',
		},

		/** The chosen party's name, shown before the list holds it. */
		selectedLabel: {
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
			default: 2,
		},
	},

	emits: ['update:modelValue', 'select'],

	data() {
		return {
			options: [],
			searching: false,
			known: null,
			timer: null,
			searchSeq: 0,
		}
	},

	computed: {
		/**
		 * The option for `modelValue`: in the list, else the known choice,
		 * else one named by `selectedLabel`.
		 *
		 * @spec openspec/changes/party-picker/specs/party-picker/spec.md#requirement-one-search-field-over-several-kinds-of-party
		 * @return {object|null}
		 */
		selectedOption() {
			const value = this.modelValue
			if (value === null || value === undefined || value === '') {
				return null
			}
			const found = this.options.find((o) => String(o.id) === String(value))
			if (found) {
				return found
			}
			if (this.known && String(this.known.id) === String(value)) {
				return this.known
			}
			return { id: value, label: this.selectedLabel || String(value), avatar: true }
		},
	},

	watch: {
		modelValue: {
			immediate: true,
			handler(value) {
				if (value && !this.selectedLabel && !this.options.some((o) => String(o.id) === String(value))) {
					this.lookUp(value)
				}
			},
		},
	},

	beforeUnmount() {
		clearTimeout(this.timer)
	},

	methods: {
		/**
		 * A source's row as a picker option.
		 *
		 * @param {object} source The source.
		 * @param {object} row The row.
		 * @return {object|null} The option, or null without an id.
		 */
		optionOf(source, row) {
			const id = row && (row.id ?? row['@self']?.id ?? row.uuid)
			if (id === undefined || id === null || id === '') {
				return null
			}
			const title = (source.title ? fillTemplate(source.title, row) : (row.name || row.title || row.displayName || '')).trim() || String(id)
			const detail = source.secondary ? fillTemplate(source.secondary, row).trim() : ''
			const kind = source.label ? this.cnTranslate(source.label) : ''
			return {
				id,
				label: title,
				secondary: [kind, detail].filter(Boolean).join(' · '),
				avatar: !source.icon,
				icon: source.icon || '',
				source: source.id,
				row,
			}
		},

		/**
		 * A Nextcloud contact as a picker option.
		 *
		 * @param {object} source The contacts source.
		 * @param {object} contact The contactsmenu entry.
		 * @return {object|null}
		 */
		contactOptionOf(source, contact) {
			const id = contact && (contact.id || contact.uid)
			if (!id) {
				return null
			}
			const mail = Array.isArray(contact.emailAddresses) ? contact.emailAddresses[0] : ''
			const kind = source.label ? this.cnTranslate(source.label) : ''
			return { id, label: contact.fullName || String(id), secondary: [kind, mail].filter(Boolean).join(' · '), avatar: true, source: source.id, row: contact }
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
				this.options = this.selectedOption ? [this.selectedOption] : []
				return
			}
			this.timer = setTimeout(() => this.search(term), SEARCH_DELAY)
		},

		/**
		 * Search every source at once; a source that fails adds nothing.
		 *
		 * @spec openspec/changes/party-picker/specs/party-picker/spec.md#requirement-one-search-field-over-several-kinds-of-party
		 * @param {string} term The search term.
		 * @return {Promise<void>}
		 */
		async search(term) {
			const seq = ++this.searchSeq
			this.searching = true
			const sets = await Promise.all((this.sources || []).map(async (source) => {
				try {
					if (source.type === 'contacts') {
						const { data } = await axios.post(generateUrl('/contactsmenu/contacts'), { filter: term })
						return (data && Array.isArray(data.contacts) ? data.contacts : []).map((c) => this.contactOptionOf(source, c))
					}
					if (!source.register || !source.schema) {
						return []
					}
					const { data } = await axios.get(generateUrl(`/apps/openregister/api/objects/${source.register}/${source.schema}`), { params: { _search: term, _limit: source.limit || 8 } })
					return (data && Array.isArray(data.results) ? data.results : []).map((row) => this.optionOf(source, row))
				} catch {
					return []
				}
			}))
			if (seq !== this.searchSeq) {
				return
			}
			this.options = sets.flat().filter(Boolean)
			this.searching = false
		},

		/**
		 * Name a value the list does not hold: the first OpenRegister source
		 * that has an object with that id.
		 *
		 * @param {string|number} id The id.
		 * @return {Promise<void>}
		 */
		async lookUp(id) {
			for (const source of (this.sources || []).filter((s) => s.register && s.schema && s.type !== 'contacts')) {
				try {
					const { data } = await axios.get(generateUrl(`/apps/openregister/api/objects/${source.register}/${source.schema}/${encodeURIComponent(id)}`))
					const option = data ? this.optionOf(source, data) : null
					if (option && String(this.modelValue) === String(id)) {
						this.known = option
						return
					}
				} catch {
					// Not in this source; try the next.
				}
			}
		},

		/**
		 * Take the picked option: emit its id and the whole choice.
		 *
		 * @param {string|number|null} id The picked id.
		 */
		onPick(id) {
			const option = id === null ? null : this.options.find((o) => String(o.id) === String(id)) || null
			if (option) {
				this.known = option
			}
			/** @event update:modelValue The chosen party's id, or null when cleared. */
			this.$emit('update:modelValue', id)
			/** @event select The whole choice: `{ source, id, label, secondary, row }`, or null when cleared. */
			this.$emit('select', option ? { source: option.source, id: option.id, label: option.label, secondary: option.secondary, row: option.row } : null)
		},
	},
}
</script>
