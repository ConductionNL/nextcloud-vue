/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * aiLocalDictation — dictation through the instance's own speech service.
 *
 * The browser engine hands you words as you speak them. This one cannot: it
 * records a clip, sends it to the backend, and gets a transcript back. Two
 * consequences shape everything here.
 *
 * 1. **Silence has to be measured, not received.** With `SpeechRecognition` the
 *    engine tells you when results stop arriving. Here nothing tells you
 *    anything, so the RMS level of the microphone stream is sampled and a pause
 *    is inferred from it. That is why this module owns an analyser at all.
 *
 * 2. **There is a wait at the end.** A transcript arrives seconds after the
 *    speaker stops — ~3s on a CPU-only instance with a small whisper model, far
 *    longer with a large one. The caller is told about that state
 *    (`onStateChange('transcribing')`) rather than left rendering an idle
 *    microphone while a request is in flight, because an unexplained pause reads
 *    as the feature having failed.
 *
 * Every browser API used here is injectable. Not for purity — because a
 * dictation path that cannot be tested is how the last microphone bug shipped.
 */

/**
 * Level below which the microphone is considered silent.
 *
 * ⚠️ NOT zero, and not "no samples". A live microphone in a quiet room still
 * reports a small nonzero RMS — mains hum, fan noise, the room itself — so a
 * threshold of zero means the silence is never detected and the recorder runs
 * until the user stops it by hand.
 *
 * @type {number}
 */
const SILENCE_RMS = 0.015

/**
 * How often the level is sampled, in ms.
 *
 * @type {number}
 */
const SAMPLE_INTERVAL = 100

/**
 * Create a local-engine dictation session.
 *
 * @param {object} options Options.
 * @param {Function} options.transcribe `(Blob) => Promise<{text: string}>`.
 * @param {number} options.silenceTimeout Pause before the clip is closed, ms. 0 disables.
 * @param {Function} options.onTranscript Called with the transcribed text.
 * @param {Function} options.onError Called with a human-readable failure.
 * @param {Function} options.onStateChange Called with 'recording' | 'transcribing' | 'idle'.
 * @param {object} [options.media] Injectable browser plumbing, for tests.
 * @return {{start: Function, stop: Function, isActive: Function}} The session.
 */
