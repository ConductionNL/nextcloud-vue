/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * aiSpeechPolicy — which speech engine an agent is allowed to use.
 *
 * There are two engines and they are not interchangeable:
 *
 * - **browser** — `SpeechRecognition` / `speechSynthesis`. Instant, live partial
 *   results, very good at Dutch. In Chrome it works by streaming the microphone
 *   to Google's servers; Safari uses Apple's; Firefox has no speech recognition
 *   at all. "Browser" does NOT mean "on device".
 * - **local** — the backend app's own speech service (whisper/Kokoro on the
 *   instance). Nothing leaves the instance. Slower: measured ~3s per sentence on
 *   a CPU-only box with faster-whisper-base, and ~80s with the large model.
 *
 * 🔴 THE ONE RULE THIS MODULE EXISTS TO ENFORCE: an agent pinned to `local`
 * NEVER falls back to the browser engine. A fallback that quietly reaches a
 * cloud service for an agent chosen precisely because its subject matter must
 * not reach one is not a degradation, it is the incident. So an unavailable
 * local engine is reported as an unavailable engine, and the microphone says so.
 *
 * The symmetric case is deliberately strict too — `browser` does not silently
 * become `local` — because a user who is told which engine they are on and then
 * silently moved to another has been told nothing. `auto` is the value that
 * means "either", and it is the default.
 */

/** Pick per availability: browser first, local where the browser cannot. */
export const SPEECH_AUTO = 'auto'

/** The browser's own engine. Fast, and off-instance in every major browser. */
export const SPEECH_BROWSER = 'browser'

/** The instance's speech service. Private, slower. */
export const SPEECH_LOCAL = 'local'

/** No speech at all for this agent. */
export const SPEECH_OFF = 'off'

/** The engine values an agent may declare. */
const KNOWN_ENGINES = [SPEECH_AUTO, SPEECH_BROWSER, SPEECH_LOCAL, SPEECH_OFF]

/** Default silence before the microphone is released, in ms. */
export const DEFAULT_SILENCE_TIMEOUT = 2500

/**
 * Read an agent object's speech policy, with defaults.
 *
 * Tolerant of a backend that does not carry these fields at all: an older
 * instance, or one of the other apps that consume this library, simply gets the
 * defaults rather than a broken composer.
 *
 * ⚠️ `talkEnabled` IS NOT PART OF THIS. It exists on the same agent object and
 * means "reachable from a Nextcloud Talk room" — rooms, not microphones.
 * Reading it here would switch dictation on for every Talk-enabled agent.
 *
 * @param {object|null} agent The raw agent object from the agents endpoint.
 * @return {{inputEngine: string, outputEngine: string, silenceTimeout: number, conversationEnabled: boolean}} The policy.
 */
export function normalizeAgentSpeechPolicy(agent) {
	const source = (agent && typeof agent === 'object') ? agent : {}

	return {
		inputEngine: readEngine(source.voiceInputEngine),
		outputEngine: readEngine(source.voiceOutputEngine),
		silenceTimeout: readTimeout(source.voiceSilenceTimeout),
		conversationEnabled: source.voiceConversationEnabled === true,
	}
}

/**
 * One declared engine value, or `auto` when absent or unrecognised.
 *
 * An unrecognised value falls back to `auto` rather than to `local`: a typo in
 * configuration should not silently disable speech, and it must not silently
 * ENABLE the private-only path either, because that would read as working
 * while being the wrong answer for a value that was meant to say `off`.
 *
 * @param {*} value The raw field.
 * @return {string} A known engine value.
 */
function readEngine(value) {
	if (typeof value !== 'string') {
		return SPEECH_AUTO
	}
	const normalized = value.trim().toLowerCase()

	return KNOWN_ENGINES.includes(normalized) ? normalized : SPEECH_AUTO
}

/**
 * The silence timeout, defaulting when absent and clamping nonsense.
 *
 * Negative values become the default rather than 0: `0` is a meaningful setting
 * here ("never close the mic"), so silently turning `-1` into it would switch
 * off a safety behaviour on the strength of a typo.
 *
 * @param {*} value The raw field.
 * @return {number} Milliseconds.
 */
function readTimeout(value) {
	const asNumber = Number(value)

	if (Number.isFinite(asNumber) === false || asNumber < 0) {
		return DEFAULT_SILENCE_TIMEOUT
	}

	return asNumber
}

/**
 * Whether this browser can do speech recognition at all.
 *
 * 🔴 THE CONSTRUCTOR EXISTING IS NOT THE CAPABILITY. On an insecure origin
 * Chrome still exposes `webkitSpeechRecognition`, and `start()` then fires
 * `onerror: not-allowed` immediately. Secure context is checked here so the
 * decision made from this answer is about what can actually run.
 *
 * @return {boolean} True when browser recognition is usable.
 */
