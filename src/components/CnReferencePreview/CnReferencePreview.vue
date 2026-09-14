<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnReferencePreview: a reference that shows what it points at.

  Wrap a link to another record and it gains a summary card on focus and on
  hover, so a handler reading a case note can see what the case it mentions
  actually is without leaving the page they are working in. OpenProject calls
  these hover cards; the observation behind them is that following a
  reference to read two fields and coming back is the expensive part.

  Four things it is careful about, and each is a way this pattern goes wrong:

  - **Focus, not only hover.** A card that opens on hover alone does not
    exist for a keyboard or a touch screen. This opens on both, closes on
    escape and on blur, and never traps focus.
  - **Once per record, per page.** Forty references to twelve records make at
    most twelve requests, because the in-flight promise is shared rather than
    the settled value. A mouse sweep starts all forty before any answers.
  - **A reference you may not read stays a plain reference.** No preview, and
    no request. A preview that loads and then shows an error would itself
    disclose that the record exists.
  - **A glance, not a page.** Only the fields the caller names, in the order
    they name them.
-->
<template>
	<span class="cn-reference-preview">
		<NcPopover
			v-if="previewable"
			v-model:shown="open"
			:triggers="[]"
			popupRole="dialog"
			popoverBaseClass="cn-reference-preview__popper">
			<template #trigger>
				<component
					:is="href ? 'a' : 'button'"
					:href="href || undefined"
					:type="href ? undefined : 'button'"
					class="cn-reference-preview__trigger"
					:aria-expanded="open ? 'true' : 'false'"
					:aria-describedby="open ? cardId : undefined"
					data-testid="cn-reference-preview-trigger"
					@click="$emit('open-record', recordId)"
					@focus="onShow"
					@blur="onHide"
					@mouseenter="onShow"
					@mouseleave="onHide"
					@keydown.esc="onEscape">
					<!-- @slot default The reference itself. Defaults to the `label` prop. -->
					<slot>{{ label }}</slot>
				</component>
			</template>

			<div
				:id="cardId"
				class="cn-reference-preview__card"
				role="dialog"
				:aria-label="cardLabel"
				data-testid="cn-reference-preview-card"
				@mouseenter="onShow"
				@mouseleave="onHide"
				@keydown.esc="onEscape">
				<NcLoadingIcon v-if="loading" :size="20" :name="loadingLabel" />
				<template v-else-if="record">
					<p class="cn-reference-preview__card-title">
						{{ cardTitle }}
					</p>
					<!-- @slot card The summary body. Receives the loaded record. -->
					<!-- @binding {object} record The referenced record. -->
					<!-- @binding {Array<{key: string, label: string, value: string}>} lines The summary lines built from `summaryFields`. -->
					<slot name="card" :record="record" :lines="lines">
						<dl v-if="lines.length > 0" class="cn-reference-preview__lines">
							<template v-for="line in lines" :key="line.key">
								<dt>{{ line.label }}</dt>
								<dd>{{ line.value }}</dd>
							</template>
						</dl>
					</slot>
				</template>
				<p v-else class="cn-reference-preview__card-empty">
					{{ unreadableLabel }}
				</p>
			</div>
		</NcPopover>

		<!-- A reference this reader may not read renders exactly as it reads:
		     plainly, with no card and no request. -->
		<component
			:is="href ? 'a' : 'span'"
			v-else
			:href="href || undefined"
			class="cn-reference-preview__plain"
			data-testid="cn-reference-preview-plain">
			<slot>{{ label }}</slot>
		</component>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcPopover } from '@nextcloud/vue'
import { fetchReferenceOnce, peekReference, referenceKey, summaryLines } from './referenceCache.js'

