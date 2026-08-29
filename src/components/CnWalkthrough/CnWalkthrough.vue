<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<div v-if="active"
		class="cn-walkthrough"
		:style="{ zIndex }"
		role="dialog"
		aria-modal="true"
		:aria-label="dialogLabel">
		<!-- aria-live announcement of the current step -->
		<div class="cn-walkthrough__live" aria-live="polite">
			{{ liveText }}
		</div>

		<!-- Dimmer: a centered step uses one full overlay; an anchored step uses
		     four strips that frame the target rect, leaving a real interactive hole. -->
		<template v-if="isCentered || !rect">
			<div class="cn-walkthrough__dim cn-walkthrough__dim--full" @click.self="onBackdrop" />
		</template>
		<template v-else>
			<div class="cn-walkthrough__dim" :style="strip.top" @click.self="onBackdrop" />
			<div class="cn-walkthrough__dim" :style="strip.bottom" @click.self="onBackdrop" />
			<div class="cn-walkthrough__dim" :style="strip.left" @click.self="onBackdrop" />
			<div class="cn-walkthrough__dim" :style="strip.right" @click.self="onBackdrop" />
			<div class="cn-walkthrough__ring" :style="ringStyle" aria-hidden="true" />
		</template>

		<!-- Coachmark card -->
		<div ref="card"
			class="cn-walkthrough__card"
			:class="`cn-walkthrough__card--${cardPlacement}`"
			:style="cardStyle">
			<NcButton class="cn-walkthrough__close"
				variant="tertiary"
				:aria-label="closeLabel"
				:title="closeLabel"
				@click="close">
				<template #icon>
					<Close :size="20" />
				</template>
			</NcButton>
			<!-- @slot coachmark Override the whole coachmark body. Scope: { step, index, total, next, back, skip }. -->
			<slot name="coachmark"
				:step="step"
				:index="index"
				:total="total"
				:next="advance"
				:back="back"
				:skip="skip">
				<div class="cn-walkthrough__counter">
					{{ index + 1 }} / {{ total }}
				</div>
				<h3 v-if="stepTitle" class="cn-walkthrough__title">
					{{ stepTitle }}
				</h3>
				<p v-if="stepBody" class="cn-walkthrough__body">
					{{ stepBody }}
				</p>
				<p v-if="step && step.task" class="cn-walkthrough__task">
					<span class="cn-walkthrough__task-icon" aria-hidden="true">👉</span> {{ step.task }}
				</p>
				<div class="cn-walkthrough__actions">
					<NcButton v-if="!isFirst" variant="secondary" @click="back">
						<template #icon>
							<ChevronLeft :size="20" />
						</template>
						{{ backLabel }}
					</NcButton>
					<span class="cn-walkthrough__spacer" />
					<NcButton v-if="isHandoff"
						ref="firstBtn"
						variant="primary"
						alignment="center-reverse"
						@click="doHandoff">
						<template #icon>
							<ChevronRight :size="20" />
						</template>
						{{ handoffLabel }}
					</NcButton>
					<NcButton v-else-if="showNext"
						ref="firstBtn"
						variant="primary"
						alignment="center-reverse"
						@click="advance">
						<template #icon>
							<ChevronRight :size="20" />
						</template>
						{{ isLast ? finishLabel : nextLabel }}
					</NcButton>
				</div>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import { useWalkthrough } from '../../composables/useWalkthrough.js'

/**
 * CnWalkthrough — abstract, manifest-driven product walkthrough (ADR-043).
 *
 * Renders a `manifest.walkthrough` tour as a gray dimmer with a spotlight cutout
 * around one real, interactive element, plus an auto-positioned coachmark card.
 * It never promotes the target's `z-index` — the dimmer is four strips framing
 * the target rect, so the element stays clickable in place regardless of its
 * stacking context. When a target is hidden inside a collapsed `NcAppNavigation`
 * group (children rendered but `display:none`, so unmeasurable), the engine
 * best-effort expands the group to reveal the item before spotlighting it, rather
 * than falling back to a centered coachmark. Step advancement is declarative: the component sources
 * signals (route change via `$router`, a `cn-walkthrough:object-created` window
 * event, an appearing element via `MutationObserver`, a click on the target, or a
 * delay) and feeds them to {@link useWalkthrough}, which captures route params /
 * object ids into a context bag interpolated into later steps.
 *
 * Mount it gated by `CnAppRoot` over the live shell, or standalone with an
 * explicit `tour-id`.
 *
 * ```vue
 * <CnWalkthrough :app-id="'pipelinq'" :manifest="manifest" :seen-version="seen"
 *   @complete="onComplete" />
 * ```
 */
