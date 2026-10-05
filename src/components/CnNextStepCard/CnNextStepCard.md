A step with one thing done and two to go:

```vue
<CnNextStepCard
  title="What now? Step 2: handling"
  :items="[
    { label: 'Receipt confirmed to the resident', done: true },
    { label: 'Review the 3 documents that are still open', hint: '2 of 5 done' },
    { label: 'Draft the decision' },
  ]"
  action-label="Continue reviewing"
  after="Then: step 3, decision" />
```

A checklist only, with no button:

```vue
<CnNextStepCard
  :items="[
    { label: 'Inform the resident', done: true },
    { label: 'Archive the case', done: true },
  ]" />
```

As a page section, with the button waiting for its request. `title-tag` sets the heading level, `action-id` gives the button an id a skip link can target, and `done-label` and `todo-label` are the states a screen reader hears:

```vue
<CnNextStepCard
  title="What now?"
  title-tag="h2"
  action-label="Publish"
  action-id="case-primary-action"
  :action-disabled="true"
  done-label="Klaar"
  todo-label="Nog doen"
  :items="[
    { label: 'Check what can be made public', done: true },
    { label: 'Create the publication' },
  ]" />
```
