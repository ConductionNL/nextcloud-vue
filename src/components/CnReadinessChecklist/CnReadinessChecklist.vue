<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-readiness-checklist" data-testid="cn-readiness-checklist">
		<p v-if="description" class="cn-readiness-checklist__description">
			{{ description }}
		</p>

		<NcLoadingIcon v-if="loading" :size="32" :name="t('nextcloud-vue', 'Loading')" />

		<NcNoteCard v-else-if="loadError" type="error" data-testid="cn-readiness-checklist-error">
			{{ loadError }}
		</NcNoteCard>

		<template v-else>
			<NcNoteCard v-if="blockingText && blockingItems.length > 0"
				type="error"
				data-testid="cn-readiness-checklist-blocking">
				{{ blockingText }} {{ blockingItems.map((item) => item.label).join(', ') }}
			</NcNoteCard>

			<p v-if="shownItems.length === 0" class="cn-readiness-checklist__empty" data-testid="cn-readiness-checklist-empty">
				{{ emptyText || t('nextcloud-vue', 'Nothing to check.') }}
			</p>

			<section v-for="group in shownGroups"
				:key="group.id"
				class="cn-readiness-checklist__group"
				:data-testid="`cn-readiness-checklist-group-${group.id}`">
				<component :is="innerHeadingTag" v-if="group.title" class="cn-readiness-checklist__group-title cn-inner-heading">
					{{ group.title }}
				</component>
				<ul class="cn-readiness-checklist__list">
					<li v-for="item in group.items"
						:key="item.id"
						class="cn-readiness-checklist__item"
						:data-testid="`cn-readiness-item-${item.id}`">
						<!-- The state is a word, not a colour (WCAG 1.4.1); the
						     colour repeats it. -->
						<span class="cn-readiness-checklist__state"
							:class="`cn-readiness-checklist__state--${stateOf(item)}`"
							data-testid="cn-readiness-item-state">
							{{ stateLabel(item) }}
						</span>
						<span class="cn-readiness-checklist__body">
							<a v-if="item.fixHref"
								:href="item.fixHref"
								class="cn-readiness-checklist__label"
								data-testid="cn-readiness-item-fix">{{ item.label }}</a>
							<span v-else class="cn-readiness-checklist__label">{{ item.label }}</span>
							<span v-if="item.explanation" class="cn-readiness-checklist__explanation">{{ item.explanation }}</span>
							<span v-if="item.failure" class="cn-readiness-checklist__failure">
								{{ t('nextcloud-vue', 'This could not be read: {reason}', { reason: item.failure }) }}
							</span>
						</span>
					</li>
				</ul>
			</section>
		</template>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import innerHeading from '../../mixins/innerHeading.js'
import { readPath } from '../../utils/readPath.js'

/**
 * The fields an item is read from by default.
 *
 * @type {Readonly<Record<string, string>>}
 */
const DEFAULT_FIELDS = Object.freeze({
	id: 'id',
	label: 'label',
	explanation: 'explanation',
	met: 'met',
	fixHref: 'fixHref',
	failure: 'failure',
	group: 'group',
	blocking: 'blocking',
})

/**
 * CnReadinessChecklist: a list of things an instance needs, each with its
 * state in words (met, open, unknown), an explanation and a link to the
 * screen that fixes it. Reported, never gated: nothing here blocks the app.
 *
 * Items come from `items`, or are read from an app endpoint (`source`, an app
 * path resolved with `generateUrl`, the list at `itemsPath`) and re-read when
 * the reader comes back to the tab. `fields` maps an item's keys onto the
 * row's (`{ label: 'title', met: 'done', fixHref: 'screen' }`). Items carrying
 * a `group` render under that group's heading (`groups`, in order).
 *
 * @spec openspec/changes/readiness-checklist/specs/readiness-checklist/spec.md
 */
