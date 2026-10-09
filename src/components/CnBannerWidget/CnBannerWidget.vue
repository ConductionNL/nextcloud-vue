<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section
		v-if="visible && isAttention"
		class="cn-banner-widget cn-banner-widget--attention"
		:class="'cn-banner-widget--' + resolvedVariant"
		:aria-labelledby="headingId"
		data-testid="cn-banner-widget-attention">
		<div class="cn-banner-widget__body">
			<p v-if="resolvedKicker" class="cn-banner-widget__kicker">
				{{ resolvedKicker }}
			</p>
			<h3 :id="headingId" class="cn-banner-widget__title">
				{{ displayTitle }}
			</h3>
			<p v-if="displayReason" class="cn-banner-widget__reason">
				{{ displayReason }}
			</p>
		</div>
		<div v-if="resolvedActions.length > 0" class="cn-banner-widget__actions">
			<component
				:is="action.href ? 'a' : 'button'"
				v-for="action in resolvedActions"
				:key="action.key"
				class="cn-banner-widget__action"
				:class="action.primary ? 'cn-banner-widget__action--primary' : 'cn-banner-widget__action--secondary'"
				:href="action.href || null"
				:type="action.href ? null : 'button'"
				data-testid="cn-banner-widget-action"
				@click="onActionClick($event, action)">
				{{ action.label }}
			</component>
		</div>
	</section>
	<!-- The count could not be read. One quiet line, not the card and not an
	     alarm: hidden would read as "nothing to report", which is not known. -->
	<p
		v-else-if="checkFailed"
		class="cn-banner-widget cn-banner-widget--unchecked"
		:title="failureTooltip"
		data-testid="cn-banner-widget-unchecked">
		<span class="cn-banner-widget__unchecked-text">{{ uncheckedText }}</span>
		<span class="cn-banner-widget__unchecked-reason">{{ failureTooltip }}</span>
	</p>
	<div v-else-if="visible" class="cn-banner-widget">
		<NcNoteCard :type="resolvedVariant" class="cn-banner-widget__card">
			<component
				:is="clickable ? 'a' : 'span'"
				class="cn-banner-widget__text"
				:class="{ 'cn-banner-widget__text--clickable': clickable }"
				:href="clickable ? routeHref : null"
				data-testid="cn-banner-widget-text"
				@click="onClick">
				{{ displayText }}
			</component>
		</NcNoteCard>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcNoteCard } from '@nextcloud/vue'
import { followLinkClick, resolveHref } from '../../utils/linkNavigation.js'
import { safeHref } from '../../utils/safeHref.js'
import { nextUid } from '../../utils/uid.js'
import { compareVisibleWhen, readVisibleWhenValue } from '../../utils/visibleWhen.js'

/** Variants understood by NcNoteCard. */
const VARIANTS = ['info', 'warning', 'error', 'success']

/** Layouts: the note card (default) or the attention card. */
const LAYOUTS = ['banner', 'attention']

/** An attention card offers a primary and a secondary action, no more. */
const MAX_ACTIONS = 2

/**
 * CnBannerWidget — declarative notice banner for dashboards and v2 pages
 * (`banner` widget type, Wave 1 of nextcloud-vue#91).
 *
 * Renders a themed NcNoteCard with a variant (`info | warning | error`),
 * a text, an optional click-through route, and an optional `visibleWhen`
 * condition: a simple `{ field, op, value }` predicate evaluated against
 * an endpoint response or an OpenRegister source (the doriath
 * migration-banner case — "show while `pending > 0`").
 *
 * Config arrives either as flat props (v2 grid spreads `props`) or as a
 * stored `content` blob (CnDashboardPage's registry branch) — explicit
 * flat props win on collision.
 *
 * ```json
 * {
 *   "widgetKey": "banner",
 *   "props": {
 *     "variant": "warning",
 *     "text": "Migrations pending — open the migration overview.",
 *     "visibleWhen": { "endpoint": "/apps/doriath/api/migrations/status", "field": "pending", "op": "gt", "value": 0 },
 *     "route": "migrations"
 *   }
 * }
 * ```
 *
 * Fail-safe: with a `visibleWhen`, the banner stays HIDDEN until the
 * condition evaluates true — a failed fetch never breaks (or spams) a
 * dashboard.
 *
 * An attention card (`layout: "attention"`) whose `visibleWhen` request
 * FAILS renders one quiet line instead, "Could not check", with the reason as
 * a tooltip. A hidden card reads as "nothing needs attention", and a failed
 * count does not know that. A request that succeeds with a value that does
 * not meet the condition still renders nothing.
 *
 * `layout: "attention"` turns the banner into an attention card: a card with
 * a coloured edge by severity, a `kicker` label, a `title`, a `reason` line
 * and up to two `actions` (the first is the primary one unless an action says
 * `primary` itself). `visibleWhen` works the same way. Without `layout` the
 * note card above renders, as it always did.
 *
 * ```json
 * {
 *   "widgetKey": "banner",
 *   "props": {
 *     "layout": "attention",
 *     "variant": "error",
 *     "kicker": "First today",
 *     "title": "Parking permits city centre",
 *     "reason": "The deadline ends today.",
 *     "actions": [
 *       { "label": "Open case", "route": { "name": "CaseDetail", "params": { "id": "2026-0061" } } },
 *       { "label": "Suspend deadline", "route": "CaseSuspend" }
 *     ]
 *   }
 * }
 * ```
 */
