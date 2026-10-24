# Proposal: dynamic-answers-by-definition-flag

## Why

A record that keeps its data-driven answers on itself (`values.mode: "array"`) keeps all of them
in one array, so they all have one access rule. Some answers need a stricter one: dossiq keeps an
income test or an asset test readable only by a privacy group, as it was on the record the case
replaced. The schema can protect a second array; the form has to put those answers there.

## What changes

- `values.arrayKeyBy: { field, keys }` on an array-mode declaration: an answer whose definition's
  `field` reads as a key of `keys` goes to that array; every other answer stays in `arrayKey`.
- `arrayKeysOf(config)` and `answersByArrayKey(answers, config, definitions)` in
  `utils/dynamicProperties.js`.
- `storedAnswersFor` reads every routed array, on top of the stored-answer prefill
  (`dynamic-answers-on-edit`); an array the server stripped for this reader simply has no answers.
- `CnFormDialog.foldStoredAnswers` and `CnActionButtons.foldArrayAnswers` merge each group into
  its own array with `mergeValueArray`.

Generic: no app or procedure is named. Without `arrayKeyBy` nothing changes.
