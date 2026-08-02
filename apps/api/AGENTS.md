# Tributary API — Agent Guidelines

## OpenAPI is not optional. Every route ships documented.

The `/openapi.json`, `/openapi.yaml`, and `/docs` (Swagger UI) endpoints are
**generated at runtime** by [swagger-jsdoc] from `@openapi` JSDoc annotations
on the Express routers in `src/routes/*.ts`. There is no hand-written spec
file to edit — the annotations **are** the spec.

> Source of truth: [`src/openapi.ts`](src/openapi.ts) — the `definition`
> block (info, servers, components, tags) + `apis: ["./src/routes/*.ts"]`
> glob that scans every router for `@openapi` blocks.

### The rule

**When you add or change a route in `src/routes/*.ts`, you MUST:**

1. **Annotate it** with a `@openapi` JSDoc block immediately above the
   `router.get/post/put/delete(...)` call. No annotation ⇒ the route is
   invisible to `/openapi.yaml`, `/docs`, and every downstream client
   generator. An invisible route does not exist as far as integrators are
   concerned.
2. **Register its tag** in the `tags:` array in `src/openapi.ts` if it's a
   new route family. Reuse an existing tag (e.g. `Events`) when the route
   belongs to an existing family.
3. **Reuse the shared schemas** in `components.schemas` (`Error`, `Webhook`,
   …) via `$ref: '#/components/schemas/<Name>'` rather than re-declaring
   error envelopes inline. Add a new component schema only if the shape is
   referenced by more than one operation.
4. **Verify** by booting the server (`pnpm dev`) and confirming the route
   appears at `http://localhost:3002/openapi.yaml` and in the `/docs` UI.
   A one-liner that loads the spec without a server:
   ```bash
   npx tsx -e "import('./src/openapi').then(m => console.log(Object.keys(m.openapiSpec.paths).filter(p => p.includes('<your-path>'))))"
   ```

### Annotation template

Mirror the existing routers (canonical reference: [`src/routes/assets.ts`](src/routes/assets.ts)).
Minimum viable block:

```js
/**
 * @openapi
 * /v1/<family>/<path>:
 *   get:                                  // or post/put/delete
 *     summary: One-line description
 *     description: >
 *       Longer prose. Mention auth, rate limits, caching, failure stance
 *       (e.g. "ADR-0028 D3: empty, not 500").
 *     tags: [<Family>]                    // MUST exist in openapi.ts tags[]
 *     operationId: uniqueCamelCaseId      // used by client generators
 *     parameters:
 *       - in: query                       // or path/header
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         description: What it does.
 *     responses:
 *       200:
 *         description: Success.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { ... }
 *                 timestamp: { type: integer }
 *       400:
 *         description: Bad input.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Rate limited.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/path", asyncHandler(async (req, res) => { ... }));
```

### Common gotchas

- **Path must include the `/v1` prefix** in the annotation (the app mounts
  routers under `/v1` in `src/index.ts`). A path written as `/pools/search`
  instead of `/v1/pools/search` will be served correctly but documented at
  the wrong URL.
- **`tags` must match a tag defined in `src/openapi.ts`.** An undefined tag
  renders, but breaks the `/docs` UI's grouping and confuses client
  generators. Add new tags to the `tags:` array in the same PR.
- **Auth**: if the route requires the admin API key, add:
  ````yaml
  *     security:
  *       - AdminApiKey: []
  * ```
  The `AdminApiKey` security scheme is already declared in `components`.
  ````
- **Rate limits**: every public router applies `ipRateLimit({ windowMs: 60_000, maxRequests: 120 })`.
  Document a `429` response on rate-limited routes.
- **Don't reference undefined component schemas.** A `$ref` to a schema not
  present in `components.schemas` produces a broken spec. If you need a new
  shared shape, add it to `components.schemas` in `src/openapi.ts`.

### Verifying the full spec

Before opening a PR that touches any router:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Confirm every mounted route has an annotation (no output = all good)
npx tsx -e "
  const spec = (await import('./src/openapi')).openapiSpec;
  const documented = new Set(Object.keys(spec.paths));
  console.log('Documented paths:', documented.size);
  [...documented].sort().forEach(p => console.log(' ', p));
"

# 3. Lint
pnpm --filter @tributary-so/api run lint
```

If you add a `router.use("/foo", fooRouter)` line in `src/routes/index.ts`
and forget the annotation, the route will work in production but be silently
absent from the published API contract. That is a bug. Don't ship it.

---

[swagger-jsdoc]: https://github.com/Surnet/swagger-jsdoc