export function browserRecognitionUsable() {
	if (typeof window === 'undefined') {
		return false
	}
	const hasConstructor = typeof window.SpeechRecognition === 'function'
		|| typeof window.webkitSpeechRecognition === 'function'

	return hasConstructor && window.isSecureContext !== false
}

/**
 * Whether this browser can speak text.
 *
 * @return {boolean} True when synthesis is usable.
 */
export function browserSynthesisUsable() {
	return typeof window !== 'undefined'
		&& typeof window.speechSynthesis !== 'undefined'
		&& typeof window.SpeechSynthesisUtterance === 'function'
}

/**
 * Whether this browser can record audio for the local engine.
 *
 * `getUserMedia` is secure-context-only in every browser that has it, so an
 * http:// instance has neither engine — worth reporting as such rather than
 * offering a control that cannot work.
 *
 * @return {boolean} True when recording is possible.
 */
export function browserRecordingUsable() {
	return typeof window !== 'undefined'
		&& typeof window.MediaRecorder === 'function'
		&& typeof navigator !== 'undefined'
		&& !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')
}

/**
 * Decide which engine a dictation may use, and why not when it may not.
 *
 * Returns the DECISION, not a preference: the caller starts exactly what this
 * names and nothing else. `reason` is written for the person holding the
 * microphone, so it says what to do rather than which API is missing.
 *
 * @param {object} policy From {@link normalizeAgentSpeechPolicy}.
 * @param {object} availability What this browser and instance can do.
 * @param {boolean} availability.browserUsable Browser recognition is usable.
 * @param {boolean} availability.localUsable Instance speech is reachable AND recordable.
 * @return {{engine: string, reason: string}} `engine` is one of browser/local/off.
 */
export function resolveDictationEngine(policy, availability) {
	const browserUsable = availability.browserUsable === true
	const localUsable = availability.localUsable === true

	if (policy.inputEngine === SPEECH_OFF) {
		return { engine: SPEECH_OFF, reason: 'Dictation is switched off for this agent' }
	}

	if (policy.inputEngine === SPEECH_LOCAL) {
		if (localUsable === true) {
			return { engine: SPEECH_LOCAL, reason: '' }
		}

		// 🔴 The one place a fallback would be catastrophic. Say so instead.
		return {
			engine: SPEECH_OFF,
			reason: 'This agent may only use the private speech service, and it is unavailable',
		}
	}

	if (policy.inputEngine === SPEECH_BROWSER) {
		if (browserUsable === true) {
			return { engine: SPEECH_BROWSER, reason: '' }
		}

		return {
			engine: SPEECH_OFF,
			reason: 'This agent is set to the browser engine, which this browser does not offer',
		}
	}

	// auto — the browser is preferred for its speed and its live partial text,
	// and the private engine covers the browsers that have no recognition at all
	// rather than leaving those users with a dead button.
	if (browserUsable === true) {
		return { engine: SPEECH_BROWSER, reason: '' }
	}

	if (localUsable === true) {
		return { engine: SPEECH_LOCAL, reason: '' }
	}

	return { engine: SPEECH_OFF, reason: 'Dictation is not available in this browser' }
}

/**
 * Decide which engine speaks a reply.
 *
 * Same rules, different availability inputs — synthesis needs no microphone, so
 * a browser that cannot record can still speak.
 *
 * @param {object} policy From {@link normalizeAgentSpeechPolicy}.
 * @param {object} availability What this browser and instance can do.
 * @param {boolean} availability.browserUsable Browser synthesis is usable.
 * @param {boolean} availability.localUsable Instance speech is reachable.
 * @return {{engine: string, reason: string}} `engine` is one of browser/local/off.
 */
export function resolveSpeakingEngine(policy, availability) {
	const browserUsable = availability.browserUsable === true
	const localUsable = availability.localUsable === true

	if (policy.outputEngine === SPEECH_OFF) {
		return { engine: SPEECH_OFF, reason: 'Spoken replies are switched off for this agent' }
	}

	if (policy.outputEngine === SPEECH_LOCAL) {
		return localUsable
			? { engine: SPEECH_LOCAL, reason: '' }
			: { engine: SPEECH_OFF, reason: 'This agent may only use the private speech service, and it is unavailable' }
	}

	if (policy.outputEngine === SPEECH_BROWSER) {
		return browserUsable
			? { engine: SPEECH_BROWSER, reason: '' }
			: { engine: SPEECH_OFF, reason: 'This browser cannot speak text' }
	}

	if (browserUsable === true) {
		return { engine: SPEECH_BROWSER, reason: '' }
	}

	return localUsable
		? { engine: SPEECH_LOCAL, reason: '' }
		: { engine: SPEECH_OFF, reason: 'Spoken replies are not available here' }
}
