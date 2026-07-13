---
# tributary-cgy2
title: Replace openapi.yaml in docs with URL to api.tributary.so once new api is deployed
status: todo
type: task
priority: normal
created_at: 2026-06-30T08:58:15Z
updated_at: 2026-07-06T13:58:09Z
---

We need the openapi.yaml file to build the docs.
Currently its commited into the git tree, but instead, the
mkdocs plugin allows to load it from remote.

once the new api is deployed, it exposes /openapi.yaml as router
so we can dynamically load on docs bulding.
