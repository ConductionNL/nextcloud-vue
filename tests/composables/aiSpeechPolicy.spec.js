/**
 * Tests for aiSpeechPolicy — which speech engine an agent is allowed to use.
 *
 * The rule under test is a privacy guarantee, not a preference: an agent pinned
 * to the instance's own speech service must never be served by the browser's,
 * because the browser's is Google's in Chrome, Apple's in Safari, and the whole
 * reason somebody pinned the agent is that its subject matter must not go there.
 */

import {
	SPEECH_AUTO,
	SPEECH_BROWSER,
	SPEECH_LOCAL,
	SPEECH_OFF,
	DEFAULT_SILENCE_TIMEOUT,
	normalizeAgentSpeechPolicy,
	resolveDictationEngine,
	resolveSpeakingEngine,
} from '../../src/composables/aiSpeechPolicy.js'

describe('normalizeAgentSpeechPolicy', () => {
	it('defaults an agent that carries no voice fields at all', () => {
		expect(normalizeAgentSpeechPolicy({ name: 'Oude agent' })).toEqual({
			inputEngine: SPEECH_AUTO,
			outputEngine: SPEECH_AUTO,
			silenceTimeout: DEFAULT_SILENCE_TIMEOUT,
			conversationEnabled: false,
		})
	})

	it('defaults null and nonsense rather than throwing', () => {
		expect(normalizeAgentSpeechPolicy(null).inputEngine).toBe(SPEECH_AUTO)
		expect(normalizeAgentSpeechPolicy('nope').inputEngine).toBe(SPEECH_AUTO)
	})

	it('reads the declared values, case-insensitively', () => {
		const policy = normalizeAgentSpeechPolicy({
			voiceInputEngine: 'LOCAL',
			voiceOutputEngine: 'off',
			voiceSilenceTimeout: 4000,
			voiceConversationEnabled: true,
		})

		expect(policy).toEqual({
			inputEngine: SPEECH_LOCAL,
			outputEngine: SPEECH_OFF,
			silenceTimeout: 4000,
			conversationEnabled: true,
		})
	})

	it('does NOT read talkEnabled — that field is about Talk rooms, not microphones', () => {
		const policy = normalizeAgentSpeechPolicy({ talkEnabled: true })

		expect(policy.conversationEnabled).toBe(false)
	})

	it('keeps 0 as a real timeout but rejects negatives', () => {
		expect(normalizeAgentSpeechPolicy({ voiceSilenceTimeout: 0 }).silenceTimeout).toBe(0)
		expect(normalizeAgentSpeechPolicy({ voiceSilenceTimeout: -1 }).silenceTimeout).toBe(DEFAULT_SILENCE_TIMEOUT)
	})

	it('falls back to auto on an unrecognised engine rather than guessing', () => {
		expect(normalizeAgentSpeechPolicy({ voiceInputEngine: 'whisper' }).inputEngine).toBe(SPEECH_AUTO)
	})
})

describe('resolveDictationEngine', () => {
	const both = { browserUsable: true, localUsable: true }
	const neither = { browserUsable: false, localUsable: false }

	it('🔴 NEVER falls back to the browser for a local-pinned agent', () => {
		const decision = resolveDictationEngine(
			{ inputEngine: SPEECH_LOCAL },
			{ browserUsable: true, localUsable: false },
		)

		// The browser engine is RIGHT THERE and usable. It must not be chosen.
		expect(decision.engine).toBe(SPEECH_OFF)
		expect(decision.engine).not.toBe(SPEECH_BROWSER)
		expect(decision.reason).toMatch(/private/i)
	})

	it('uses the local engine for a local-pinned agent when it is available', () => {
		expect(resolveDictationEngine({ inputEngine: SPEECH_LOCAL }, both).engine).toBe(SPEECH_LOCAL)
	})

	it('does not silently promote a browser-pinned agent to the local engine either', () => {
		const decision = resolveDictationEngine(
			{ inputEngine: SPEECH_BROWSER },
			{ browserUsable: false, localUsable: true },
		)

		expect(decision.engine).toBe(SPEECH_OFF)
		expect(decision.reason).not.toBe('')
	})

	it('prefers the browser on auto, for its speed and live partial text', () => {
		expect(resolveDictationEngine({ inputEngine: SPEECH_AUTO }, both).engine).toBe(SPEECH_BROWSER)
	})

	it('covers Firefox on auto — no recognition API, so the local engine carries it', () => {
		const decision = resolveDictationEngine(
			{ inputEngine: SPEECH_AUTO },
			{ browserUsable: false, localUsable: true },
		)

		expect(decision.engine).toBe(SPEECH_LOCAL)
		expect(decision.reason).toBe('')
	})

	it('offers nothing, with a reason, when neither engine can run', () => {
		const decision = resolveDictationEngine({ inputEngine: SPEECH_AUTO }, neither)

		expect(decision.engine).toBe(SPEECH_OFF)
		expect(decision.reason).not.toBe('')
	})

	it('honours off even when both engines are available', () => {
		expect(resolveDictationEngine({ inputEngine: SPEECH_OFF }, both).engine).toBe(SPEECH_OFF)
	})
})

describe('resolveSpeakingEngine', () => {
	it('never speaks a local-pinned agent’s reply through the browser', () => {
		const decision = resolveSpeakingEngine(
			{ outputEngine: SPEECH_LOCAL },
			{ browserUsable: true, localUsable: false },
		)

		expect(decision.engine).toBe(SPEECH_OFF)
	})

	it('speaks through the browser on auto', () => {
		const decision = resolveSpeakingEngine(
			{ outputEngine: SPEECH_AUTO },
			{ browserUsable: true, localUsable: true },
		)

		expect(decision.engine).toBe(SPEECH_BROWSER)
	})

	it('falls back to the instance when the browser cannot speak', () => {
		const decision = resolveSpeakingEngine(
			{ outputEngine: SPEECH_AUTO },
			{ browserUsable: false, localUsable: true },
		)

		expect(decision.engine).toBe(SPEECH_LOCAL)
	})
})
