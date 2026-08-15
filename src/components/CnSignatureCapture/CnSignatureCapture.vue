<template>
	<div class="cn-signature-capture" data-testid="cn-signature-capture">
		<!-- Mode picker (typed | drawn) when both are allowed. -->
		<div v-if="allowTyped && allowDrawn" class="cn-signature-capture__mode-picker">
			<label class="cn-signature-capture__mode-option" :class="{'cn-signature-capture__mode-option--active': mode === 'typed'}">
				<input v-model="mode" type="radio" value="typed">
				<span>{{ typedModeLabel }}</span>
			</label>
			<label class="cn-signature-capture__mode-option" :class="{'cn-signature-capture__mode-option--active': mode === 'drawn'}">
				<input v-model="mode" type="radio" value="drawn">
				<span>{{ drawnModeLabel }}</span>
			</label>
		</div>

		<!-- Typed signature. -->
		<div v-if="mode === 'typed'" class="cn-signature-capture__typed">
			<input
				v-model="typedValue"
				type="text"
				:placeholder="typedPlaceholder"
				:aria-label="typedAriaLabel"
				class="cn-signature-capture__typed-input"
				@input="onTypedInput">
			<div class="cn-signature-capture__typed-preview" :style="{ fontFamily: typedFont }" aria-hidden="true">
				{{ typedValue || typedPlaceholder }}
			</div>
		</div>

		<!-- Drawn signature canvas. -->
		<div v-else class="cn-signature-capture__drawn">
			<canvas
				ref="canvas"
				:width="canvasWidth"
				:height="canvasHeight"
				class="cn-signature-capture__canvas"
				:aria-label="drawnAriaLabel"
				role="img"
				@mousedown="startStroke"
				@mousemove="continueStroke"
				@mouseup="endStroke"
				@mouseleave="endStroke"
				@touchstart.prevent="startStrokeTouch"
				@touchmove.prevent="continueStrokeTouch"
				@touchend.prevent="endStroke" />
			<small class="cn-signature-capture__hint">{{ drawnHint }}</small>
		</div>

		<!-- Affirmation checkbox (consent / "I declare …"). -->
		<label v-if="affirmation" class="cn-signature-capture__affirmation">
			<input v-model="affirmed" type="checkbox">
			<span>{{ affirmation }}</span>
		</label>

		<!-- Actions row. -->
		<div class="cn-signature-capture__actions">
			<button type="button"
				class="cn-signature-capture__clear"
				:disabled="!hasContent"
				@click="clear">
				{{ clearLabel }}
			</button>
		</div>
	</div>
</template>

<script>
/**
 * CnSignatureCapture — Typed + drawn signature widget with an
 * affirmation checkbox and an audit-payload emit.
 *
 * Two capture modes:
 *  - **typed** — free-form text input rendered in a signature font.
 *  - **drawn** — `<canvas>` with mouse + touch handlers producing a
 *    PNG data-URL stroke trace.
 *
 * Consumers toggle the modes via `allowTyped` / `allowDrawn`; when
 * both are enabled a radio-group lets the user pick. The widget
 * emits `@change` with the structured signature payload + the
 * affirmation state, plus an audit metadata block (timestamp,
 * mode, dimensions). Parents persist the result alongside the
 * signed document.
 *
 * Use inside [`CnWizardDialog`](../CnWizardDialog/) for sign-plan
 * flows, or stand-alone in a settings page.
 *
 * ```vue
 * <CnSignatureCapture
 *   :allow-typed="true"
 *   :allow-drawn="true"
 *   affirmation="I confirm the plan is accurate."
 *   @change="onSigned" />
 * ```
 *
 * ```js
 * function onSigned({ mode, value, affirmed, audit }) {
 *   // mode: 'typed' | 'drawn'
 *   // value: string (typed text) | data-URL (drawn PNG)
 *   // affirmed: boolean (only when `affirmation` prop is set)
 *   // audit: { capturedAt, mode, canvasWidth?, canvasHeight? }
 * }
 * ```
 */
