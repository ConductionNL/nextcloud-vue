# The board stepper is exported and can reach ahead

## Why
PqNieuwsbriefWizard draws the board stepper (28px circles, a green check on a finished step, the label beside it),
the same one CnWizardDialog draws for the Dq wizards. Pipelinq's newsletter wizard drew its own 18px step links
because CnStepper was internal. That wizard also lets the user go back to a step and then forward again to any step
already filled in, which CnStepper could not do: only finished steps (before the current one) were buttons.

## What changes
- CnStepper is exported from the library.
- CnStepper gets `reachableIndex`: with `allowJumpBack`, every step up to it (other than the current one) is a button,
  so a step after the current one that was already reached stays one press away. Unset, only the finished steps are
  buttons, as before.
No schema change.
