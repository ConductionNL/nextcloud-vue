<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<div v-if="active" class="cn-walkthrough" :style="{ zIndex }" role="dialog" aria-modal="true" :aria-label="dialogLabel">
		<!-- aria-live announcement of the current step -->
		<div class="cn-walkthrough__live" aria-live="polite">{{ liveText }}</div>

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
		<div ref="card" class="cn-walkthrough__card" :class="`cn-walkthrough__card--${cardPlacement}`" :style="cardStyle">
			<!-- @slot coachmark Override the whole coachmark body. Scope: { step, index, total, next, back, skip }. -->
			<slot name="coachmark" :step="step" :index="index" :total="total" :next="advance" :back="back" :skip="skip">
				<div class="cn-walkthrough__counter">{{ index + 1 }} / {{ total }}</div>
				<h3 v-if="stepTitle" class="cn-walkthrough__title">{{ stepTitle }}</h3>
				<p v-if="stepBody" class="cn-walkthrough__body">{{ stepBody }}</p>
				<p v-if="step && step.task" class="cn-walkthrough__task">
					<span class="cn-walkthrough__task-icon" aria-hidden="true">👉</span> {{ step.task }}
				</p>
				<div class="cn-walkthrough__actions">
					<NcButton ref="skipBtn" type="tertiary" @click="skip">{{ skipLabel }}</NcButton>
					<span class="cn-walkthrough__spacer" />
					<NcButton v-if="!isFirst" type="secondary" @click="back">{{ backLabel }}</NcButton>
					<NcButton v-if="showNext" type="primary" @click="advance">{{ isLast ? finishLabel : nextLabel }}</NcButton>
				</div>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { useWalkthrough } from '../../composables/useWalkthrough.js'

/**
 * CnWalkthrough — abstract, manifest-driven product walkthrough (ADR-043).
 *
 * Renders a `manifest.walkthrough` tour as a gray dimmer with a spotlight cutout
 * around one real, interactive element, plus an auto-positioned coachmark card.
 * It never promotes the target's `z-index` — the dimmer is four strips framing
 * the target rect, so the element stays clickable in place regardless of its
 * stacking context. Step advancement is declarative: the component sources
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

	components: { NcButton },

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
		/** Optional translate function applied to step title/body/task i18n keys. */
		translate: { type: Function, default: null },
	},

	emits: ['complete', 'dismiss', 'step-change', 'advance'],

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
			rect: null,        // target bounding rect (viewport coords)
			cardPos: { top: 0, left: 0 },
			cardPlacement: 'bottom',
			targetEl: null,
			_observer: null,
			_delayTimer: null,
			_onScroll: null,
			_onKey: null,
			_onObjectCreated: null,
			_routeUnhook: null,
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

	mounted() {
		// Auto-start a qualifying tour unless one is already running.
		if (!this.wt.running.value) {
			const forced = this.tourId
			const auto = this.wt.autoStartTour.value
			if (forced) this.wt.start(forced)
			else if (auto) this.wt.start(auto.id)
		}
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

	beforeDestroy() {
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
				this.$nextTick(() => this.locateTarget())
			})
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
				this.observeForTarget()
				this.rect = null
				return
			}
			try { el.scrollIntoView({ block: 'center', inline: 'center' }) } catch (e) { /* jsdom */ }
			this.computeRect()
			this.armStep(el)
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
		 * Measure the target into a viewport rect.
		 *
		 * @return {void}
		 */
		computeRect() {
			if (!this.targetEl) return
			const r = this.targetEl.getBoundingClientRect()
			this.rect = { top: r.top, left: r.left, width: r.width, height: r.height }
			this.$nextTick(() => this.placeCard())
		},
		/**
		 * Position the coachmark near the target with a simple flip so it stays
		 * on-screen.
		 *
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
			if (placement === 'bottom') { top = r.top + r.height + gap; left = r.left }
			else if (placement === 'top') { top = r.top - gap - ch; left = r.left }
			else if (placement === 'left') { top = r.top; left = r.left - gap - cw }
			else { top = r.top; left = r.left + r.width + gap }
			left = Math.max(gap, Math.min(left, vw - cw - gap))
			top = Math.max(gap, Math.min(top, vh - ch - gap))
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
				const btn = this.$refs.skipBtn && this.$refs.skipBtn.$el
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
			if (this._observer) { this._observer.disconnect(); this._observer = null }
			if (this._delayTimer) { clearTimeout(this._delayTimer); this._delayTimer = null }
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
		skip() {
			const wasLast = this.isLast
			this.wt.skip()
			if (wasLast) this.$emit('complete')
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

.cn-walkthrough__counter {
	font-size: 0.8125rem;
	color: var(--color-text-maxcontrast);
	margin-bottom: 4px;
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
