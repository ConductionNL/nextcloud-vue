/**
 * Jest mock for @microsoft/fetch-event-source.
 *
 * Provides a controllable fetchEventSource that tests can override with
 * jest.mock('@microsoft/fetch-event-source', factory).
 * The default implementation is a no-op that resolves immediately.
 */
const fetchEventSource = jest.fn(() => Promise.resolve())

module.exports = {
	__esModule: true,
	fetchEventSource,
}
