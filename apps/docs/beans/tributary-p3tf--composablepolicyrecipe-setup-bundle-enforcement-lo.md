---
# tributary-p3tf
title: 'composablePolicyRecipe: setup bundle + enforcement logic'
status: todo
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:34:51Z
parent: tributary-eznl
---

composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? }) → { forwardConfig, preValidation, preValidationInit, postValidation, postValidationInit }. Determines settlement shape from forwardConfig (deliver-no-transform / deliver-transform / act mode). Enforcement: throw if act mode + no post (unless allowUnsafeActMode), warn if deliver-transform + no post, warn if no pre. Fills disabled spec/init for missing pre/post. In packages/sdk/src/.
