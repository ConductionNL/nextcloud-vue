/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a drop on a board actually does.
 *
 * The first test is the security property: a board must be a nicer way to do a
 * thing, never a way to do a different thing. The rest are ways a drop can
 * look successful and leave the board lying about where the work is.
 */

const { DROP_OUTCOMES, runBoardDrop } = require('../../src/utils/boardTransition.js')

const card = { id: 1, status: 'open' }

describe('a drop runs the transition', () => {
	it('asks the host and never writes the status field itself', async () => {
		// Writing the field directly would put the card in the new column and
		// skip every guard, side effect and audit entry the transition
		// carries: the board would become a way past a rule the case page
		// enforces.
		const runTransition = jest.fn(async () => ({ ...card, status: 'done' }))

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'done',
			statusField: 'status',
			runTransition,
		})

		expect(runTransition).toHaveBeenCalledWith({ card, toKey: 'done' })
		expect(result.outcome).toBe(DROP_OUTCOMES.MOVED)
		expect(result.card.status).toBe('done')
		// The card handed in is untouched: nothing here mutated it.
		expect(card.status).toBe('open')
	})

	it('does nothing when the card is dropped back where it came from', async () => {
		// Transitioning to the status it already has writes an audit entry for
		// something nobody did.
		const runTransition = jest.fn()

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'open',
			statusField: 'status',
			runTransition,
		})

		expect(runTransition).not.toHaveBeenCalled()
		expect(result.outcome).toBe(DROP_OUTCOMES.NOOP)
	})
})

describe('a refusal', () => {
	it('returns the card and carries the words the guard used', async () => {
		const runTransition = async () => {
			const error = new Error('generic')
			error.response = { data: { message: 'Een zaak zonder besluit kan niet worden afgesloten.' } }
			throw error
		}

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'done',
			statusField: 'status',
			runTransition,
		})

		expect(result.outcome).toBe(DROP_OUTCOMES.REFUSED)
		expect(result.message).toBe('Een zaak zonder besluit kan niet worden afgesloten.')
		// A card left in the new column is a lie about where the work is, and
		// it survives a refresh as a surprise.
		expect(result.card.status).toBe('open')
	})

	it('says nothing rather than inventing a sentence', async () => {
		// A caller handed a made-up message cannot tell it from the guard's.
		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'done',
			statusField: 'status',
			runTransition: async () => {
				throw { response: { data: {} } }
			},
		})

		expect(result.outcome).toBe(DROP_OUTCOMES.REFUSED)
		expect(result.message).toBe('')
	})
})

describe('a card somebody else has moved', () => {
	it('is re-read and the move is not forced', async () => {
		// Two people on one board is the ordinary case. The dragger's drop was
		// a decision about a state that no longer exists.
		const runTransition = jest.fn()
		const reread = async () => ({ ...card, status: 'done' })

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'wachten',
			statusField: 'status',
			runTransition,
			reread,
		})

		expect(runTransition).not.toHaveBeenCalled()
		expect(result.outcome).toBe(DROP_OUTCOMES.STALE)
		// The card AS IT NOW IS, so the board re-renders the truth rather than
		// putting the stale copy back.
		expect(result.card.status).toBe('done')
	})

	it('goes ahead when the re-read agrees, which is the control', async () => {
		// Without this, a guard that always reported stale would pass the test
		// above and make the board read-only.
		const runTransition = jest.fn(async () => ({ ...card, status: 'wachten' }))

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'wachten',
			statusField: 'status',
			runTransition,
			reread: async () => ({ ...card }),
		})

		expect(runTransition).toHaveBeenCalled()
		expect(result.outcome).toBe(DROP_OUTCOMES.MOVED)
	})

	it('goes ahead when the re-read itself fails', async () => {
		// Unreadable is not the same as moved. Treating it as stale would
		// refuse an ordinary drop every time the network hiccuped.
		const runTransition = jest.fn(async () => ({ ...card, status: 'wachten' }))

		const result = await runBoardDrop({
			card,
			fromKey: 'open',
			toKey: 'wachten',
			statusField: 'status',
			runTransition,
			reread: async () => {
				throw new Error('offline')
			},
		})

		expect(runTransition).toHaveBeenCalled()
		expect(result.outcome).toBe(DROP_OUTCOMES.MOVED)
	})
})
