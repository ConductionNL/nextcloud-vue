<template>
	<NcActions :forceMenu="visibleActions.length > 3"
		:primary="primary"
		:menuName="menuName"
		data-testid="cn-row-actions">
		<template v-for="{ action, link } in renderedActions" :key="action.label">
			<!-- A navigate-only action is a real link, so it can be middle-clicked, opened in a new tab or copied. -->
			<NcActionLink
				v-if="link"
				:href="link.href"
				:target="link.target"
				:title="getTitle(action)"
				:class="{ 'cn-row-action--destructive': action.destructive }"
				:data-testid="`cn-action-item-${slugifyLabel(action.label)}`"
				closeAfterClick
				@click="onLinkAction(action, link, $event)">
				<template v-if="action.icon" #icon>
					<CnIcon v-if="typeof action.icon === 'string'" :name="action.icon" :size="20" />
					<component :is="action.icon" v-else :size="20" />
				</template>
				{{ action.label }}
			</NcActionLink>
			<NcActionButton
				v-else
				:title="getTitle(action)"
				:disabled="isDisabled(action)"
				:class="{ 'cn-row-action--destructive': action.destructive }"
				:data-testid="`cn-action-item-${slugifyLabel(action.label)}`"
				closeAfterClick
				@click="onAction(action)">
				<template v-if="action.icon" #icon>
					<CnIcon v-if="typeof action.icon === 'string'" :name="action.icon" :size="20" />
					<component :is="action.icon" v-else :size="20" />
				</template>
				{{ action.label }}
			</NcActionButton>
		</template>
	</NcActions>
</template>