export default {
	name: 'CnReferencePreview',

	components: {
		NcLoadingIcon,
		NcPopover,
	},

	props: {
		/**
		 * The referenced record's id.
		 *
		 * @type {string}
		 */
		recordId: {
			type: String,
			default: '',
		},

		/**
		 * What the reference reads as when no default slot is given.
		 *
		 * @type {string}
		 */
		label: {
			type: String,
			default: '',
		},

		/**
		 * The register the referenced record lives in. Part of the cache key,
		 * because an id is only unique within a register and a schema.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * The schema the referenced record belongs to.
		 *
		 * @type {string}
		 */
		schema: {
			type: String,
			default: '',
		},

		/**
		 * Whether this reader may read the referenced record. False renders a
		 * plain reference with no card and no request, which is deliberately
		 * not "show a card that then errors": an error card discloses that the
		 * record exists.
		 *
		 * @type {boolean}
		 */
		readable: {
			type: Boolean,
			default: true,
		},

		/**
		 * Loads the referenced record. Receives `{ recordId, register, schema }`
		 * and returns the record, or null when there is none. Without one, and
		 * without an `objectStore`, the reference renders plainly.
		 *
		 * @type {(ref: {recordId: string, register: string, schema: string}) => Promise<object|null>}
		 */
		fetchRecord: {
			type: Function,
			default: null,
		},

		/**
		 * An object store to load through when no `fetchRecord` is given.
		 *
		 * @type {object}
		 */
		objectStore: {
			type: Object,
			default: null,
		},

		/**
		 * The fields the card shows, in the order it shows them. A string is
		 * the key and the label; an object may give a different label. Dotted
		 * paths read into nested values.
		 *
		 * @type {Array<string|{key: string, label?: string}>}
		 */
		summaryFields: {
			type: Array,
			default: () => ['title', 'status'],
		},

		/**
		 * Field the card's heading is read from.
		 *
		 * @type {string}
		 */
		titleField: {
			type: String,
			default: 'title',
		},

		/**
		 * Link the reference itself points at. With one the trigger is an
		 * anchor, so the reference stays a link a reader can open in a new
		 * tab; without one it is a button that emits `open-record`.
		 *
		 * @type {string}
		 */
		href: {
			type: String,
			default: '',
		},

		/**
		 * Milliseconds to wait before opening on hover, so a pointer crossing
		 * a reference on its way somewhere else does not open a card.
		 *
		 * @type {number}
		 */
		openDelay: {
			type: Number,
			default: 250,
		},

		/**
		 * Milliseconds to wait before closing, so the pointer can travel from
		 * the reference onto the card without it vanishing underneath.
		 *
		 * @type {number}
		 */
		closeDelay: {
			type: Number,
			default: 150,
		},
	},

	emits: [
		/**
		 * @event open-record The reference itself was activated. Payload is the record id. Emitted only when no `href` was given.
		 */
		'open-record',
		/**
		 * @event loaded The referenced record was loaded. Payload is the record, or null when it could not be read.
		 */
		'loaded',
	],

	data() {
		return {
			open: false,
			loading: false,
			record: peekReference(referenceKey(this.register, this.schema, this.recordId)) ?? null,
			openTimer: null,
			closeTimer: null,
		}
	},

	computed: {
		/**
		 * Whether this reference offers a preview at all.
		 *
		 * @return {boolean} False for an unreadable reference, or one with no way to load anything.
		 */
		previewable() {
			return this.readable === true
				&& this.recordId !== ''
				&& (typeof this.fetchRecord === 'function' || this.objectStore !== null)
		},

		/**
		 * Stable id joining the trigger's `aria-describedby` to the card.
		 *
		 * @return {string} The element id.
		 */
		cardId() {
			return `cn-reference-preview-${String(this.recordId).replace(/[^A-Za-z0-9_-]/g, '-')}`
		},

		/**
		 * The card's heading.
		 *
		 * @return {string} The record's title, falling back to the reference's own label.
		 */
		cardTitle() {
			const title = this.record?.[this.titleField]
			return typeof title === 'string' && title !== '' ? title : this.label
		},

		/**
		 * The card's accessible name, which says what the card IS rather than
		 * repeating its heading. A screen reader reaching it otherwise hears
		 * the record's name twice and is told nothing about where it is.
		 *
		 * @return {string} The accessible name.
		 */
		cardLabel() {
			return `${t('nextcloud-vue', 'Summary of')} ${this.cardTitle}`
		},

		/**
		 * The summary lines the card renders.
		 *
		 * @return {Array<{key: string, label: string, value: string}>} The lines.
		 */
		lines() {
			return summaryLines(this.record, this.summaryFields)
		},

		/**
		 * What the card says while it is loading.
		 *
		 * @return {string} The label.
		 */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading the summary')
		},

		/**
		 * What the card says when the record could not be read.
		 *
		 * @return {string} The label.
		 */
		unreadableLabel() {
			return t('nextcloud-vue', 'This reference has no summary.')
		},
	},

	beforeUnmount() {
		clearTimeout(this.openTimer)
		clearTimeout(this.closeTimer)
	},

	methods: {
		/**
		 * Open the card, after the hover delay, and load the record once.
		 */
		onShow() {
			if (!this.previewable) {
				return
			}
			clearTimeout(this.closeTimer)
			clearTimeout(this.openTimer)
			this.openTimer = setTimeout(() => {
				this.open = true
				this.load()
			}, this.openDelay)
		},

		/**
		 * Close the card, after the leave delay so the pointer can travel
		 * from the reference onto the card.
		 */
		onHide() {
			clearTimeout(this.openTimer)
			clearTimeout(this.closeTimer)
			this.closeTimer = setTimeout(() => {
				this.open = false
			}, this.closeDelay)
		},

		/**
		 * Escape closes the card at once, and focus stays where it was. The
		 * card never took focus, so there is nothing to give back.
		 */
		onEscape() {
			clearTimeout(this.openTimer)
			clearTimeout(this.closeTimer)
			this.open = false
		},

		/**
		 * Load the referenced record, at most once per page.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (this.record || !this.previewable) {
				return
			}
			const key = referenceKey(this.register, this.schema, this.recordId)
			this.loading = true
			try {
				this.record = await fetchReferenceOnce(key, () => this.loadRecord())
				/**
				 * @event loaded The referenced record was loaded.
				 * @type {object|null}
				 */
				this.$emit('loaded', this.record)
			} finally {
				this.loading = false
			}
		},

		/**
		 * The caller's loader, or the object store.
		 *
		 * @return {Promise<object|null>} The record.
		 */
		loadRecord() {
			if (typeof this.fetchRecord === 'function') {
				return this.fetchRecord({ recordId: this.recordId, register: this.register, schema: this.schema })
			}
			return this.objectStore.fetchObject(this.schema, this.recordId)
		},
	},
}
</script>