export default {
	name: 'CnSignatureCapture',
	props: {
		/**
		 * Allow typed (text-input) signatures. When both
		 * `allowTyped` and `allowDrawn` are true the user picks via
		 * a radio group; when only one is true the picker is hidden.
		 *
		 * @type {boolean}
		 */
		allowTyped: { type: Boolean, default: true },
		/**
		 * Allow drawn (canvas) signatures.
		 *
		 * @type {boolean}
		 */
		allowDrawn: { type: Boolean, default: true },
		/**
		 * Initial / preferred mode when both are allowed.
		 *
		 * @type {'typed'|'drawn'}
		 */
		initialMode: {
			type: String,
			default: 'typed',
			validator: (v) => v === 'typed' || v === 'drawn',
		},
		/**
		 * Optional affirmation text rendered next to a checkbox the
		 * user must tick (the `affirmed` field in the emit payload).
		 * Empty string hides the checkbox.
		 *
		 * @type {string}
		 */
		affirmation: { type: String, default: '' },
		/**
		 * Canvas dimensions. The PNG data-URL emitted on `change`
		 * uses these.
		 *
		 * @type {number}
		 */
		canvasWidth: { type: Number, default: 360 },
		/**
		 * Canvas height.
		 *
		 * @type {number}
		 */
		canvasHeight: { type: Number, default: 120 },
		/**
		 * Line width for drawn signatures.
		 *
		 * @type {number}
		 */
		lineWidth: { type: Number, default: 2 },
		/**
		 * Stroke colour (CSS colour string).
		 *
		 * @type {string}
		 */
		strokeColor: { type: String, default: '#000' },
		/**
		 * Font family used for the typed-signature preview.
		 *
		 * @type {string}
		 */
		typedFont: { type: String, default: '"Brush Script MT", cursive' },
		/** Placeholder for the typed input + preview when empty. */
		typedPlaceholder: { type: String, default: 'Type your name' },
		/** ARIA label for the typed input. */
		typedAriaLabel: { type: String, default: 'Typed signature input' },
		/** ARIA label for the canvas. */
		drawnAriaLabel: { type: String, default: 'Drawn signature canvas' },
		/** Hint text under the canvas. */
		drawnHint: { type: String, default: 'Draw your signature inside the box.' },
		/** Label for the typed mode radio. */
		typedModeLabel: { type: String, default: 'Type' },
		/** Label for the drawn mode radio. */
		drawnModeLabel: { type: String, default: 'Draw' },
		/** Clear-button label. */
		clearLabel: { type: String, default: 'Clear' },
	},
	emits: ['change'],
	data() {
		return {
			mode: this.resolveInitialMode(),
			typedValue: '',
			affirmed: false,
			drawing: false,
			lastX: 0,
			lastY: 0,
			hasDrawnContent: false,
		}
	},
	computed: {
		/**
		 * Whether the current capture has any content (typed text or
		 * a non-blank canvas).
		 *
		 * @return {boolean} True when there is content to emit.
		 */
		hasContent() {
			return this.mode === 'typed' ? this.typedValue.length > 0 : this.hasDrawnContent
		},
	},
	watch: {
		mode() {
			// Switching modes clears the other mode's draft so an
			// emitted payload always reflects the active mode.
			if (this.mode === 'typed') {
				this.clearCanvas()
			} else {
				this.typedValue = ''
			}
			this.emitChange()
		},
		affirmed() {
			this.emitChange()
		},
	},
	mounted() {
		this.$nextTick(() => this.prepareCanvas())
	},
	methods: {
		/**
		 * Resolve the initial mode given the allow flags.
		 *
		 * @return {'typed'|'drawn'} The starting mode.
		 */
		resolveInitialMode() {
			if (this.initialMode === 'drawn' && this.allowDrawn) return 'drawn'
			if (this.initialMode === 'typed' && this.allowTyped) return 'typed'
			if (this.allowTyped) return 'typed'
			return 'drawn'
		},
		/**
		 * Prepare the canvas with stroke style + background fill.
		 *
		 * @return {void}
		 */
		prepareCanvas() {
			// `getContext('2d')` can return null — the canvas may already be
			// bound to another context type, and jsdom returns null outright.
			// The null-deref used to be absorbed: Vue 2 wrapped every nextTick
			// callback in try/catch and routed the throw through `handleError`.
			// Vue 3's `nextTick` is a bare `promise.then(fn)`, so the same throw
			// escapes as an UNHANDLED REJECTION and takes the whole process down
			// — under jest that reads as "Test suite failed to run", with no
			// failing test to point at.
			const ctx = this.$refs.canvas?.getContext('2d')
			if (!ctx) return
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			ctx.lineWidth = this.lineWidth
			ctx.strokeStyle = this.strokeColor
		},
		/**
		 * Compute canvas-relative coordinates from a pointer event.
		 *
		 * @param {number} clientX The clientX from the pointer event.
		 * @param {number} clientY The clientY from the pointer event.
		 * @return {{x:number,y:number}} Canvas-relative coords.
		 */
		toCanvasCoords(clientX, clientY) {
			const rect = this.$refs.canvas.getBoundingClientRect()
			return {
				x: (clientX - rect.left) * (this.canvasWidth / rect.width),
				y: (clientY - rect.top) * (this.canvasHeight / rect.height),
			}
		},
		/**
		 * Start a stroke from a mouse-down.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		startStroke(event) {
			const { x, y } = this.toCanvasCoords(event.clientX, event.clientY)
			this.drawing = true
			this.lastX = x
			this.lastY = y
		},
		/**
		 * Continue a stroke on mouse-move.
		 *
		 * @param {MouseEvent} event The mousemove event.
		 * @return {void}
		 */
		continueStroke(event) {
			if (!this.drawing) return
			const { x, y } = this.toCanvasCoords(event.clientX, event.clientY)
			this.drawSegment(this.lastX, this.lastY, x, y)
			this.lastX = x
			this.lastY = y
		},
		/**
		 * Touch-event variant of startStroke.
		 *
		 * @param {TouchEvent} event The touchstart event.
		 * @return {void}
		 */
		startStrokeTouch(event) {
			if (!event.touches || event.touches.length === 0) return
			const t = event.touches[0]
			this.startStroke({ clientX: t.clientX, clientY: t.clientY })
		},
		/**
		 * Touch-event variant of continueStroke.
		 *
		 * @param {TouchEvent} event The touchmove event.
		 * @return {void}
		 */
		continueStrokeTouch(event) {
			if (!event.touches || event.touches.length === 0) return
			const t = event.touches[0]
			this.continueStroke({ clientX: t.clientX, clientY: t.clientY })
		},
		/**
		 * End the current stroke and emit a change.
		 *
		 * @return {void}
		 */
		endStroke() {
			if (!this.drawing) return
			this.drawing = false
			this.emitChange()
		},
		/**
		 * Draw a single segment + mark the canvas as containing
		 * content (drives `hasContent`).
		 *
		 * @param {number} x1 Start x.
		 * @param {number} y1 Start y.
		 * @param {number} x2 End x.
		 * @param {number} y2 End y.
		 * @return {void}
		 */
		drawSegment(x1, y1, x2, y2) {
			const ctx = this.$refs.canvas?.getContext('2d')
			if (!ctx) return
			ctx.beginPath()
			ctx.moveTo(x1, y1)
			ctx.lineTo(x2, y2)
			ctx.stroke()
			this.hasDrawnContent = true
		},
		/**
		 * Clear the canvas surface (no change emit).
		 *
		 * @return {void}
		 */
		clearCanvas() {
			const ctx = this.$refs.canvas?.getContext('2d')
			if (!ctx) {
				this.hasDrawnContent = false
				return
			}
			ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
			this.hasDrawnContent = false
		},
		/**
		 * Clear both modes' content + reset affirmation. Emits change
		 * so the parent sees an empty payload.
		 *
		 * @return {void}
		 */
		clear() {
			this.typedValue = ''
			this.clearCanvas()
			this.affirmed = false
			this.emitChange()
		},
		/**
		 * Handle typed-input changes — emit on every keystroke.
		 *
		 * @return {void}
		 */
		onTypedInput() {
			this.emitChange()
		},
		/**
		 * Build the audit metadata block.
		 *
		 * @return {object} { capturedAt, mode, canvasWidth?, canvasHeight? }
		 */
		buildAudit() {
			const base = { capturedAt: new Date().toISOString(), mode: this.mode }
			if (this.mode === 'drawn') {
				return { ...base, canvasWidth: this.canvasWidth, canvasHeight: this.canvasHeight }
			}
			return base
		},
		/**
		 * Build + emit the change payload.
		 *
		 * @return {void}
		 */
		emitChange() {
			let value = ''
			if (this.mode === 'typed') {
				value = this.typedValue
			} else if (this.hasDrawnContent && this.$refs.canvas) {
				value = this.$refs.canvas.toDataURL('image/png')
			}
			/**
			 * @event change Emitted on every state mutation
			 *   (typed input, stroke end, mode switch, affirmation
			 *   toggle, clear). Consumers persist the latest
			 *   payload; partial captures are valid intermediate
			 *   states.
			 * @type {{ mode: 'typed'|'drawn', value: string, affirmed: boolean, audit: object }}
			 */
			this.$emit('change', {
				mode: this.mode,
				value,
				affirmed: this.affirmed,
				audit: this.buildAudit(),
			})
		},
		/**
		 * Return the current capture payload without emitting. Useful
		 * for parent components that want to snapshot on submit.
		 *
		 * @return {object} Same shape as the `change` event payload.
		 */
		getSignature() {
			let value = ''
			if (this.mode === 'typed') {
				value = this.typedValue
			} else if (this.hasDrawnContent && this.$refs.canvas) {
				value = this.$refs.canvas.toDataURL('image/png')
			}
			return { mode: this.mode, value, affirmed: this.affirmed, audit: this.buildAudit() }
		},
	},
}
</script>

<style scoped>
.cn-signature-capture {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-signature-capture__mode-picker {
	display: flex;
	gap: 12px;
}

.cn-signature-capture__mode-option {
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
}

.cn-signature-capture__mode-option--active {
	font-weight: 600;
}

.cn-signature-capture__typed-input {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-signature-capture__typed-preview {
	min-height: 60px;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	font-size: 28px;
	color: var(--color-main-text);
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-signature-capture__canvas {
	border: 1px dashed var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	width: 100%;
	max-width: 100%;
	touch-action: none;
	cursor: crosshair;
}

.cn-signature-capture__hint {
	color: var(--color-text-maxcontrast);
}

.cn-signature-capture__affirmation {
	display: flex;
	gap: 8px;
	align-items: flex-start;
}

.cn-signature-capture__actions {
	display: flex;
	justify-content: flex-end;
}

.cn-signature-capture__clear {
	background: none;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 6px 12px;
	cursor: pointer;
}

.cn-signature-capture__clear:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