export default {
	name: 'CnWalkthrough',

	components: { NcButton, Close, ChevronLeft, ChevronRight },

	props: {
		/** The Nextcloud app id (walkthrough machine cache key). */
		appId: { type: String, required: true },
		/** The app manifest; `manifest.walkthrough` + `manifest.version` are read. */
		manifest: { type: Object, default: null },
		/** The user's last-seen app version (drives "what's new" composition). */
		seenVersion: { type: String, default: '' },
		/** Force a specific tour id; when empty the auto-start tour is used. */
		tourId: { type: String, default: '' },
		/** Optional resume token `{ tourId, stepId }` (refresh / cross-app hand-off). */
		resume: { type: Object, default: null },
		/** Stacking order of the overlay. */
		zIndex: { type: Number, default: 10000 },
		/** Next button label. */
		nextLabel: { type: String, default: () => t('nextcloud-vue', 'Next') },
		/** Back button label. */
		backLabel: { type: String, default: () => t('nextcloud-vue', 'Back') },
		/** Skip button label. */
		skipLabel: { type: String, default: () => t('nextcloud-vue', 'Skip') },
		/** Final-step button label. */
		finishLabel: { type: String, default: () => t('nextcloud-vue', 'Finish') },
		/** Accessible label for the corner close button that ends the tour. */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close tour') },
		/** Optional translate function applied to step title/body/task i18n keys. */
		translate: { type: Function, default: null },
	},

	emits: ['complete', 'dismiss', 'step-change', 'advance', 'handoff'],

	setup(props) {
		const wt = useWalkthrough(props.appId, props.manifest, {
			seenVersion: props.seenVersion,
			resume: props.resume,
			onComplete: undefined,
		})
		return { wt }
	},

	data() {
		return {
			rect: null, // target bounding rect (viewport coords)
			cardPos: { top: 0, left: 0 },
			cardPlacement: 'bottom',
			targetEl: null,
		}
	},

	computed: {
		active() {
			return this.wt.running.value && !!this.step
		},
		step() {
			return this.wt.currentStep.value
		},
		index() {
			return this.wt.activeTour.value ? this.wt.activeTour.value.steps.findIndex((s) => s.id === (this.step && this.step.id)) : 0
		},
		total() {
			return this.wt.totalSteps.value
		},
		isFirst() {
			return this.wt.isFirst.value
		},
		isLast() {
			return this.wt.isLast.value
		},
		isCentered() {
			return this.step && this.step.placement === 'center'
		},
		/**
		 * Whether the Next control is shown. Hidden on an enforced action step
		 * (a task + a non-manual advanceOn) unless `allowManualNext` is set.
		 *
		 * @return {boolean} True when Next should render.
		 */
		showNext() {
			if (!this.step) return false
			const enforced = !!this.step.task && this.step.advanceOn && this.step.advanceOn.type !== 'manual'
			return !enforced || this.step.allowManualNext === true
		},
		/**
		 * Whether the active step is a cross-app hand-off (declares `handoff.url`).
		 *
		 * @return {boolean} True when the coachmark offers "Continue in {app}".
		 */
		isHandoff() {
			return !!(this.step && this.step.handoff && this.step.handoff.url)
		},
		handoffLabel() {
			const app = this.step && this.step.handoff && this.step.handoff.app
			return app ? t('nextcloud-vue', 'Continue in {app}', { app }) : t('nextcloud-vue', 'Continue')
		},
		stepTitle() {
			return this.tr(this.step && this.step.title)
		},
		stepBody() {
			return this.tr(this.step && this.step.body)
		},
		dialogLabel() {
			return this.stepTitle || t('nextcloud-vue', 'Walkthrough')
		},
		liveText() {
			if (!this.step) return ''
			return t('nextcloud-vue', 'Step {n} of {total}', { n: this.index + 1, total: this.total }) + ': ' + (this.stepTitle || '')
		},
		ringStyle() {
			if (!this.rect) return {}
			const pad = 6
			return {
				top: (this.rect.top - pad) + 'px',
				left: (this.rect.left - pad) + 'px',
				width: (this.rect.width + pad * 2) + 'px',
				height: (this.rect.height + pad * 2) + 'px',
			}
		},
		strip() {
			const r = this.rect
			if (!r) return {}
			const pad = 6
			const top = Math.max(0, r.top - pad)
			const bottom = r.top + r.height + pad
			const left = Math.max(0, r.left - pad)
			const right = r.left + r.width + pad
			return {
				top: { top: 0, left: 0, width: '100%', height: top + 'px' },
				bottom: { top: bottom + 'px', left: 0, width: '100%', bottom: 0 },
				left: { top: top + 'px', left: 0, width: left + 'px', height: (bottom - top) + 'px' },
				right: { top: top + 'px', left: right + 'px', right: 0, height: (bottom - top) + 'px' },
			}
		},
		cardStyle() {
			if (this.isCentered || !this.rect) {
				return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
			}
			return { top: this.cardPos.top + 'px', left: this.cardPos.left + 'px' }
		},
	},

	watch: {
		step(newStep, oldStep) {
			if (!newStep) return
			if (!oldStep || newStep.id !== oldStep.id) {
				/**
				 * @event step-change Emitted when the active step changes.
				 * @type {{ stepId: string, index: number }}
				 */
				this.$emit('step-change', { stepId: newStep.id, index: this.index })
				this.$nextTick(() => this.locateTarget())
			}
		},
		active(now) {
			if (now) {
				this.$nextTick(() => this.locateTarget())
			} else {
				this.teardownStep()
			}
		},
	},

	/**
	 * Initialise non-reactive instance state (event handler refs, DOM observer
	 * handles). These use the `_` prefix convention and are set here rather than
	 * in `data()` to avoid Vue's reserved-key warning for `_`-prefixed fields.
	 *
	 * @spec openspec/changes/cn-walkthrough-engine/specs/cn-walkthrough/spec.md
	 */
	created() {
		// Non-reactive instance state: event handlers and DOM watchers.
		// Not in data() to avoid triggering Vue's reserved-key warning (_prefix).
		this._revealAttempted = false
		this._observer = null
		this._resizeObs = null
		this._delayTimer = null
		this._onScroll = null
		this._onKey = null
		this._onObjectCreated = null
		this._routeUnhook = null
		// A qualifying auto-start tour whose first-step page is NOT the current
		// route — held here until the user navigates to that page (see hookRouter).
		this._pendingAutoTour = null
	},

	mounted() {
		// Auto-start a qualifying tour unless one is already running.
		this.maybeAutoStart()
		this._onScroll = () => this.computeRect()
		window.addEventListener('scroll', this._onScroll, true)
		window.addEventListener('resize', this._onScroll)
		this._onKey = (e) => { if (e.key === 'Escape') this.onBackdrop() }
		window.addEventListener('keydown', this._onKey)
		this._onObjectCreated = (e) => this.wt.notify({ kind: 'object-created', object: (e && e.detail) || {} })
		window.addEventListener('cn-walkthrough:object-created', this._onObjectCreated)
		this.hookRouter()
		if (this.active) this.$nextTick(() => this.locateTarget())
	},

	beforeUnmount() {
		window.removeEventListener('scroll', this._onScroll, true)
		window.removeEventListener('resize', this._onScroll)
		window.removeEventListener('keydown', this._onKey)
		window.removeEventListener('cn-walkthrough:object-created', this._onObjectCreated)
		if (typeof this._routeUnhook === 'function') this._routeUnhook()
		this.teardownStep()
	},

	methods: {
		/**
		 * Translate an i18n key/text via the `translate` prop when given.
		 *
		 * @param {string} value The key or literal.
		 * @return {string} The resolved string.
		 */
		tr(value) {
			if (!value) return ''
			return typeof this.translate === 'function' ? this.translate(value) : value
		},
		/**
		 * Hook `$router.afterEach` (when a router is present) to feed route signals.
		 *
		 * @return {void}
		 */
		hookRouter() {
			const router = this.$router
			if (!router || typeof router.afterEach !== 'function') return
			this._routeUnhook = router.afterEach((to) => {
				this.wt.notify({ kind: 'route', route: to.name, params: to.params || {} })
				// A first-visit tour deferred because the user deep-linked onto a
				// different page starts once they reach its first-step page.
				if (this._pendingAutoTour && !this.wt.running.value
					&& this.routeMatchesTour(this._pendingAutoTour, to.name)) {
					const tour = this._pendingAutoTour
					this._pendingAutoTour = null
					this.wt.start(tour.id)
				}
				this.$nextTick(() => this.locateTarget())
			})
		},
		/**
		 * Start a qualifying auto-start tour — but a `first-visit` tour whose
		 * first step SPOTLIGHTS something on a specific page only opens when the
		 * user is ON that page. A centered welcome step spotlights nothing and
		 * therefore starts anywhere. Deep-linking onto an unrelated route (e.g. a shared detail-page
		 * URL) defers the tour via `_pendingAutoTour` instead of popping it over
		 * the wrong screen (ADR-062). A forced `tourId` always starts; a tour
		 * whose first step is not page-anchored keeps the prior any-route
		 * behaviour; without a router there is nothing to match, so it starts.
		 *
		 * @return {void}
		 */
		maybeAutoStart() {
			if (this.wt.running.value) return
			if (this.tourId) { this.wt.start(this.tourId); return }
			const auto = this.wt.autoStartTour.value
			if (!auto) return
			if (!this.$router) { this.wt.start(auto.id); return }
			const routeName = this.$route && this.$route.name
			if (this.routeMatchesTour(auto, routeName)) {
				this.wt.start(auto.id)
			} else {
				this._pendingAutoTour = auto
			}
		},
		/**
		 * The route name a tour's FIRST step is anchored to, or null when the
		 * first step is not page-anchored (a centered welcome step, or a
		 * non-page target). Used to gate auto-start to the right screen.
		 *
		 * A `placement: "center"` first step returns NULL however it is
		 * anchored. This is the whole point: a centered step spotlights
		 * nothing — it is a welcome card floating in the middle of the screen —
		 * so there is no element for the user to be "on the right page" for,
		 * and gating its auto-open on a route only decides whether the tour
		 * opens at all.
		 *
		 * That is what it did. This docblock already CLAIMED a centered welcome
		 * step returned null; the code never checked `placement`, so any app
		 * whose welcome step happened to carry a page/nav anchor other than its
		 * landing route parked the tour in `_pendingAutoTour` and never opened
		 * it — no error, no log, just no walkthrough. Measured on one instance
		 * with an empty seen-state: opencatalogi (welcome anchored to
		 * `Catalogs`) and pipelinq (anchored to `Products`) both showed nothing
		 * at `#/` and the full tour at the anchored route, while dossiq
		 * (anchored to its landing `Dashboard`) worked — the control that shows
		 * the anchor, not the tour, was the variable. 19 of 20 fleet manifests
		 * declare a walkthrough, so this is a class, not two instances.
		 *
		 * A step that genuinely spotlights an element keeps the ADR-062
		 * behaviour, which is what it was built for: it still waits for its
		 * page rather than popping over a deep-linked detail screen.
		 *
		 * @param {object} tour The tour definition.
		 * @return {string|null} The first-step page/nav route name, or null.
		 */
		firstStepPage(tour) {
			const steps = (tour && tour.steps) || []
			const first = steps[0]
			if (!first) return null
			if (first.placement === 'center') return null
			const tgt = first.target
			if (tgt && (tgt.kind === 'page' || tgt.kind === 'nav-item') && tgt.ref) {
				return String(tgt.ref)
			}
			return null
		},
		/**
		 * Whether a tour may auto-open on the given route. True when the tour's
		 * first step is not page-anchored — which includes every `center`-placed
		 * welcome step, since it spotlights nothing (see firstStepPage) — so the
		 * tour starts wherever the user lands. Otherwise the route name must
		 * equal the first-step page.
		 *
		 * This is the ONLY consumer of firstStepPage, and both auto-start paths
		 * (maybeAutoStart on mount, and the router afterEach that resumes a
		 * deferred tour) go through here — so a centered step cannot be
		 * swallowed by either.
		 *
		 * @param {object} tour The tour definition.
		 * @param {string} [routeName] The current route name.
		 * @return {boolean} True when the tour may open on this route.
		 */
		routeMatchesTour(tour, routeName) {
			const page = this.firstStepPage(tour)
			if (!page) return true
			return !!routeName && String(routeName) === page
		},
		/**
		 * Resolve, scroll to, and measure the active step's target, then install
		 * the step's advance watcher.
		 *
		 * @return {void}
		 */
		locateTarget() {
			this.teardownStep()
			if (!this.step || this.isCentered) {
				this.rect = null
				this.focusCard()
				this.armDelay()
				return
			}
			const el = this.resolveTarget(this.step)
			this.targetEl = el
			if (!el) {
				// Optional step whose target is absent → skip; else wait for it.
				if (this.step.optional) { this.wt.skip(); return }
				// A nav-item/page target may be absent because it lives in a
				// collapsed nav group (children not rendered). Best-effort expand
				// the group so the MutationObserver below catches the now-rendered
				// target and re-locates it.
				const tgtKind = (this.step.target && this.step.target.kind) || ''
				if (tgtKind === 'nav-item' || tgtKind === 'page') this.revealTarget()
				this.observeForTarget()
				this.rect = null
				return
			}
			try { el.scrollIntoView({ block: 'center', inline: 'center' }) } catch (e) { /* jsdom */ }
			this.computeRect()
			this.armStep(el)
			// The ResizeObserver only fires when the target itself resizes. A nav
			// item can MOVE (siblings render/settle after mount) without resizing,
			// leaving a stale cutout one row off. Re-measure across the next few
			// frames so the spotlight tracks the settled position.
			this.scheduleSettleRemeasure()
		},
		/**
		 * Resolve a step's `target` to a DOM element, preferring stable manifest
		 * identities, then `data-walkthrough-id`/`data-testid`, then raw CSS.
		 *
		 * @param {object} step The active step.
		 * @return {Element|null} The resolved element.
		 */
		resolveTarget(step) {
			const tgt = step.target || {}
			const ref = tgt.ref
			const q = (sel) => { try { return document.querySelector(sel) } catch (e) { return null } }
			const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'))
			if (tgt.kind === 'selector' && tgt.selector) return q(tgt.selector)
			if (!ref) return null
			const byId = q(`[data-walkthrough-id="${esc(ref)}"]`) || q(`[data-testid="${esc(ref)}"]`)
			if (byId) return byId
			if (tgt.kind === 'nav-item' || tgt.kind === 'page') {
				return q(`[data-cn-route="${esc(ref)}"]`) || q(`a[href$="#/${esc(ref)}"]`) || q(`[data-route="${esc(ref)}"]`)
			}
			if (tgt.kind === 'widget') return q(`[data-widget-key="${esc(ref)}"]`) || q(`[data-widget-id="${esc(ref)}"]`)
			if (tgt.kind === 'action') return q(`[data-action-id="${esc(ref)}"]`)
			return null
		},
		/**
		 * Best-effort expand collapsed NcAppNavigation groups so a target nested
		 * inside one renders (and becomes measurable). A collapsed group keeps its
		 * children in the DOM but `display:none`, so the target can't be located or
		 * measured and the engine would otherwise fall back to a centered coachmark.
		 *
		 * Scoped to the app navigation. Robust across @nextcloud/vue markup
		 * variants: it primarily clicks any `[aria-expanded="false"]` toggle, then
		 * falls back to the collapse button of any collapsible group that is not in
		 * the opened state. Attempted at most once per step (guarded by
		 * `_revealAttempted`, reset in teardownStep) to avoid an expand/observe loop.
		 *
		 * @return {void}
		 */
		revealTarget() {
			if (this._revealAttempted) return
			this._revealAttempted = true
			const nav = document.querySelector('.app-navigation') || document.querySelector('#app-navigation')
			if (!nav) return
			const clicked = new Set()
			const click = (el) => {
				if (!el || clicked.has(el) || typeof el.click !== 'function') return
				clicked.add(el)
				try { el.click() } catch (e) { /* jsdom / detached */ }
			}
			// Primary signal: any collapse toggle reporting a collapsed state.
			nav.querySelectorAll('[aria-expanded="false"]').forEach((el) => {
				// Prefer a real button toggle inside the same group over the link.
				const group = el.closest('.app-navigation-entry--collapsible') || nav
				const btn = group.querySelector('button.icon-collapse, .app-navigation-entry__children-toggle, .app-navigation-entry__collapse, button[aria-expanded="false"]')
				click(btn || el)
			})
			// Fallback: collapsible groups not yet opened (older markup without
			// aria-expanded on the toggle — collapsed state is the absent
			// `--opened` / `open` class on the wrapper).
			nav.querySelectorAll('.app-navigation-entry--collapsible').forEach((group) => {
				if (group.classList.contains('app-navigation-entry--opened') || group.classList.contains('open')) return
				const btn = group.querySelector('button.icon-collapse, .app-navigation-entry__children-toggle, .app-navigation-entry__collapse')
				if (btn) click(btn)
			})
		},
		/**
		 * Re-measure the target a few times after arming, to catch post-mount
		 * layout settling (sibling nav items rendering, fonts, etc.) that moves
		 * the target without resizing it. Cleared in teardownStep.
		 *
		 * @return {void}
		 */
		scheduleSettleRemeasure() {
			const again = () => { if (this.targetEl && !this.isCentered) this.computeRect() }
			this._settleTimers = (this._settleTimers || [])
			this._settleTimers.push(setTimeout(again, 100), setTimeout(again, 300), setTimeout(again, 600))
		},
		/**
		 * Measure the target into a viewport rect.
		 *
		 * @return {void}
		 */
		computeRect() {
			if (!this.targetEl) return
			const r = this.targetEl.getBoundingClientRect()
			// Target present but not laid out (e.g. a nav item inside a collapsed
			// group, or a hidden element): fall back to an anchorless centered
			// coachmark — no point-sized cutout — until it becomes visible. The
			// ResizeObserver armed in armStep() recomputes when it gains size.
			if (r.width === 0 || r.height === 0) {
				// Resolved but not laid out — most often a nav item inside a
				// collapsed group. Expand the group so the ResizeObserver armed in
				// armStep() recomputes once it gains size; until then, anchorless.
				this.revealTarget()
				this.rect = null
				return
			}
			// The overlay (.cn-walkthrough) is position:fixed, but a transformed
			// ancestor (NC content area) can become its containing block, so its
			// top-left is not the viewport origin. Convert the viewport rect into
			// the overlay's coordinate space so the dim/ring/card line up with the
			// real element instead of sitting a header's height too low.
			const host = this.$el && this.$el.getBoundingClientRect ? this.$el.getBoundingClientRect() : { top: 0, left: 0 }
			// Remember the overlay's own viewport offset so placeCard can clamp
			// the coachmark against the REAL viewport even when a transformed
			// ancestor makes the position:fixed origin non-zero.
			this._hostOffset = { top: host.top, left: host.left }
			this.rect = { top: r.top - host.top, left: r.left - host.left, width: r.width, height: r.height }
			this.$nextTick(() => this.placeCard())
		},
		/**
		 * Position the coachmark near the target with a simple flip so it stays
		 * on-screen.
		 *
		 * @spec openspec/changes/cn-walkthrough-engine/specs/cn-walkthrough/spec.md
		 * @return {void}
		 */
		placeCard() {
			const card = this.$refs.card
			if (!card || !this.rect) return
			const cw = card.offsetWidth || 320
			const ch = card.offsetHeight || 160
			const gap = 12
			const vw = window.innerWidth
			const vh = window.innerHeight
			const r = this.rect
			let placement = this.step.placement && this.step.placement !== 'auto' ? this.step.placement : 'bottom'
			let top
			let left
			if (placement === 'bottom' && r.top + r.height + gap + ch > vh) placement = 'top'
			if (placement === 'top' && r.top - gap - ch < 0) placement = 'bottom'
			if (placement === 'bottom') { top = r.top + r.height + gap; left = r.left } else if (placement === 'top') { top = r.top - gap - ch; left = r.left } else if (placement === 'left') { top = r.top; left = r.left - gap - cw } else { top = r.top; left = r.left + r.width + gap }
			// Clamp to the viewport. `left`/`top` live in overlay-relative space
			// (this.rect was host-subtracted), so the viewport bounds must be
			// host-subtracted too — otherwise a scrolled/transformed host would
			// let the card render off-screen (ADR-062: the coachmark is always
			// fully on-screen).
			const ho = this._hostOffset || { top: 0, left: 0 }
			left = Math.max(gap - ho.left, Math.min(left, vw - cw - gap - ho.left))
			top = Math.max(gap - ho.top, Math.min(top, vh - ch - gap - ho.top))
			this.cardPlacement = placement
			this.cardPos = { top, left }
			this.focusCard()
		},
		/**
		 * Move focus to the coachmark's first control (focus management / a11y).
		 *
		 * @return {void}
		 */
		focusCard() {
			this.$nextTick(() => {
				const btn = this.$refs.firstBtn && this.$refs.firstBtn.$el
				if (btn && typeof btn.focus === 'function') btn.focus()
			})
		},
		/**
		 * Install the advance watcher for the active step (click / element / delay;
		 * route + object-created are global listeners installed at mount).
		 *
		 * @param {Element} el The resolved target.
		 * @return {void}
		 */
		armStep(el) {
			const a = this.step.advanceOn || {}
			if (a.type === 'click-target' && el) {
				this._clickHandler = () => this.wt.notify({ kind: 'click' })
				el.addEventListener('click', this._clickHandler, { once: true })
			}
			// Recompute the cutout when the target's size changes — covers a target
			// that starts hidden/zero-size (e.g. inside a collapsed nav group) and
			// becomes visible while the step is active.
			if (el && window.ResizeObserver) {
				this._resizeObs = new ResizeObserver(() => this.computeRect())
				this._resizeObs.observe(el)
			}
			this.armDelay()
		},
		/**
		 * Arm the delay timer for a `delay` advance.
		 *
		 * @return {void}
		 */
		armDelay() {
			const a = (this.step && this.step.advanceOn) || {}
			if (a.type === 'delay') {
				this._delayTimer = setTimeout(() => this.wt.notify({ kind: 'delay' }), a.ms || 1500)
			}
		},
		/**
		 * Watch the DOM until an `element-appears` (or a not-yet-mounted) target
		 * resolves, then re-locate.
		 *
		 * @return {void}
		 */
		observeForTarget() {
			this._observer = new MutationObserver(() => {
				const el = this.resolveTarget(this.step)
				if (el) {
					this._observer.disconnect()
					this._observer = null
					if (this.step.advanceOn && this.step.advanceOn.type === 'element-appears') {
						this.wt.notify({ kind: 'element' })
					} else {
						this.locateTarget()
					}
				}
			})
			this._observer.observe(document.body, { childList: true, subtree: true })
		},
		/**
		 * Tear down the current step's watchers/timers/listeners.
		 *
		 * @return {void}
		 */
		teardownStep() {
			this._revealAttempted = false
			if (this._observer) { this._observer.disconnect(); this._observer = null }
			if (this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null }
			if (this._delayTimer) { clearTimeout(this._delayTimer); this._delayTimer = null }
			if (this._settleTimers) { this._settleTimers.forEach(clearTimeout); this._settleTimers = null }
			if (this.targetEl && this._clickHandler) {
				this.targetEl.removeEventListener('click', this._clickHandler)
				this._clickHandler = null
			}
		},
		/**
		 * Advance the tour one step, completing on the last step.
		 *
		 * @return {void}
		 */
		advance() {
			/**
			 * @event advance Emitted when the user advances the tour.
			 * @type {{ stepId: string }}
			 */
			this.$emit('advance', { stepId: this.step && this.step.id })
			const wasLast = this.isLast
			this.wt.next()
			if (wasLast) {
				/**
				 * @event complete Emitted when the last step is passed.
				 */
				this.$emit('complete')
			}
		},
		back() {
			this.wt.back()
		},
		/**
		 * The coachmark's "Skip" control — ENDS the tour (it does not advance a
		 * step). Marks the tour complete so the seen-version is persisted and it
		 * won't auto-reopen, then emits `dismiss` + `complete` (ADR-062: Skip
		 * dismisses the whole tour; Next is the only control that advances).
		 * The internal per-step skip (an optional step whose target is absent)
		 * still uses `wt.skip()` directly in `locateTarget`.
		 *
		 * @return {void}
		 */
		skip() {
			this.wt.complete()
			/**
			 * @event dismiss Emitted when the user skips (ends) the tour.
			 */
			this.$emit('dismiss')
			this.$emit('complete')
		},
		/**
		 * Execute a cross-app hand-off: complete this tour locally, then navigate
		 * the browser to the destination URL carrying a `cn_resume_tour` /
		 * `cn_resume_step` token so the destination app's useWalkthrough resumes.
		 *
		 * @return {void}
		 */
		doHandoff() {
			const h = (this.step && this.step.handoff) || {}
			if (!h.url) return
			const tour = h.tour || (this.wt.activeTour.value && this.wt.activeTour.value.id) || ''
			let url = h.url + (h.url.indexOf('?') === -1 ? '?' : '&') + 'cn_resume_tour=' + encodeURIComponent(tour)
			if (h.step) url += '&cn_resume_step=' + encodeURIComponent(h.step)
			/**
			 * @event handoff Emitted just before navigating to a cross-app destination.
			 * @type {{ app: string, url: string }}
			 */
			this.$emit('handoff', { app: h.app, url })
			this.$emit('complete')
			this.wt.complete()
			try { window.location.href = url } catch (e) { /* jsdom */ }
		},
		/**
		 * End the tour for good from the corner close button: mark it complete so
		 * the seen-version is persisted and it does not auto-show again.
		 *
		 * @return {void}
		 */
		close() {
			this.wt.complete()
			this.$emit('complete')
		},
		/**
		 * Dismiss the tour from a backdrop click or ESC.
		 *
		 * @return {void}
		 */
		onBackdrop() {
			this.wt.dismiss()
			/**
			 * @event dismiss Emitted when the user dismisses the tour (backdrop / ESC).
			 */
			this.$emit('dismiss')
		},
	},
}
</script>

