# createJourneyRunStore

The journey run store: the only writer of a journey's answers. `CnJourney` and `CnJourneyDialog` call it; components never call the run API directly.

```js
const store = createJourneyRunStore({ endpoint: '/apps/openregister/api/journey-runs', journeyId: 'permit' })
await store.resume(runId)            // restore answers and the recorded step
await store.save('address', answers, 'review')  // after each completed step
await store.submit()
```

`store.state` is reactive: `{ runId, journeyId, answers, position, status, failures, saving, error }`. The run is created on the first `save`, so looking at a journey writes nothing. `resume(runId)` does nothing when the store already holds that run, which is how the dialog keeps its answers across close and reopen. `report(error, condition)` records a branch rule that could not be evaluated.

Requests go through `cnFetchJson`: `POST {endpoint}`, `GET|PUT {endpoint}/{id}`, `POST {endpoint}/{id}/submit`, `POST {endpoint}/{id}/failures`.
