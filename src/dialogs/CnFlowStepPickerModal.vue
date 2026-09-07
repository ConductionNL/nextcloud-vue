<!--
  CnFlowStepPickerModal — every step the engine offers, searchable, in a modal.

  WHY THIS IS NOT A SIDEBAR PANEL ANY MORE
  ----------------------------------------
  The palette lived in the Steps tab, a column roughly 300px wide, and a live
  instance serves SIXTY-FIVE step types into it. A one-per-row list that long is
  not a chooser; it is a scroll. The author who knows what they want scrolls
  past it, and the author who does not cannot see enough at once to compare.

  A modal has the whole window. The same entries render as a grid, so a screen
  shows a dozen at a glance instead of three, and the search and the type filter
  sit above them rather than competing with the graph for the sidebar's width.

  It also frees the sidebar. With the palette gone the sidebar is the flow's
  runs, which is what an author looks at once the graph is built.

  WHAT IS CARRIED ACROSS, DELIBERATELY
  ------------------------------------
  DRAGGING. A step can be dragged from here onto the canvas exactly as it could
  from the palette, through the same `store.paletteDragType`. Clicking still
  adds to the graph. Losing either would trade one interaction for another
  rather than moving the surface.

  THE THREE EMPTY STATES, which say three different things: the catalogue is
  still loading, the catalogue is empty (the server could not be read, which is
  a standing condition of the flow and is ALSO on the canvas), and the search
  matched nothing. Collapsing them into one "nothing here" was the version of
  this that made a broken catalogue look like a bad search term.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog :name="t('nextcloud-vue', 'Add a step')"
		size="large"
		data-testid="flow-step-picker"
		@closing="$emit('close')">
		<div class="cn-step-picker">
			<div class="cn-step-picker__controls">
				<NcTextField :model-value="search"
					:label="t('nextcloud-vue', 'Search steps')"
					trailing-button-icon="close"
					:show-trailing-button="search !== ''"
					data-testid="flow-step-picker-search"
					@trailing-button-click="search = ''"
					@update:model-value="search = $event" />

				<NcSelect :model-value="roleOption"
					:options="roleOptions"
					:input-label="t('nextcloud-vue', 'Type')"
					:clearable="false"
					@update:model-value="role = $event ? $event.id : null" />
			</div>

			<p v-if="store.catalogLoading && !store.nodeCatalog.length" class="cn-step-picker__hint">
				{{ t('nextcloud-vue', 'Loading the available steps…') }}
			</p>
			<!--
				Why the list is empty, AT the list. One short line, because the
				diagnosis — the catalogue could not be read, and no step can be
				added at all — is a standing condition of the flow and renders on
				the canvas with every other message.
			-->
			<p v-else-if="!store.nodeCatalog.length" class="cn-step-picker__hint">
				{{ t('nextcloud-vue', 'No steps are available to add.') }}
			</p>
			<p v-else-if="!entries.length" class="cn-step-picker__hint" data-testid="flow-step-picker-nomatch">
				{{ t('nextcloud-vue', 'No step matches this search.') }}
			</p>
			<template v-else>
				<section v-for="group in groups"
					:key="group.category"
					class="cn-step-picker__group"
					data-testid="flow-step-picker-group"
					:data-category="group.category">
					<h3 class="cn-step-picker__group-title">
						{{ group.label }}
						<span class="cn-step-picker__group-count">{{ group.entries.length }}</span>
					</h3>
					<ul class="cn-step-picker__grid">
						<li v-for="entry in group.entries"
							:key="entry.id"
							class="cn-step-picker__item"
							draggable="true"
							:title="entry.description"
							data-testid="flow-step-picker-item"
							@dragstart="store.paletteDragType = entry.id"
							@dragend="store.paletteDragType = null"
							@click="add(entry.id)">
							<span class="cn-step-picker__head">
								<span class="cn-step-picker__name">{{ entry.displayName || entry.id }}</span>
								<span class="cn-step-picker__role"
									:class="`cn-step-picker__role--${entry.role}`">
									{{ roleWord(entry.role) }}
								</span>
							</span>
							<span v-if="entry.description" class="cn-step-picker__description">{{ entry.description }}</span>
							<span class="cn-step-picker__id">{{ entry.id }}</span>
						</li>
					</ul>
				</section>
			</template>
		</div>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcSelect, NcTextField } from '@nextcloud/vue'