<style scoped>
.cn-walkthrough {
	position: fixed;
	inset: 0;
	pointer-events: none;
}

.cn-walkthrough__live {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
}

.cn-walkthrough__dim {
	position: fixed;
	background: var(--color-modal-background, rgba(0, 0, 0, 0.5));
	pointer-events: auto;
}

.cn-walkthrough__dim--full {
	inset: 0;
}

.cn-walkthrough__ring {
	position: fixed;
	border-radius: var(--border-radius-large, 8px);
	box-shadow: 0 0 0 2px var(--color-primary-element, #0082c9);
	pointer-events: none;
}

.cn-walkthrough__card {
	position: fixed;
	width: 320px;
	max-width: calc(100vw - 24px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	border-radius: var(--border-radius-large, 8px);
	box-shadow: 0 2px 12px var(--color-box-shadow, rgba(0, 0, 0, 0.3));
	padding: 16px;
	pointer-events: auto;
}

.cn-walkthrough__close {
	/* !important beats NcButton's own `position: relative`, which would otherwise
	   leave the close button in-flow at the card's top-left. */
	position: absolute !important;
	top: 8px;
	inset-inline-end: 8px;
	inset-inline-start: auto;
	z-index: 1;
}

.cn-walkthrough__counter {
	font-size: 0.8125rem;
	color: var(--color-text-maxcontrast);
	margin-bottom: 4px;
	/* Keep the counter/title clear of the absolutely-positioned close button. */
	padding-inline-end: 32px;
}

.cn-walkthrough__title {
	margin: 0 0 6px;
	font-size: 1.1rem;
}

.cn-walkthrough__body {
	margin: 0 0 8px;
}

.cn-walkthrough__task {
	margin: 0 0 8px;
	padding: 8px;
	background: var(--color-primary-element-light, var(--color-background-hover));
	border-radius: var(--border-radius, 4px);
	font-weight: 600;
}

.cn-walkthrough__task-icon {
	margin-inline-end: 4px;
}

.cn-walkthrough__actions {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 8px;
}

.cn-walkthrough__spacer {
	flex: 1 1 auto;
}
</style>