<script>
import { NcActionButton, NcActionLink, NcActions } from '@nextcloud/vue'
import { followItemActionLink, resolveItemActionLink } from '../../utils/actionLink.js'
import { isModifiedClick } from '../../utils/linkNavigation.js'
import { evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnRowActions — Action menu wrapper for table rows and cards.
 *
 * Wraps NcActions + NcActionButton for consistent row/card action menus.
 * Actions are defined as an array of objects with label, icon, handler, etc.
 *
 * ```vue
 * <CnRowActions
 *   :actions="[
 *     { label: 'Edit', icon: PencilIcon, handler: (row) => editRow(row) },
 *     { label: 'Delete', icon: TrashIcon, handler: (row) => deleteRow(row), destructive: true },
 *   ]"
 *   :row="row" />
 * ```
 *
 * An action whose only job is to go somewhere carries `href` (a URL) or `to`
 * (a vue-router location) instead of a navigating `handler`, and renders as a
 * real link — middle-click, "open in new tab" and "copy link" all work:
 *
 * ```vue
 * <CnRowActions
 *   :actions="[
 *     { label: 'View', icon: 'Eye', to: (row) => ({ name: 'LeadDetail', params: { id: row.id } }) },
 *     { label: 'Website', icon: 'Web', href: (row) => row.url, linkTarget: '_blank' },
 *   ]"
 *   :row="row" />
 * ```
 */
export default {
	name: 'CnRowActions',

	components: {
		NcActions,
		NcActionButton,
		NcActionLink,
		CnIcon,
	},

	props: {
		/**
		 * Action definitions.
		 *
		 * Each action supports:
		 * - `label` (string, required) — display text
		 * - `icon` (component | string) — MDI icon. A component renders
		 *   directly; a string is treated as a registry name and rendered
		 *   via `CnIcon` (PascalCase, e.g. `"Eye"`), falling back to the
		 *   help-circle when unregistered. The string form lets manifest
		 *   (JSON) actions declare icons by name.
		 * - `handler` (function) — called with `row` on click
		 * - `disabled` (boolean | (row) => boolean) — gray out the entry
		 * - `visible` (boolean | (row) => boolean) — when `false`, hide the entry from the menu (default: shown)
		 * - `title` (string | (row) => string) — native tooltip shown on hover (useful to explain why an entry is disabled)
		 * - `destructive` (boolean) — apply error color styling
		 * - `href` (string | (row) => string) — render the entry as a link to this URL
		 * - `to` (string | object | (row) => string | object) — render the entry as a link to this
		 *   vue-router location; a plain click routes in place. Ignored when the router cannot resolve it.
		 * - `linkTarget` (string) — the link's `target`, e.g. `_blank`
		 *
		 * A link entry still emits `action`, but its `handler` is not called: the link is the
		 * navigation. A disabled entry, or a `to` without a resolvable route, stays a button.
		 *
		 * @type {Array<{label: string, icon: object | string, handler: (targetItem: object) => void, disabled: boolean | ((targetItem: object) => boolean), visible: boolean | ((targetItem: object) => boolean), title: string | ((targetItem: object) => string), destructive: boolean, href: string | ((targetItem: object) => string), to: string | object | ((targetItem: object) => string | object), linkTarget: string}>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},

		/** The row/object data (passed to action handlers) */
		row: {
			type: Object,
			default: null,
		},

		/** Whether to use primary styling for the action menu trigger */
		primary: {
			type: Boolean,
			default: false,
		},

		/** Label shown on the action menu trigger button */
		menuName: {
			type: String,
			default: undefined,
		},
	},

	emits: ['action'],

	computed: {
		/**
		 * Filter actions by their `visible` predicate. An action without a
		 * `visible` field is always shown (backwards compatible).
		 *
		 * @return {Array} Visible actions for the current row.
		 */
		visibleActions() {
			return this.actions.filter((action) => {
				// A manifest is JSON and cannot hold a function, so `visibleWhen` is
				// the only per-row gate an app configured from one can express. Only
				// a locally decidable condition is gated on: an endpoint/source one is
				// not this evaluator's question, and nothing gated a row action at all
				// before, so answering `false` to it would delete the entry outright.
				if (action.visibleWhen
					&& isLocallyDecidableVisibleWhen(action.visibleWhen)
					&& evaluateVisibleWhenLocal(action.visibleWhen, this.row) === false) {
					return false
				}
				if (action.visible === undefined) {
					return true
				}
				if (typeof action.visible === 'function') {
					return !!action.visible(this.row)
				}
				return !!action.visible
			})
		},

		/**
		 * Visible actions paired with the link each renders as (null for a button).
		 *
		 * @return {Array<{action: object, link: object|null}>}
		 */
		renderedActions() {
			return this.visibleActions.map((action) => ({
				action,
				link: this.isDisabled(action) ? null : resolveItemActionLink(action, this.row, this.$router),
			}))
		},
	},

	methods: {
		/**
		 * Resolve disabled state for an action — supports both boolean and function.
		 *
		 * @param {object} action - The action definition
		 * @return {boolean} Whether the action is disabled
		 */
		isDisabled(action) {
			if (typeof action.disabled === 'function') {
				return action.disabled(this.row)
			}
			return !!action.disabled
		},

		/**
		 * Resolve the title (native tooltip) for an action — supports both
		 * string and function forms. Returns undefined when no title is
		 * provided so the attribute is not rendered.
		 *
		 * @param {object} action - The action definition
		 * @return {string|undefined} The resolved tooltip text, or undefined.
		 */
		getTitle(action) {
			if (typeof action.title === 'function') {
				return action.title(this.row) || undefined
			}
			return action.title || undefined
		},

		onAction(action) {
			if (action.handler && typeof action.handler === 'function') {
				action.handler(this.row)
			}
			this.$emit('action', { action: action.label, row: this.row })
		},

		/**
		 * A link entry was clicked: route a plain in-app click, leave the rest to
		 * the browser, and emit `action` as a button would. The `handler` is not
		 * called, since navigating is what the link already does. A modified
		 * click opens a new tab, so nothing is emitted in this one.
		 *
		 * @param {object} action The action definition.
		 * @param {object} link The resolved link.
		 * @param {MouseEvent} event The click event.
		 */
		onLinkAction(action, link, event) {
			if (isModifiedClick(event)) {
				return
			}
			followItemActionLink(event, link, this.$router)
			/**
			 * @event action User picked an entry. Payload: the action's label and the row. A button entry has already run its `handler`; a link entry navigates instead, and a modified (new-tab) click on a link emits nothing.
			 * @type {{ action: string, row: object|null }}
			 */
			this.$emit('action', { action: action.label, row: this.row })
		},

		/**
		 * Slugify an action label for use in stable `data-testid` selectors.
		 * Lowercase, kebab-case, strip non-alphanumeric. Used solely by the
		 * `:data-testid` binding on NcActionButton — does not affect runtime
		 * behaviour or rendered text.
		 *
		 * @param {string} label - The action's display label
		 * @return {string} kebab-case slug suitable for a testid suffix.
		 */
		slugifyLabel(label) {
			return String(label || '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		},
	},
}
</script>

<style scoped>
.cn-row-action--destructive {
	color: var(--color-error) !important;
}
</style>