import { useFlowStore } from '../composables/useFlowStore.js'

/**
 * The palette's groups, in the order it presents them.
 *
 * Mirrors `IFlowNodeTaxonomy::CATEGORIES` in openregister. Kept as a literal
 * rather than derived from the catalogue for the reason in `groups()`: a
 * discovered order is an accident of which apps are installed.
 */
const CATEGORY_ORDER = [
	'triggers',
	'human',
	'objects',
	'logic',
	'messaging',
	'ai',
	'integrations',
	'other',
]

export default {
	name: 'CnFlowStepPickerModal',

	components: { NcDialog, NcSelect, NcTextField },

	emits: ['close'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return { search: '', role: null }
	},

	computed: {
		/**
		 * The catalogue, filtered and ordered the way an author reads it:
		 * triggers first, then steps, then ends.
		 *
		 * @return {Array<object>} The entries to show.
		 */
		entries() {
			const rank = { trigger: 0, step: 1, end: 2 }
			const needle = this.search.trim().toLowerCase()

			return this.store.nodeCatalog
				.map((entry) => ({ ...entry, role: this.store.roleOfNodeType(entry.id) }))
				.filter((entry) => !this.role || entry.role === this.role)
				.filter((entry) => {
					if (!needle) {
						return true
					}

					return `${entry.id} ${entry.displayName || ''} ${entry.description || ''}`
						.toLowerCase()
						.includes(needle)
				})
				// Stable: equal roles keep the catalogue's own order.
				.map((entry, index) => ({ entry, index }))
				.sort((a, b) => ((rank[a.entry.role] ?? 1) - (rank[b.entry.role] ?? 1)) || (a.index - b.index))
				.map(({ entry }) => entry)
		},

		/**
		 * The entries grouped by category, in a FIXED order.
		 *
		 * 🔴 THE ORDER IS DECLARED, NOT DISCOVERED. Registration order depends
		 * on which apps are installed and in what order their listeners fire,
		 * so a palette ordered by the catalogue's own sequence reorders itself
		 * when an unrelated app is enabled, and an author's muscle memory is
		 * wrong through no change of theirs.
		 *
		 * An empty category is omitted rather than rendered as a heading with
		 * nothing under it. `other` is last because it is the prompt for a node
		 * whose owner has not declared yet, not a home.
		 *
		 * @return {Array<object>} One entry per non-empty category.
		 */
		groups() {
			const byCategory = new Map()
			for (const entry of this.entries) {
				// The server always sends a category; an older instance that
				// does not is read as undeclared rather than dropped.
				const category = entry.category || 'other'
				if (!byCategory.has(category)) {
					byCategory.set(category, [])
				}
				byCategory.get(category).push(entry)
			}

			// Anything the server sends that this build does not know about
			// still gets shown, after the known ones and before `other`.
			const known = CATEGORY_ORDER.filter((c) => c !== 'other')
			const unknown = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort()
			const order = [...known, ...unknown, 'other']

			return order
				.filter((category) => byCategory.has(category))
				.map((category) => ({
					category,
					label: this.categoryLabel(category),
					entries: byCategory.get(category),
				}))
		},

		/**
		 * @return {Array<object>} The type filter's options.
		 */
		roleOptions() {
			return [
				{ id: null, label: this.t('nextcloud-vue', 'All types') },
				{ id: 'trigger', label: this.t('nextcloud-vue', 'Triggers') },
				{ id: 'step', label: this.t('nextcloud-vue', 'Steps') },
				{ id: 'end', label: this.t('nextcloud-vue', 'End') },
			]
		},

		/**
		 * @return {object} The selected option.
		 */
		roleOption() {
			return this.roleOptions.find((o) => o.id === this.role) || this.roleOptions[0]
		},
	},

	methods: {
		t,

		/**
		 * A category's heading, in the author's language.
		 *
		 * A category this build does not know is shown by its own id rather
		 * than hidden: a group an author can see and ask about beats a step
		 * that silently is not there.
		 *
		 * @param {string} category The category id.
		 * @return {string} The heading.
		 */
		categoryLabel(category) {
			return {
				triggers: this.t('nextcloud-vue', 'Triggers'),
				human: this.t('nextcloud-vue', 'People'),
				objects: this.t('nextcloud-vue', 'Objects'),
				logic: this.t('nextcloud-vue', 'Logic'),
				messaging: this.t('nextcloud-vue', 'Messaging'),
				ai: this.t('nextcloud-vue', 'AI'),
				integrations: this.t('nextcloud-vue', 'Integrations'),
				other: this.t('nextcloud-vue', 'Other'),
			}[category] || category
		},

		/**
		 * The role, in the author's language.
		 *
		 * @param {string} role The role.
		 * @return {string} The word.
		 */
		roleWord(role) {
			return {
				trigger: this.t('nextcloud-vue', 'Trigger'),
				step: this.t('nextcloud-vue', 'Step'),
				end: this.t('nextcloud-vue', 'End'),
			}[role] || role
		},

		/**
		 * Add the step and get out of the way — whether it worked or not.
		 *
		 * 🔴 IT CLOSES ON A REFUSAL TOO, and that is the correction of a wrong
		 * first answer. I had it stay open when the graph refused the step, on
		 * the reasoning that closing would hide the refusal. It is the other
		 * way round: the refusal renders in the CANVAS message area, and this
		 * modal covers the canvas. Staying open is what hides it.
		 *
		 * So both outcomes end here, and both are visible behind: the step
		 * arriving on the graph, or the message saying why it did not.
		 *
		 * @param {string} id The node type.
		 * @return {void}
		 */
		add(id) {
			this.store.addNode(id)
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-step-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 8px 0;
	/* The dialog is tall; the grid scrolls, the controls do not. */
	max-block-size: 70vh;
}

.cn-step-picker__controls {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	align-items: end;
}

.cn-step-picker__hint {
	color: var(--color-text-maxcontrast);
}

/* THE WHOLE POINT OF THE MODAL: a grid, so sixty-five entries can be compared
   rather than scrolled past one at a time. `auto-fill` rather than a fixed
   count, so the same markup works in a narrow window. */
.cn-step-picker__group {
	margin-block-start: 16px;
}

.cn-step-picker__group-title {
	margin: 0 0 8px;
	font-size: 1rem;
	font-weight: bold;
	display: flex;
	align-items: baseline;
	gap: 8px;
}

.cn-step-picker__group-count {
	font-weight: normal;
	color: var(--color-text-maxcontrast);
}

.cn-step-picker__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
	overflow-y: auto;
}

.cn-step-picker__item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border: 2px solid transparent;
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-step-picker__item:hover,
.cn-step-picker__item:focus-visible {
	border-color: var(--color-primary-element);
}

.cn-step-picker__head {
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: space-between;
}

.cn-step-picker__name {
	font-weight: bold;
}

.cn-step-picker__role {
	font-size: 0.8em;
	text-transform: uppercase;
	color: var(--color-text-maxcontrast);
	letter-spacing: 0.04em;
}

.cn-step-picker__role--trigger { color: var(--color-primary-element); }
.cn-step-picker__role--end { color: var(--color-warning-text, var(--color-warning)); }

.cn-step-picker__description {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-step-picker__id {
	font-family: monospace;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}
</style>