export default {
	name: 'CnReadinessChecklist',

	components: { NcLoadingIcon, NcNoteCard },

	mixins: [innerHeading],

	inject: {
		/** The host app's translate, for texts the page declares. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The items: `{ id, label, explanation?, met (true|false|null), fixHref?, failure?, group?, blocking? }`. */
		items: { type: Array, default: () => [] },
		/** An app path to read the items from (`/apps/<app>/api/setup/status`). */
		source: { type: String, default: '' },
		/** Where the items sit in the answer. */
		itemsPath: { type: String, default: 'items' },
		/** Item key to row key, over the defaults. */
		fields: { type: Object, default: () => ({}) },
		/** Headings for grouped items, in order: `[{ id, title }]`. */
		groups: { type: Array, default: () => [] },
		/** A line above the list. */
		description: { type: String, default: '' },
		/** The words for each state: `{ met, unmet, unknown }`. */
		statusLabels: { type: Object, default: () => ({}) },
		/** Said when there is nothing to check. */
		emptyText: { type: String, default: '' },
		/** Said when the source could not be read. */
		errorText: { type: String, default: '' },
		/** Said before the unmet items marked `blocking` ("Cannot run until this is installed:"). */
		blockingText: { type: String, default: '' },
	},

	emits: ['loaded'],

	data() {
		return {
			loading: false,
			loadError: '',
			loadedItems: null,
		}
	},

	computed: {
		/** @return {Array<object>} The items, normalised. */
		shownItems() {
			const raw = this.loadedItems !== null ? this.loadedItems : this.items
			const map = { ...DEFAULT_FIELDS, ...(this.fields || {}) }
			return (Array.isArray(raw) ? raw : []).map((row, index) => {
				const read = (key) => readPath(row, map[key])
				const met = read('met')
				return {
					id: String(read('id') ?? index),
					label: this.text(read('label') ?? read('id') ?? ''),
					explanation: this.text(read('explanation') ?? ''),
					met: met === true || met === false ? met : null,
					fixHref: typeof read('fixHref') === 'string' ? read('fixHref') : '',
					failure: read('failure') ? String(read('failure')) : '',
					group: read('group') ? String(read('group')) : '',
					blocking: read('blocking') === true,
				}
			})
		},

		/** @return {Array<object>} The unmet blocking items. */
		blockingItems() {
			return this.shownItems.filter((item) => item.blocking && item.met !== true)
		},

		/** @return {Array<{id: string, title: string, items: Array<object>}>} The groups that hold items, in order. */
		shownGroups() {
			const declared = (Array.isArray(this.groups) ? this.groups : []).map((group) => ({
				id: String(group.id),
				title: this.text(group.title || ''),
				items: this.shownItems.filter((item) => item.group === String(group.id)),
			}))
			const known = new Set(declared.map((group) => group.id))
			const rest = this.shownItems.filter((item) => !known.has(item.group))
			const all = rest.length > 0 ? [{ id: 'items', title: '', items: rest }, ...declared] : declared
			return all.filter((group) => group.items.length > 0)
		},
	},

	watch: {
		source() {
			this.reload()
		},
	},

	mounted() {
		this.reload()
		window.addEventListener('focus', this.onFocus)
	},

	beforeUnmount() {
		window.removeEventListener('focus', this.onFocus)
	},

	methods: {
		t,

		/**
		 * A declared text through the host's translate.
		 *
		 * @param {string} value The text.
		 * @return {string} The translated text.
		 */
		text(value) {
			return value ? String(this.cnTranslate(String(value))) : ''
		},

		/**
		 * @param {object} item The item.
		 * @return {string} `met`, `unmet` or `unknown`.
		 */
		stateOf(item) {
			if (item.met === true) {
				return 'met'
			}
			return item.met === false ? 'unmet' : 'unknown'
		},

		/**
		 * The word for an item's state.
		 *
		 * @param {object} item The item.
		 * @return {string} The word.
		 */
		stateLabel(item) {
			const state = this.stateOf(item)
			const own = this.statusLabels && this.statusLabels[state]
			if (own) {
				return this.text(own)
			}
			return {
				met: t('nextcloud-vue', 'Done'),
				unmet: t('nextcloud-vue', 'Still open'),
				unknown: t('nextcloud-vue', 'Unknown'),
			}[state]
		},

		/**
		 * Read the items again, from the source. The source asks the instance
		 * rather than a stored flag, so a fix made elsewhere shows on return.
		 *
		 * @return {Promise<void>}
		 */
		async reload() {
			if (!this.source) {
				this.loadedItems = null
				return
			}
			this.loading = this.loadedItems === null
			this.loadError = ''
			try {
				const { data } = await axios.get(generateUrl(this.source))
				const rows = Array.isArray(data) ? data : readPath(data, this.itemsPath)
				this.loadedItems = Array.isArray(rows) ? rows : []
				/** @event loaded The source answered. Payload: the whole answer. */
				this.$emit('loaded', data)
			} catch {
				this.loadedItems = []
				this.loadError = this.errorText ? this.text(this.errorText) : t('nextcloud-vue', 'The checklist could not be read.')
			} finally {
				this.loading = false
			}
		},

		/** Re-read when the reader comes back from fixing something. */
		onFocus() {
			if (this.source) {
				this.reload()
			}
		},
	},
}
</script>

<style scoped>
.cn-readiness-checklist__description,
.cn-readiness-checklist__empty {
	color: var(--color-text-maxcontrast);
	margin: 0 0 12px;
}

.cn-readiness-checklist__group-title {
	margin: 12px 0 4px;
}

.cn-readiness-checklist__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-readiness-checklist__item {
	display: flex;
	gap: calc(var(--default-grid-baseline, 4px) * 3);
	padding-block: calc(var(--default-grid-baseline, 4px) * 2);
	border-block-end: 1px solid var(--color-border);
}

.cn-readiness-checklist__state {
	flex: 0 0 auto;
	min-width: 6em;
	font-weight: bold;
}

.cn-readiness-checklist__state--met {
	color: var(--color-success-text, var(--color-success));
}

.cn-readiness-checklist__state--unmet {
	color: var(--color-error-text, var(--color-error));
}

.cn-readiness-checklist__state--unknown {
	color: var(--color-text-maxcontrast);
}

.cn-readiness-checklist__body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-readiness-checklist__explanation {
	color: var(--color-text-maxcontrast);
}

.cn-readiness-checklist__failure {
	color: var(--color-error-text, var(--color-error));
}
</style>