export default {
	name: 'CnBannerWidget',

	components: { NcNoteCard },

	inject: {
		/**
		 * The host's label lookup (CnAppRoot provides it); identity without one, so a
		 * label that is not a key renders as written.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Banner severity variant: `info | warning | error` (plus `success`
		 * for completeness — NcNoteCard's set). Empty falls back to the
		 * `content` blob, then `info`.
		 */
		variant: {
			type: String,
			default: '',
			validator: (v) => v === '' || VARIANTS.includes(v),
		},

		/** Pre-translated banner text. Empty falls back to the `content` blob. */
		text: {
			type: String,
			default: '',
		},

		/**
		 * Optional visibility condition. Shape:
		 * `{ endpoint?, source?, field?, op?, value }` — exactly one of
		 * `endpoint` (a same-origin URL returning JSON) or `source`
		 * (`{ register, schema, filter? }`, an OpenRegister object query whose
		 * `filter` supports the shared @-token grammar). `field` is a
		 * dot-path into the response (for a `source`, into the first result;
		 * omit it — or use `@total` — to compare the collection total).
		 * `op` is `eq | neq | gt | gte | lt | lte` (default `eq`); `value` is
		 * the literal right-hand side. `null` (the default) shows the banner
		 * unconditionally.
		 *
		 * @type {object|null}
		 */
		visibleWhen: {
			type: Object,
			default: null,
		},

		/**
		 * Optional click-through route: a vue-router route NAME (string) or
		 * a full location object. When set, the banner text is a link to that
		 * route. `null` renders static text.
		 *
		 * @type {string|object|null}
		 */
		route: {
			type: [String, Object],
			default: null,
		},

		/**
		 * How the banner renders: `banner` (the note card, default) or
		 * `attention` (a card with a severity edge, kicker, title, reason and
		 * up to two actions). Empty falls back to the `content` blob, then
		 * `banner`.
		 *
		 * @type {''|'banner'|'attention'}
		 */
		layout: {
			type: String,
			default: '',
			validator: (v) => v === '' || LAYOUTS.includes(v),
		},

		/** Attention card: the small label above the title ("First today"). */
		kicker: {
			type: String,
			default: '',
		},

		/** Attention card: the title. Falls back to `text` when empty. */
		title: {
			type: String,
			default: '',
		},

		/** Attention card: the line under the title that says why this needs attention. `{value}` is replaced like in `text`. */
		reason: {
			type: String,
			default: '',
		},

		/**
		 * Attention card: at most two actions. Each is `{ label, route?,
		 * href?, primary?, id? }`: `route` is a route name or location,
		 * `href` an URL. An action with neither renders a button that emits
		 * `action`. The first action is the primary one unless one sets
		 * `primary: true`.
		 *
		 * @type {Array<{label: string, route?: (string|object), href?: string, primary?: boolean, id?: string}>|null}
		 */
		actions: {
			type: Array,
			default: null,
		},

		/**
		 * Stored content blob (CnDashboardPage registry branch) carrying the
		 * same keys as the flat props: `{ variant, text, visibleWhen, route,
		 * layout, kicker, title, reason, actions }`. Explicit flat props win
		 * on collision.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Pre-evaluated `visibleWhen` outcome `{ met, value }`, injected by a
		 * host that already ran the predicate (CnDashboardPage evaluates it
		 * to know whether to collapse the banner's grid cell). When present,
		 * the banner renders from this verdict instead of fetching again —
		 * no duplicate request and no hidden-until-self-evaluated flash —
		 * and `value` feeds the `{value}` text placeholder. `null` (the
		 * default) keeps the banner self-evaluating. A host whose request
		 * failed passes `{ met: false, value: null, failed: true, reason }`,
		 * and an attention card then says it could not check.
		 *
		 * @type {object|null}
		 */
		conditionOutcome: {
			type: Object,
			default: null,
		},
	},

	emits: [
		/**
		 * Emitted when an attention-card action without a `route` or `href`
		 * is clicked, so the host can run it.
		 *
		 * @event action
		 * @type {{id: (string|undefined), label: string, index: number}}
		 */
		'action',
	],

	/**
	 * The banner's own state: the evaluated condition, the value it read,
	 * and whether the request for it failed.
	 *
	 * @return {object} The state.
	 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
	 */
	data() {
		return {
			/** Id that ties the attention card's region to its title. */
			headingId: `cn-banner-title-${nextUid()}`,
			/** Evaluated visibleWhen outcome (null = not yet evaluated). */
			conditionMet: null,
			/**
			 * The raw field value the predicate read (from the injected
			 * outcome or the banner's own evaluation) — interpolated into
			 * the text wherever it says `{value}`.
			 */
			conditionValue: null,
			/** Whether the visibleWhen request itself failed (not: answered "no"). */
			conditionFailed: false,
			/** Why it failed, as the request reported it. */
			conditionFailureReason: '',
		}
	},

	computed: {
		/** The effective variant (prop → content → 'info'). */
		resolvedVariant() {
			const v = this.variant || (this.content && this.content.variant) || 'info'
			return VARIANTS.includes(v) ? v : 'info'
		},

		/** The effective banner text (prop → content → ''). */
		resolvedText() {
			return this.text || (this.content && this.content.text) || ''
		},

		/** The effective visibleWhen condition (prop → content → null). */
		resolvedVisibleWhen() {
			return this.visibleWhen || (this.content && this.content.visibleWhen) || null
		},

		/** The effective injected outcome (prop → content → null). */
		resolvedConditionOutcome() {
			return this.conditionOutcome || (this.content && this.content.conditionOutcome) || null
		},

		/**
		 * The rendered text: `resolvedText` with `{value}` replaced by the
		 * predicate's field value once one is known. Without a known value
		 * the text renders as written — a `{value}` placeholder only makes
		 * sense on a conditional banner, which stays hidden until its
		 * predicate (and therefore its value) resolves.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		displayText() {
			return this.fillValue(this.resolvedText)
		},

		/** The effective click-through route (prop → content → null). */
		resolvedRoute() {
			return this.route || (this.content && this.content.route) || null
		},

		/**
		 * Whether the attention card renders instead of the note card.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		isAttention() {
			return (this.layout || (this.content && this.content.layout) || 'banner') === 'attention'
		},

		/**
		 * The attention card's kicker (prop, else content).
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		resolvedKicker() {
			const kicker = this.kicker || (this.content && this.content.kicker) || ''
			return kicker ? this.tl(kicker) : ''
		},

		/**
		 * The attention card's title: `title`, else `text`, with `{value}` filled in.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		displayTitle() {
			const title = this.title || (this.content && this.content.title) || ''
			return title ? this.fillValue(this.tl(title)) : this.displayText
		},

		/**
		 * The attention card's reason line. When the title already used
		 * `text`, the text is not repeated here.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		displayReason() {
			const reason = this.reason || (this.content && this.content.reason) || ''
			if (reason) {
				return this.fillValue(this.tl(reason))
			}
			const title = this.title || (this.content && this.content.title) || ''
			// A card that sets `text` to the same words as its `title` says
			// them once.
			return title && this.displayText !== this.displayTitle ? this.displayText : ''
		},

		/**
		 * The attention card's actions: the first two that have a label, each
		 * with its href and whether it is the primary one.
		 *
		 * @return {Array<{key: string, id: (string|undefined), label: string, href: string, target: (object|null), primary: boolean, index: number}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		resolvedActions() {
			const raw = this.actions || (this.content && this.content.actions) || []
			if (!Array.isArray(raw)) {
				return []
			}
			const usable = raw
				.filter((action) => action && typeof action === 'object' && typeof action.label === 'string' && action.label !== '')
				.slice(0, MAX_ACTIONS)
			const declaredPrimary = usable.findIndex((action) => action.primary === true)
			const primaryIndex = declaredPrimary === -1 ? 0 : declaredPrimary
			return usable.map((action, index) => {
				let target = null
				let href = ''
				if (action.route) {
					target = typeof action.route === 'string' ? { name: action.route } : action.route
					href = resolveHref(target, this.$router)
				} else if (typeof action.href === 'string' && action.href !== '') {
					const safe = safeHref(action.href)
					href = safe === '#' ? '' : safe
				}
				return {
					key: `${index}-${action.id || action.label}`,
					id: action.id,
					label: this.tl(action.label),
					href,
					target,
					primary: index === primaryIndex,
					index,
				}
			})
		},

		/**
		 * Whether the banner renders: no condition = always; else the evaluated outcome.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		visible() {
			const title = this.title || (this.content && this.content.title) || ''
			if (this.resolvedText === '' && !(this.isAttention && title !== '')) {
				return false
			}
			if (!this.resolvedVisibleWhen) {
				return true
			}
			return this.conditionMet === true
		},

		/**
		 * Whether to say the check failed: an attention card, with words to
		 * show, whose `visibleWhen` request failed. A plain banner stays
		 * hidden on failure, as it always did.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
		 */
		checkFailed() {
			const title = this.title || (this.content && this.content.title) || ''
			return this.isAttention
				&& !!this.resolvedVisibleWhen
				&& this.conditionFailed
				&& (title !== '' || this.resolvedText !== '')
		},

		/**
		 * The one line shown when the check failed. It names the card by its
		 * title, unless the title needs the value that could not be read.
		 *
		 * @return {string}
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
		 */
		uncheckedText() {
			const title = this.title || (this.content && this.content.title) || this.resolvedText
			if (!title || title.includes('{value}')) {
				return t('nextcloud-vue', 'Could not check')
			}
			// `escape: false`: the result is rendered through `{{ }}`, which escapes.
			return t('nextcloud-vue', 'Could not check: {subject}', { subject: title }, undefined, { escape: false })
		},

		/**
		 * The reason the check failed, for the tooltip and for assistive
		 * technology.
		 *
		 * @return {string}
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
		 */
		failureTooltip() {
			if (!this.conditionFailureReason) {
				return t('nextcloud-vue', 'The check failed.')
			}
			return t('nextcloud-vue', 'The check failed: {reason}', { reason: this.conditionFailureReason }, undefined, { escape: false })
		},

		/** Whether the banner navigates on click (route set + router present). */
		clickable() {
			return !!this.resolvedRoute && !!this.$router
		},

		/** The click-through route as a router location (a string is a route name). */
		routeLocation() {
			const route = this.resolvedRoute
			return typeof route === 'string' ? { name: route } : route
		},

		/** The href of the click-through link. */
		routeHref() {
			return resolveHref(this.routeLocation, this.$router)
		},
	},

	watch: {
		resolvedVisibleWhen: {
			immediate: true,
			handler() {
				this.evaluateCondition()
			},
		},

		resolvedConditionOutcome() {
			this.evaluateCondition()
		},
	},

	methods: {
		/**
		 * A manifest string through the host's label lookup (`cnTranslate`), so a key
		 * such as "Mine" reads in the user's language.
		 *
		 * @param {string} text The text as written in the manifest.
		 * @return {string} The translated text.
		 */
		tl(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Replace `{value}` in a text by the value the predicate read, once
		 * one is known.
		 *
		 * @param {string} text The text.
		 * @return {string} The text with the value filled in.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		fillValue(text) {
			if (this.conditionValue === null || !text.includes('{value}')) {
				return text
			}
			return text.replaceAll('{value}', String(this.conditionValue))
		},

		/**
		 * Run an attention-card action: route an in-app link, leave an
		 * external link to the browser, and emit `action` for a button.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {object} action The resolved action.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
		 */
		onActionClick(event, action) {
			if (action.target) {
				followLinkClick(event, action.target, this.$router)
				return
			}
			if (!action.href) {
				this.$emit('action', { id: action.id, label: action.label, index: action.index })
			}
		},

		/**
		 * Resolve the `visibleWhen` verdict. A host-injected
		 * `conditionOutcome` wins outright — the host already ran the
		 * predicate, so re-fetching would double the request and flash the
		 * banner hidden until its own copy resolved. Otherwise evaluate
		 * through the shared util primitives (endpoint / OpenRegister-source
		 * modes — the Wave-1 banner shape is the canonical one, extracted to
		 * `utils/visibleWhen.js` in Wave 3 so manifest actions reuse it),
		 * keeping the read VALUE for the `{value}` text placeholder.
		 * Fail-safe: any fetch/shape error leaves the banner hidden. The
		 * failure is kept (`conditionFailed`, with its reason) so an
		 * attention card can say it could not check.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check
		 */
		async evaluateCondition() {
			const outcome = this.resolvedConditionOutcome
			if (outcome) {
				this.conditionMet = outcome.met === true
				this.conditionValue = outcome.value !== undefined ? outcome.value : null
				this.conditionFailed = outcome.failed === true
				this.conditionFailureReason = outcome.failed === true && typeof outcome.reason === 'string' ? outcome.reason : ''
				return
			}
			const cond = this.resolvedVisibleWhen
			if (!cond) {
				this.conditionMet = null
				this.conditionValue = null
				this.conditionFailed = false
				this.conditionFailureReason = ''
				return
			}
			try {
				const value = await readVisibleWhenValue(cond)
				this.conditionValue = value
				this.conditionMet = compareVisibleWhen(value, cond.op || 'eq', cond.value)
				this.conditionFailed = false
				this.conditionFailureReason = ''
			} catch (error) {
				// Still hidden: a banner that cannot tell whether it applies
				// should not claim attention. But not silently, because a
				// failed count and "nothing to report" look the same on screen.
				// eslint-disable-next-line no-console
				console.warn('[CnBannerWidget] visibleWhen could not be evaluated, banner hidden:', error?.message || error)
				this.conditionMet = false
				this.conditionValue = null
				this.conditionFailed = true
				this.conditionFailureReason = typeof error?.message === 'string' ? error.message : String(error ?? '')
			}
		},

		/**
		 * Route a plain click on the link; a modified click opens the href
		 * in the browser.
		 *
		 * @param {MouseEvent} event The click event.
		 * @return {void}
		 */
		onClick(event) {
			if (!this.clickable) {
				return
			}
			followLinkClick(event, this.routeLocation, this.$router)
		},
	},
}
</script>

<style scoped>
.cn-banner-widget {
	width: 100%;
}

.cn-banner-widget__card {
	margin: 0;
}

.cn-banner-widget__text--clickable {
	cursor: pointer;
	text-decoration: underline;
	color: inherit;
}

/* The check failed. Muted text, no fill, no severity colour: it is a note
   that something is not known, not a warning. */
.cn-banner-widget--unchecked {
	box-sizing: border-box;
	margin: 0;
	padding: 8px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	cursor: help;
}

/* The reason, for assistive technology; sighted readers get the tooltip. */
.cn-banner-widget__unchecked-reason {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

/* Attention card. The severity edge is an inset shadow, so it takes no width. */
.cn-banner-widget--attention {
	--cn-banner-accent: var(--color-primary-element);
	--cn-banner-accent-text: var(--color-primary-element);
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 16px 24px;
	box-sizing: border-box;
	padding: 20px 24px 20px 28px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-container, var(--border-radius-large, 12px));
	background: var(--color-main-background);
	box-shadow: inset 4px 0 0 0 var(--cn-banner-accent);
}

.cn-banner-widget--attention.cn-banner-widget--warning {
	--cn-banner-accent: var(--color-element-warning, var(--color-warning));
	--cn-banner-accent-text: var(--color-text-warning, var(--color-warning-text, var(--color-main-text)));
}

.cn-banner-widget--attention.cn-banner-widget--error {
	--cn-banner-accent: var(--color-element-error, var(--color-error));
	--cn-banner-accent-text: var(--color-text-error, var(--color-error-text));
}

.cn-banner-widget--attention.cn-banner-widget--success {
	--cn-banner-accent: var(--color-element-success, var(--color-success));
	--cn-banner-accent-text: var(--color-text-success, var(--color-success-text));
}

.cn-banner-widget__body {
	display: flex;
	flex: 1 1 320px;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.cn-banner-widget__kicker {
	margin: 0;
	font-size: 0.85em;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--cn-banner-accent-text);
}

.cn-banner-widget__title {
	margin: 0;
	font-size: 1.3em;
	font-weight: 700;
	line-height: 1.3;
	color: var(--color-main-text);
}

.cn-banner-widget__reason {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-banner-widget__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.cn-banner-widget__action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-height: var(--default-clickable-area, 40px);
	margin: 0;
	padding: 0 16px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-element, var(--border-radius-large, 8px));
	font: inherit;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
}

.cn-banner-widget__action--secondary {
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-banner-widget__action--secondary:hover {
	background: var(--color-background-hover);
}

.cn-banner-widget__action--primary {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-banner-widget__action--primary:hover {
	border-color: var(--color-primary-element-hover);
	background: var(--color-primary-element-hover);
}

.cn-banner-widget__action:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: 2px;
}
</style>