export function createLocalDictation(options) {
	const {
		transcribe,
		silenceTimeout,
		onTranscript,
		onError,
		onStateChange,
		media = defaultMedia(),
	} = options

	let stream = null
	let recorder = null
	let analyser = null
	let audioContext = null
	let sampleTimer = null
	let silentFor = 0
	let heardSpeech = false
	let active = false
	let chunks = []

	/**
	 * Begin recording.
	 *
	 * @return {Promise<void>} Resolves once recording has started.
	 */
	async function start() {
		if (active === true) {
			return
		}
		try {
			stream = await media.getUserMedia({ audio: true })
		} catch (e) {
			// A denied permission and an absent microphone arrive the same way.
			onError('Microphone access was refused')

			return
		}

		chunks = []
		silentFor = 0
		heardSpeech = false
		active = true

		recorder = media.createRecorder(stream)
		recorder.ondataavailable = (event) => {
			if (event && event.data && event.data.size > 0) {
				chunks.push(event.data)
			}
		}
		recorder.onstop = () => {
			finish()
		}
		recorder.start()
		onStateChange('recording')

		startLevelSampling()
	}

	/**
	 * Stop recording. The transcript arrives later, through `onTranscript`.
	 *
	 * @return {void}
	 */
	function stop() {
		if (active === false) {
			return
		}
		stopLevelSampling()
		if (recorder !== null && recorder.state !== 'inactive') {
			recorder.stop()

			return
		}
		finish()
	}

	/**
	 * Whether a recording is in progress.
	 *
	 * @return {boolean} True while recording.
	 */
	function isActive() {
		return active
	}

	/**
	 * Watch the microphone level and close the clip after a pause.
	 *
	 * ⚠️ THE COUNTDOWN ONLY RUNS ONCE SPEECH HAS BEEN HEARD. Starting it
	 * immediately would end the recording of someone who pressed record and then
	 * took a breath — and unlike the browser engine, there is no `no-speech`
	 * error here to explain what happened. They would just get an empty
	 * transcript.
	 *
	 * @return {void}
	 */
	function startLevelSampling() {
		if (silenceTimeout <= 0) {
			return
		}
		const built = media.createAnalyser(stream)

		if (built === null) {
			// No analyser: the clip simply runs until stopped by hand. Degrading
			// to "no automatic stop" is right; degrading to "stop immediately"
			// would silently truncate every dictation.
			return
		}
		analyser = built.analyser
		audioContext = built.context

		sampleTimer = setInterval(() => {
			const level = media.readLevel(analyser)

			if (level > SILENCE_RMS) {
				heardSpeech = true
				silentFor = 0

				return
			}
			if (heardSpeech === false) {
				return
			}
			silentFor += SAMPLE_INTERVAL

			if (silentFor >= silenceTimeout) {
				stop()
			}
		}, SAMPLE_INTERVAL)
	}

	/**
	 * Tear down the level sampling.
	 *
	 * @return {void}
	 */
	function stopLevelSampling() {
		if (sampleTimer !== null) {
			clearInterval(sampleTimer)
			sampleTimer = null
		}
		if (audioContext !== null && typeof audioContext.close === 'function') {
			audioContext.close()
			audioContext = null
		}
		analyser = null
	}

	/**
	 * Release the microphone, send the clip, report the transcript.
	 *
	 * ⚠️ THE MICROPHONE IS RELEASED BEFORE THE UPLOAD, NOT AFTER. Transcription
	 * can take seconds; holding the tracks open through it leaves the browser's
	 * recording indicator lit while nothing is being recorded, which is exactly
	 * the "is it still listening?" confusion this whole change is about.
	 *
	 * @return {Promise<void>} Resolves when the transcript has been reported.
	 */
	async function finish() {
		if (active === false) {
			return
		}
		active = false
		stopLevelSampling()
		releaseStream()

		if (chunks.length === 0) {
			onStateChange('idle')

			return
		}

		onStateChange('transcribing')
		try {
			const result = await transcribe(new Blob(chunks, { type: chunks[0].type || 'audio/webm' }))
			const text = ((result && result.text) || '').trim()

			if (text !== '') {
				onTranscript(text)
			}
		} catch (e) {
			onError('Could not transcribe the recording')
		} finally {
			chunks = []
			onStateChange('idle')
		}
	}

	/**
	 * Stop every track, so the browser's recording indicator goes out.
	 *
	 * @return {void}
	 */
	function releaseStream() {
		if (stream === null) {
			return
		}
		const tracks = (typeof stream.getTracks === 'function') ? stream.getTracks() : []
		tracks.forEach((track) => {
			if (typeof track.stop === 'function') {
				track.stop()
			}
		})
		stream = null
		recorder = null
	}

	return { start, stop, isActive }
}

/**
 * The real browser plumbing.
 *
 * @return {object} Media helpers backed by the browser APIs.
 */
function defaultMedia() {
	return {
		getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),

		createRecorder: (stream) => new window.MediaRecorder(stream),

		createAnalyser: (stream) => {
			const AudioContextCtor = window.AudioContext || window.webkitAudioContext

			if (typeof AudioContextCtor !== 'function') {
				return null
			}
			const context = new AudioContextCtor()
			const analyser = context.createAnalyser()
			analyser.fftSize = 2048
			context.createMediaStreamSource(stream).connect(analyser)

			return { analyser, context }
		},

		readLevel: (analyser) => {
			const samples = new Float32Array(analyser.fftSize)

			// `getFloatTimeDomainData` gives the waveform; the frequency-domain
			// variant would answer a different question (which pitches are
			// present) and is not a level.
			analyser.getFloatTimeDomainData(samples)

			let sum = 0
			for (let i = 0; i < samples.length; i++) {
				sum += (samples[i] * samples[i])
			}

			return Math.sqrt(sum / samples.length)
		},
	}
}
