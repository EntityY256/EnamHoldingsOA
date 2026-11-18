# Sub-agent · Next.js 16 docs summary

[index](README.md)

A read-only Explore sub-agent, launched in Part 1 to read the Next.js 16 docs bundled in `node_modules` (the installed version is newer than the model's training data) and report the API changes before any code was written.



<a id="m1"></a>

### 🤖 Main agent → sub-agent · 16 Nov 02:46 IST

> I'm about to write code in a Next.js 16.4.6 app (React 19.3, Tailwind 4.3) at ~\EnamHoldingsOA\web. Its next.config.ts has `cacheComponents: true` and `partialPrefetching: true`. My training knowledge is from Next 14/15, so I need a precise, code-level summary of what's different. The official docs are bundled at ~\EnamHoldingsOA\web\node_modules\next\dist\docs\ (folders 01-app, 02-pages, 03-architecture, index.md). Read only from there (App Router docs; ignore 02-pages).
> 
> Report back concisely (aim for ~120 lines max), with short code snippets copied from the docs where useful, on exactly these topics:
> 1. Caching with cacheComponents: the `"use cache"` directive, `cacheLife`, `cacheTag`/`revalidateTag`/`updateTag`, how `fetch` caching behaves now, what counts as dynamic, and when a `<Suspense>` boundary is REQUIRED (e.g. errors like "uncached data accessed outside Suspense"). How to make a page/route that reads a local JSON file and calls external APIs work without build errors.
> 2. Dynamic route params/searchParams in pages and route handlers (are they Promises? the `PageProps<'/route/[id]'>` / `LayoutProps` / `RouteContext` global type helpers — exact usage).
> 3. Route handlers (app/api/.../route.ts): signature, streaming a response (ReadableStream / text streaming), and route segment config such as `maxDuration`, `runtime`, `dynamic` — which of these are still allowed or are now errors under cacheComponents.
> 4. Server Actions: any changes in usage.
> 5. `connection()`, `cookies()`, `headers()` — sync or async, and how they interact with cacheComponents.
> 6. Metadata/viewport API for a mobile-first PWA (viewport export, themeColor, manifest file convention `app/manifest.ts`).
> 7. Anything else flagged as a breaking change or deprecation in the docs that would bite someone writing App Router code from Next 15 habits (e.g. middleware renamed, `next lint` removed, image config changes).
> 
> For each topic, cite the doc file path you read it from. Don't write any code to the project; this is read-only research.


<a id="m2"></a>

**🤖 Claude:**

I'll start by mapping the docs directory structure.

<a id="m3"></a>

**▶ Bash:** List all doc files excluding pages router

```bash
cd ~/EnamHoldingsOA/web/node_modules/next/dist/docs && find . -path ./02-pages -prune -o -type f -print | sort
```

<a id="m4"></a>

**▶ Bash:** Show next config, package.json, next version

```bash
cat ~/EnamHoldingsOA/web/next.config.ts; cat ~/EnamHoldingsOA/web/package.json; cat ~/EnamHoldingsOA/web/node_modules/next/package.json | head -5
```

<details><summary>Result (48 lines)</summary>

```
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.4.6",
    "react": "19.3.0",
… (18 more lines)
```

</details>

<details><summary>Result (308 lines)</summary>

```
./01-app/01-getting-started/01-installation.md
./01-app/01-getting-started/02-project-structure.md
./01-app/01-getting-started/03-layouts-and-pages.md
./01-app/01-getting-started/04-linking-and-navigating.md
./01-app/01-getting-started/05-server-and-client-components.md
./01-app/01-getting-started/06-fetching-data.md
./01-app/01-getting-started/07-mutating-data.md
./01-app/01-getting-started/08-caching.md
./01-app/01-getting-started/09-revalidating.md
./01-app/01-getting-started/10-error-handling.md
./01-app/01-getting-started/11-css.md
./01-app/01-getting-started/12-images.md
./01-app/01-getting-started/13-fonts.md
./01-app/01-getting-started/14-metadata-and-og-images.md
./01-app/01-getting-started/15-route-handlers.md
./01-app/01-getting-started/16-proxy.md
./01-app/01-getting-started/17-deploying.md
./01-app/01-getting-started/18-upgrading.md
./01-app/01-getting-started/index.md
./01-app/02-guides/adopting-partial-prefetching.md
./01-app/02-guides/ai-agents.md
./01-app/02-guides/analytics.md
./01-app/02-guides/authentication-with-cache-components.md
./01-app/02-guides/authentication.md
./01-app/02-guides/backend-for-frontend.md
./01-app/02-guides/building.md
./01-app/02-guides/caching-without-cache-components.md
./01-app/02-guides/cdn-caching.md
./01-app/02-guides/ci-build-caching.md
./01-app/02-guides/client-side-data-fetching/index.md
… (278 more lines)
```

</details>


<a id="m7"></a>

**🤖 Claude:**

Now reading core caching docs in parallel.

<a id="m8"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\01-getting-started\08-caching.md`

<details><summary>Result (618 lines)</summary>

```
1	---
2	title: Caching
3	description: Learn how to cache data and UI in Next.js
4	related:
5	  title: Next Steps
6	  description: Learn more about revalidation and the APIs mentioned on this page.
7	  links:
8	    - app/getting-started/revalidating
9	    - app/api-reference/directives/use-cache
10	    - app/api-reference/config/next-config-js/cacheComponents
11	    - app/guides/instant-navigation
12	---
13	
14	> This page covers caching with [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents), enabled by setting [`cacheComponents: true`](/docs/app/api-reference/config/next-config-js/cacheComponents) in your `next.config.ts` file. If you're not using Cache Components, see the [Caching and Revalidating (Previous Model)](/docs/app/guides/caching-without-cache-components) guide.
15	
16	Caching is a technique for storing the result of data fetching and other computations so that future requests for the same data can be served faster, without doing the work again.
17	
18	## Enabling Cache Components
19	
20	New App Router apps created with the recommended [`create-next-app`](/docs/app/api-reference/cli/create-next-app) defaults already have Cache Components and Partial Prefetching enabled.
21	
22	To enable it in an existing or manually created app, add the [`cacheComponents`](/docs/app/api-reference/config/next-config-js/cacheComponents) and [`partialPrefetching`](/docs/app/api-reference/config/next-config-js/partialPrefetching) options to your Next config file:
23	
24	ˋˋˋts filename="next.config.ts" switcher
25	import type { NextConfig } from 'next'
26	
27	const nextConfig: NextConfig = {
28	  cacheComponents: true,
29	  partialPrefetching: true,
30	}
… (588 more lines)
```

</details>

<a id="m10"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\05-config\01-next-config-js\cacheComponents.md`

<details><summary>Result (68 lines)</summary>

```
1	---
2	title: cacheComponents
3	description: Learn how to enable the cacheComponents flag in Next.js.
4	related:
5	  links:
6	    - app/getting-started/caching
7	    - app/guides/incremental-static-regeneration-cache-components
8	    - app/api-reference/directives/use-cache
9	    - app/api-reference/directives/use-cache-remote
10	---
11	
12	Cache Components enables component and function-level caching using the [`use cache`](/docs/app/api-reference/directives/use-cache) directive. Data fetching is dynamic by default, and you choose what to cache at the page, component, or function level. Next.js prerenders a static HTML shell that is served immediately while dynamic content streams in when ready, letting you mix static and dynamic content within a single route.
13	
14	## Usage
15	
16	To enable the `cacheComponents` flag, set it to `true` in your `next.config.ts` file, together with [`partialPrefetching`](/docs/app/api-reference/config/next-config-js/partialPrefetching):
17	
18	ˋˋˋts filename="next.config.ts"
19	import type { NextConfig } from 'next'
20	
21	const nextConfig: NextConfig = {
22	  cacheComponents: true,
23	  partialPrefetching: true,
24	}
25	
26	export default nextConfig
27	ˋˋˋ
28	
29	Set `partialPrefetching` explicitly. Leaving it unset logs a warning, because the first release of Cache Components did not include Partial Prefetching. Set it to `false` only while [migrating an app that adopted Cache Components before Partial Prefetching](/docs/app/guides/adopting-partial-prefetching). Both features will be enabled everywhere in the next major release, and the options will be removed.
30	
… (38 more lines)
```

</details>

<a id="m12"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\upgrading\version-16.md`

<details><summary>Result (1311 lines)</summary>

```
1	---
2	title: How to upgrade to version 16
3	nav_title: Version 16
4	description: Upgrade your Next.js Application from Version 15 to 16.
5	---
6	
7	{/* The content of this doc is shared between the app and pages router. You can use the `<PagesOnly>Content</PagesOnly>` component to add content that is specific to the Pages Router. Any shared content should not be wrapped in a component. */}
8	
9	## Use a coding agent (recommended)
10	
11	Run the latest upgrade CLI from your app's directory:
12	
13	ˋˋˋbash filename="Terminal"
14	npx next@canary upgrade --agent=latest
15	ˋˋˋ
16	
17	The CLI prepares the Next.js 16 migration guides and codemod command for the agent, then asks it to apply the changes and verify the app. See [Upgrade with a coding agent](/docs/app/guides/upgrading/agent-upgrade) for details.
18	
19	## Or upgrade manually
20	
21	Upgrading manually follows a few steps, in order:
22	
23	1. [Set up AI agent docs](#set-up-ai-agent-docs) if you use a coding agent now or want future agent work grounded in version-matched docs.
24	2. [Run the upgrade codemod](#using-the-codemod).
25	3. If you prefer not to run the codemod, [install packages manually](#install-packages-manually).
26	4. Continue through the breaking changes below, run the relevant checks, and fix any remaining issues.
27	
28	## Set up AI agent docs
29	
30	Before upgrading, point `AGENTS.md` at version-matched Next.js docs so a coding agent can help with the remaining steps:
… (1281 more lines)
```

</details>


<a id="m14"></a>

**🤖 Claude:**

Reading the migration guide, route handlers, and route segment config next.

<a id="m15"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\migrating-to-cache-components.md`

<details><summary>Result (993 lines)</summary>

```
1	---
2	title: Migrating to Cache Components
3	nav_title: Migrating to Cache Components
4	description: Learn how to migrate from route segment configs to Cache Components in Next.js.
5	related:
6	  title: Next Steps
7	  description: Learn about other behavior changes when Cache Components is enabled.
8	  links:
9	    - app/guides/optimizing-the-static-shell
10	    - app/guides/instant-navigation
11	    - app/guides/preserving-ui-state
12	    - app/guides/incremental-static-regeneration-cache-components
13	    - app/getting-started/caching
14	---
15	
16	When [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents) is enabled, route segment configs like `dynamic`, `revalidate`, and `fetchCache` are replaced by [`use cache`](/docs/app/api-reference/directives/use-cache) and [`cacheLife`](/docs/app/api-reference/functions/cacheLife).
17	
18	The migration is driven by **instant navigation validation**. With Cache Components enabled, Next.js validates in development whether navigating into each route renders instantly, and surfaces the code that would block it as an error or insight.
19	
20	## Use the adoption skill (recommended)
21	
22	The [`next-cache-components-adoption`](/docs/app/guides/ai-agents#next-cache-components-adoption) skill drives this migration with a coding agent, one feature at a time, checking in at every feature boundary. It supports two modes:
23	
24	- **Incremental.** Opens a single mechanical PR that opts every route out of validation, then ships each feature as a follow-up PR. This automates the [Adopting incrementally](#adopting-incrementally) flow below.
25	- **Direct.** Adopts every route in place on one branch.
26	
27	Install the skill:
28	
29	ˋˋˋbash filename="Terminal"
30	npx skills add vercel/next.js --skill next-cache-components-adoption
… (963 more lines)
```

</details>

<a id="m17"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\01-getting-started\15-route-handlers.md`

<details><summary>Result (203 lines)</summary>

```
1	---
2	title: Route Handlers
3	nav_title: Route Handlers
4	description: Create custom request handlers with Next.js Route Handlers using the Web Request and Response APIs.
5	related:
6	  title: API Reference
7	  description: Learn more about Route Handlers
8	  links:
9	    - app/api-reference/file-conventions/route
10	    - app/guides/backend-for-frontend
11	---
12	
13	## Route Handlers
14	
15	Route Handlers allow you to create custom request handlers for a given route using the Web [Request](https://developer.mozilla.org/docs/Web/API/Request) and [Response](https://developer.mozilla.org/docs/Web/API/Response) APIs.
16	
17	<Image
18	  alt="Route.js Special File"
19	  srcLight="/docs/light/route-special-file.png"
20	  srcDark="/docs/dark/route-special-file.png"
21	  width="1600"
22	  height="444"
23	/>
24	
25	> **Good to know**: Route Handlers are only available inside the `app` directory. They are the equivalent of [API Routes](/docs/pages/building-your-application/routing/api-routes) inside the `pages` directory meaning you **do not** need to use API Routes and Route Handlers together.
26	
27	### Convention
28	
29	Route Handlers are defined in a [`route.js|ts` file](/docs/app/api-reference/file-conventions/route) inside the `app` directory:
30	
… (173 more lines)
```

</details>

<a id="m19"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\02-route-segment-config\index.md`

<details><summary>Result (28 lines)</summary>

```
1	---
2	title: Route Segment Config
3	description: Learn about how to configure options for Next.js route segments.
4	---
5	
6	The Route Segment Config options allow you to configure the behavior of a [Page](/docs/app/api-reference/file-conventions/page), [Layout](/docs/app/api-reference/file-conventions/layout), or [Route Handler](/docs/app/api-reference/file-conventions/route) by directly exporting the following variables:
7	
8	| Option                                                                                             | Type                                                              | Default                    |
9	| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
10	| [`dynamicParams`](/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)     | `boolean`                                                         | `true`                     |
11	| [`runtime`](/docs/app/api-reference/file-conventions/route-segment-config/runtime)                 | `'nodejs' \| 'edge' (deprecated)`                                 | `'nodejs'`                 |
12	| [`preferredRegion`](/docs/app/api-reference/file-conventions/route-segment-config/preferredRegion) | `'auto' \| 'global' \| 'home' \| string \| string[] (deprecated)` | `'auto'`                   |
13	| [`maxDuration`](/docs/app/api-reference/file-conventions/route-segment-config/maxDuration)         | `number`                                                          | Set by deployment platform |
14	
15	With [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents) enabled, pages and layouts also support the following option:
16	
17	| Option                                                                                       | Type                                                               | Default  |
18	| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
19	| [`ensureStatic`](/docs/app/api-reference/file-conventions/route-segment-config/ensureStatic) | `'auto'` \| `'shell'` \| `'prefetch'` \| `'navigation'` \| `false` | `'auto'` |
20	
21	## Version History
22	
23	| Version      |                                                                                                                                                                                                                                                                                                |
24	| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
25	|
… (truncated)
```

</details>


<a id="m21"></a>

**🤖 Claude:**

Now route.md API reference (streaming), maxDuration, runtime, and use-cache.

<a id="m22"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\route.md` output_mode=`content`

<details><summary>Result (22 lines)</summary>

```
20:## Reference
22:### HTTP Methods
60:### Parameters
62:#### `request` (optional)
80:#### `context` (optional)
105:### Route Context Helper
123:## Examples
125:### Cookies
199:### Headers
268:### Revalidating Cached Data
294:### Redirects
312:### Dynamic Route Segments
337:#### Static Generation with `generateStaticParams`
345:### URL Query Parameters
367:### Streaming
483:### Request Body
501:### Request Body FormData
525:### CORS
559:### Webhooks
599:### Non-UI Responses
640:### Segment Config Options
664:## Version History
```

</details>

<a id="m24"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\02-route-segment-config\maxDuration.md`

<details><summary>Result (25 lines)</summary>

```
1	---
2	title: maxDuration
3	description: API reference for the maxDuration route segment config option.
4	---
5	
6	The `maxDuration` option allows you to set the maximum execution time (in seconds) for server-side logic in a route segment. Deployment platforms can use `maxDuration` from the Next.js build output to add specific execution limits.
7	
8	ˋˋˋtsx filename="layout.tsx | page.tsx | route.ts" switcher
9	export const maxDuration = 5
10	ˋˋˋ
11	
12	ˋˋˋjs filename="layout.js | page.js | route.js" switcher
13	export const maxDuration = 5
14	ˋˋˋ
15	
16	## Server Actions
17	
18	If using [Server Actions](/docs/app/getting-started/mutating-data), set the `maxDuration` at the page level to change the default timeout of all Server Actions used on the page.
19	
20	## Version History
21	
22	| Version    | Changes                   |
23	| ---------- | ------------------------- |
24	| `v13.4.10` | `maxDuration` introduced. |
25	
```

</details>

<a id="m26"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\02-route-segment-config\runtime.md`

<details><summary>Result (26 lines)</summary>

```
1	---
2	title: runtime
3	description: API reference for the runtime route segment config option.
4	---
5	
6	The `runtime` option allows you to select the JavaScript runtime used for rendering your route.
7	
8	ˋˋˋtsx filename="layout.tsx | page.tsx | route.ts" switcher
9	export const runtime = 'nodejs'
10	// 'nodejs'
11	ˋˋˋ
12	
13	ˋˋˋjs filename="layout.js | page.js | route.js" switcher
14	export const runtime = 'nodejs'
15	// 'nodejs'
16	ˋˋˋ
17	
18	- **`'nodejs'`** (default)
19	- **`'edge'`** (deprecated)
20	
21	> **Good to know**:
22	>
23	> - The Edge Runtime is deprecated. Remove the `runtime` export from your route files. See [Edge Runtime Deprecated](/docs/messages/edge-runtime-deprecated).
24	> - When [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents) is enabled, remove the `runtime` export, including `runtime = 'nodejs'`. Cache Components uses the default Node.js runtime and does not support the `runtime` route segment config. See [Migrating to Cache Components](/docs/app/guides/migrating-to-cache-components#runtime--edge).
25	> - This option cannot be used in [Proxy](/docs/app/api-reference/file-conventions/proxy).
26	
```

</details>

<a id="m28"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\route.md` (from line 20, 110 lines)

<details><summary>Result (110 lines)</summary>

```
20	## Reference
21	
22	### HTTP Methods
23	
24	A **route** file allows you to create custom request handlers for a given route. The following [HTTP methods](https://developer.mozilla.org/docs/Web/HTTP/Methods) are supported: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
25	
26	ˋˋˋts filename="route.ts" switcher
27	export async function GET(request: Request) {}
28	
29	export async function HEAD(request: Request) {}
30	
31	export async function POST(request: Request) {}
32	
33	export async function PUT(request: Request) {}
34	
35	export async function DELETE(request: Request) {}
36	
37	export async function PATCH(request: Request) {}
38	
39	// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and set the appropriate Response `Allow` header depending on the other methods defined in the Route Handler.
40	export async function OPTIONS(request: Request) {}
41	ˋˋˋ
42	
43	ˋˋˋjs filename="route.js" switcher
44	export async function GET(request) {}
45	
46	export async function HEAD(request) {}
47	
48	export async function POST(request) {}
49	
… (80 more lines)
```

</details>

<a id="m30"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\route.md` (from line 340, 340 lines)

<details><summary>Result (332 lines)</summary>

```
340	
341	When using [Cache Components](/docs/app/getting-started/caching), you can combine `generateStaticParams` with `use cache` to enable data caching for both prerendered and runtime params.
342	
343	See the [generateStaticParams with Route Handlers](/docs/app/api-reference/functions/generate-static-params#with-route-handlers) documentation for examples and details.
344	
345	### URL Query Parameters
346	
347	The request object passed to the Route Handler is a `NextRequest` instance, which includes [some additional convenience methods](/docs/app/api-reference/functions/next-request#nexturl), such as those for more easily handling query parameters.
348	
349	ˋˋˋts filename="app/api/search/route.ts" switcher
350	import { type NextRequest } from 'next/server'
351	
352	export function GET(request: NextRequest) {
353	  const searchParams = request.nextUrl.searchParams
354	  const query = searchParams.get('query')
355	  // query is "hello" for /api/search?query=hello
356	}
357	ˋˋˋ
358	
359	ˋˋˋjs filename="app/api/search/route.js" switcher
360	export function GET(request) {
361	  const searchParams = request.nextUrl.searchParams
362	  const query = searchParams.get('query')
363	  // query is "hello" for /api/search?query=hello
364	}
365	ˋˋˋ
366	
367	### Streaming
368	
369	Streaming is commonly used in combination with Large Language Models (LLMs), such as OpenAI, for AI-generated content. Learn more about the [AI SDK](https://sdk.vercel.ai/docs/introduction).
… (302 more lines)
```

</details>


<a id="m32"></a>

**🤖 Claude:**

Now `use cache`, cacheLife, cacheTag, revalidateTag, updateTag, fetch, connection docs.

<a id="m33"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\01-directives\use-cache.md` output_mode=`content`

<details><summary>Result (31 lines)</summary>

```
25:## Usage
77:## How `use cache` works
79:### Cache keys
109:### Cache output
146:## Serialization
157:### Supported types
171:### Unsupported types
199:### Pass-through (non-serializable arguments)
235:## Constraints
239:### Request-time APIs
243:### Runtime caching considerations
267:### Draft Mode
291:### React.cache isolation
319:## `use cache` at runtime
327:## Revalidation
336:### Time-based revalidation
368:### On-demand revalidation
396:## Examples
398:### Caching function output with `use cache`
426:### Caching a component's output with `use cache`
462:### Interleaving
595:### Caching a module's exports with `use cache`
618:### Caching a route segment's output with `use cache`
676:## Troubleshooting
678:### Debugging cache behavior
680:#### Verbose logging
686:# or for production
692:#### Console log replays
696:### Build Hangs (Cache Timeout)
772:## Platform Support
… (1 more lines)
```

</details>

<a id="m35"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\cacheLife.md` output_mode=`content`

<details><summary>Result (26 lines)</summary>

```
16:## Usage
18:### Basic setup
52:### Using preset profiles
85:## Reference
87:### Cache profile properties
95:#### `stale`
108:#### `revalidate`
123:#### `expire`
135:### Preset cache profiles
149:### Overriding the default cache profiles
175:### Custom cache profiles
225:### Inline cache profiles
248:### Client cache behavior
262:### Prerendering behavior
274:## Examples
276:### Using preset profiles
304:### Custom profiles for specific needs
342:### Inline profiles for unique cases
374:### Caching individual functions
400:### Nested caching behavior
404:#### With explicit outer cacheLife
425:#### Without explicit outer cacheLife
449:#### Nested short-lived caches
539:### Conditional cache lifetimes
571:#### Using dynamic cache lifetimes from data
600:## Version History
```

</details>

<a id="m37"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\connection.md`

<details><summary>Result (93 lines)</summary>

```
1	---
2	title: connection
3	description: API Reference for the connection function.
4	---
5	
6	The `connection()` function allows you to indicate rendering should wait for an incoming user request before continuing.
7	
8	It's useful when a component doesn't use [Request-time APIs](/docs/app/glossary#request-time-apis) like `cookies` or `headers`, but still needs to produce different output per request, such as `Math.random()` or `new Date()`.
9	
10	ˋˋˋts filename="app/page.tsx" switcher
11	import { connection } from 'next/server'
12	
13	export default async function Page() {
14	  await connection() // prerendering stops here
15	  // the following code only runs at request time
16	  const rand = Math.random()
17	  return <span>{rand}</span>
18	}
19	ˋˋˋ
20	
21	ˋˋˋjsx filename="app/page.js" switcher
22	import { connection } from 'next/server'
23	
24	export default async function Page() {
25	  await connection() // prerendering stops here
26	  // the following code only runs at request time
27	  const rand = Math.random()
28	  return <span>{rand}</span>
29	}
30	ˋˋˋ
… (63 more lines)
```

</details>

<a id="m39"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\updateTag.md`

<details><summary>Result (154 lines)</summary>

```
1	---
2	title: updateTag
3	description: API Reference for the updateTag function.
4	---
5	
6	`updateTag` allows you to update cached data on-demand for a specific cache tag from within [Server Actions](/docs/app/getting-started/mutating-data).
7	
8	This function is designed for **read-your-own-writes** scenarios, where a user makes a change (like creating a post), and the UI immediately shows the change, rather than stale data.
9	
10	## Usage
11	
12	`updateTag` can **only** be called from within [Server Actions](/docs/app/getting-started/mutating-data). It cannot be used in Route Handlers, Client Components, or any other context.
13	
14	If you need to invalidate cache tags in Route Handlers or other contexts, use [`revalidateTag`](/docs/app/api-reference/functions/revalidateTag) instead.
15	
16	> **Good to know**: `updateTag` immediately expires the cached data for the specified tag. The next request will wait to fetch fresh data rather than serving stale content from the cache, ensuring users see their changes immediately.
17	
18	## Parameters
19	
20	ˋˋˋtsx
21	updateTag(tag: string): void;
22	ˋˋˋ
23	
24	- `tag`: A string representing the cache tag associated with the data you want to update. Must not exceed 256 characters. This value is case-sensitive.
25	
26	Tags must first be assigned to cached data. You can do this in two ways:
27	
28	- Using the [`next.tags`](/docs/app/api-reference/functions/fetch) option with `fetch` for caching external API requests:
29	
30	ˋˋˋtsx
… (124 more lines)
```

</details>

<a id="m41"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\01-directives\use-cache.md` (from line 1, 335 lines)

<details><summary>Result (335 lines)</summary>

```
1	---
2	title: use cache
3	description: Learn how to use the "use cache" directive to cache data in your Next.js application.
4	related:
5	  title: Related
6	  description: View related API references.
7	  links:
8	    - app/api-reference/directives/use-cache-private
9	    - app/api-reference/config/next-config-js/cacheComponents
10	    - app/api-reference/config/next-config-js/cacheLife
11	    - app/api-reference/config/next-config-js/cacheHandlers
12	    - app/api-reference/functions/cacheTag
13	    - app/api-reference/functions/cacheLife
14	    - app/api-reference/functions/revalidateTag
15	---
16	
17	The `use cache` directive allows you to mark a route, React component, or a function as cacheable. It can be used at the top of a file to indicate that all exports in the file should be cached, or inline at the top of a function or component to cache the return value. Functions and components that use `use cache` must be async.
18	
19	> **Good to know:**
20	>
21	> - To use cookies or headers, read them outside cached scopes and pass values as arguments. This is the preferred pattern.
22	> - If the in-memory cache isn't sufficient for runtime data, [`'use cache: remote'`](/docs/app/api-reference/directives/use-cache-remote) allows platforms to provide a dedicated cache handler, though it requires a network roundtrip to check the cache and typically incurs platform fees.
23	> - For compliance requirements or when you can't refactor to pass runtime data as arguments to a `use cache` scope, see [`'use cache: private'`](/docs/app/api-reference/directives/use-cache-private).
24	
25	## Usage
26	
27	`use cache` is a Cache Components feature. To enable it, add the [`cacheComponents`](/docs/app/api-reference/config/next-config-js/cacheComponents) option to your `next.config.ts` file:
28	
29	ˋˋˋts filename="next.config.ts" switcher
30	import type { NextConfig } from 'next'
… (305 more lines)
```

</details>

<a id="m43"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\cacheLife.md` (from line 85, 190 lines)

<details><summary>Result (190 lines)</summary>

```
85	## Reference
86	
87	### Cache profile properties
88	
89	Cache profiles control caching behavior through three timing properties:
90	
91	- **[`stale`](#stale)**: How long the client can use cached data without checking the server
92	- **[`revalidate`](#revalidate)**: After this time, the next request will trigger a background refresh
93	- **[`expire`](#expire)**: After this time with no requests, the next one waits for fresh content
94	
95	#### `stale`
96	
97	**Client-side:** How long the client can use cached data without checking the server.
98	
99	During this time, the client-side router displays cached content immediately without any network request. After this period expires, the router must check with the server on the next navigation or request. This provides instant page loads from the client cache, but data may be outdated.
100	
101	- If omitted, defaults to the `default` profile's `stale` value (5 minutes, see [`staleTimes`](/docs/app/api-reference/config/next-config-js/staleTimes))
102	- Also determines whether the content can be part of the route's [App Shell](/docs/app/glossary#app-shell). See [Prerendering behavior](#prerendering-behavior).
103	
104	ˋˋˋtsx
105	cacheLife({ stale: 300 }) // 5 minutes
106	ˋˋˋ
107	
108	#### `revalidate`
109	
110	How often the server regenerates cached content in the background.
111	
112	- When a request arrives after this period, the server:
113	  1. Serves the cached version immediately (if available)
114	  2. Regenerates content in the background
… (160 more lines)
```

</details>

<a id="m45"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\io.md`

<details><summary>Result (110 lines)</summary>

```
1	---
2	title: io
3	description: API Reference for the io function.
4	---
5	
6	When [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents) is enabled, Next.js needs you to decide whether to capture a synchronous value like `new Date()` or `Math.random()` once and reuse it for every visitor, or produce it fresh for each request.
7	
8	To capture the value in the [static shell](/docs/app/glossary#static-shell), wrap it in [`"use cache"`](/docs/app/api-reference/directives/use-cache). To keep it out of the static shell, use `await io()`, which suspends during prerendering.
9	
10	During a request, inside cached scopes, in the browser, and apps without Cache Components (including the Pages Router), calling `io()` resolves immediately.
11	
12	## Usage
13	
14	Call `io()` to inform Next.js that an IO operation follows.
15	
16	In a Server Component, call `await io()` before reading a value like `new Date()`, `Math.random()`, `crypto.randomUUID()`, or a synchronous database driver such as [`node:sqlite`](https://nodejs.org/api/sqlite.html):
17	
18	ˋˋˋtsx filename="app/page.tsx" highlight={13} switcher
19	import { Suspense } from 'react'
20	import { io } from 'next/cache'
21	
22	export default function Page() {
23	  return (
24	    <Suspense fallback={<p>Loading...</p>}>
25	      <CurrentTime />
26	    </Suspense>
27	  )
28	}
29	
30	async function CurrentTime() {
… (80 more lines)
```

</details>

<a id="m47"></a>

**🔎 Grep** `(?i)cache components|cacheComponents|use cache|auto no cache|no-store|force-cache` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\fetch.md` output_mode=`content`

<details><summary>Result (30 lines)</summary>

```
47-
48-ˋˋˋts
49:fetch(`https://...`, { cache: 'force-cache' | 'no-store' })
50-ˋˋˋ
51-
52:- **`auto no cache`** (default): Next.js fetches the resource from the remote server on every request in development, but will fetch once during `next build` because the route will be statically prerendered. If [Request-time APIs](/docs/app/glossary#request-time-apis) are detected on the route, Next.js will fetch the resource on every request.
53:- **`no-store`**: Next.js fetches the resource from the remote server on every request, even if Request-time APIs are not detected on the route.
54:- **`force-cache`**: Next.js looks for a matching request in its server-side cache. A request matches on its URL, method, headers, and body, so requests that differ in any of these are cached separately.
55-  - If there is a match and it is fresh, it will be returned from the cache.
56-  - If there is no match or a stale match, Next.js fetches the resource from the remote server and updates the cache with the downloaded resource. Only responses with a `200` HTTP status code are stored.
57-
58:> **Good to know**: Caching is opt-in. Set `cache: 'force-cache'` to cache any request, including `POST` and requests that send `authorization` or `cookie` headers. [Draft Mode](/docs/app/guides/draft-mode) bypasses the cache entirely (no read or write).
59-
60-### `options.next.revalidate`
--
74-> - If an individual `fetch()` request sets a `revalidate` number lower than the [default `revalidate`](/docs/app/guides/caching-without-cache-components#route-segment-config-revalidate) of a route, the whole route revalidation interval will be decreased.
75-> - If two fetch requests with the same URL in the same route have different `revalidate` values, the lower value will be used.
76:> - Conflicting options such as `{ revalidate: 3600, cache: 'no-store' }` are not allowed, both will be ignored, and in development mode a warning will be printed to the terminal.
77-
78-### `options.next.tags`
--
99-## Troubleshooting
100-
101:### Fetch default `auto no cache` and `cache: 'no-store'` not showing fresh data in development
102-
103-Next.js caches `fetch` responses in Server Components across Hot Module Replacement (HMR) in local development for faster responses and to reduce costs for billed API calls.
104-
105:By default, the [HMR cache](/docs/app/api-reference/config/next-config-js/serverComponentsHmrCache) applies to all fetch requests, including those with the default `auto no cache` and `cache: 'no-store'` option. This means uncached requests will not show fresh data between HMR refreshes. However, the cache will be cleared on navigation or full-page reloads.
106-
107-See the [`serverComponentsHmrCache`](/docs/app/api-reference/config/next-config-js/serverComponentsHmrCache) docs for more information.
```

</details>

<a id="m49"></a>

**🔎 Grep** `revalidateTag\(|profile|## Parameters|Route Handler|deprecated|expire` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\revalidateTag.md` output_mode=`content`

<details><summary>Result (19 lines)</summary>

```
11:This function is ideal for content where a slight delay in updates is acceptable, such as blog posts, product catalogs, or documentation. With the recommended `max` profile, users receive stale content while fresh data loads in the background.
15:`revalidateTag` can be called in Server Functions and Route Handlers.
23:- **`profile="max"` (recommended)**: A one year window, long enough that requests are always served stale content while the revalidation runs.
24:- **Another profile, or an object**: Any other default or custom profile defined in [`cacheLife`](/docs/app/api-reference/config/next-config-js/cacheLife), or an object with an `expire` property, when you want a different window.
25:- **`{ expire: 0 }`**: Stale content is never served, so the next request is a blocking revalidate/cache miss. Use it when the caller needs the data gone immediately and you cannot use [`updateTag`](/docs/app/api-reference/functions/updateTag).
26:- **No second argument (deprecated)**: Behaves like `{ expire: 0 }`. Migrate to [`updateTag`](/docs/app/api-reference/functions/updateTag) in Server Actions, or `profile="max"`.
28:The profile sets the point past which data correctness is more important than being fast.
32:## Parameters
35:revalidateTag(tag: string, profile: string | { expire?: number }): void;
39:- `profile`: How long stale content may be served, see [Revalidation Behavior](#revalidation-behavior). The recommended value is `"max"`. Any other default or custom profile defined in [`cacheLife`](/docs/app/api-reference/config/next-config-js/cacheLife) is also accepted, and only its `expire` is read. You can also pass an object with an `expire` property, in seconds.
61:> **Good to know**: The single-argument form `revalidateTag(tag)` is deprecated. It currently works if TypeScript errors are suppressed, but this behavior may be removed in a future version. Update to the two-argument signature.
75:The following examples demonstrate how to use `revalidateTag` in different contexts. In both cases, we're using `profile="max"` to mark data as stale and use stale-while-revalidate semantics, which is the recommended approach for most use cases.
86:  revalidateTag('posts', 'max')
97:  revalidateTag('posts', 'max')
101:### Route Handler
111:    revalidateTag(tag, 'max')
130:    revalidateTag(tag, 'max')
142:When the invalidation comes from outside a Server Action, for example a webhook or another service calling a Route Handler, [`updateTag`](/docs/app/api-reference/functions/updateTag) is not available. Pass `{ expire: 0 }` to expire the data immediately:
145:revalidateTag(tag, { expire: 0 })
```

</details>

<a id="m51"></a>

**🔎 Grep** `(?i)cache components|cacheComponents|Suspense|async|synchronous|use cache` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\cookies.md` output_mode=`content`

<details><summary>Result (22 lines)</summary>

```
6:`cookies` is an **async** function that allows you to read the HTTP incoming request cookies in [Server Components](/docs/app/getting-started/server-and-client-components), and read/write outgoing request cookies in [Server Functions](/docs/app/getting-started/mutating-data) or [Route Handlers](/docs/app/api-reference/file-conventions/route).
11:export default async function Page() {
21:export default async function Page() {
67:- `cookies` is an **asynchronous** function that returns a promise. You must use `async/await` or React's [`use`](https://react.dev/reference/react/use) function to access cookies.
68:  - In version 14 and earlier, `cookies` was a synchronous function. To help with backwards compatibility, you can still access it synchronously in Next.js 15, but this behavior will be deprecated in the future.
70:- With [Cache Components](/docs/app/getting-started/caching), calling `cookies()` inside a [`<Suspense>`](https://react.dev/reference/react/Suspense) boundary streams only that subtree at request time, and the rest of the route is prerendered. Calling it outside a boundary prevents the route from being prerendered. See [Next.js encountered runtime data during prerendering](/docs/messages/blocking-prerender-runtime) for fix options.
71:- Without Cache Components, using `cookies` in a layout or page opts the route into [dynamic rendering](/docs/app/glossary#dynamic-rendering).
103:export default async function Page() {
113:export default async function Page() {
127:export default async function Page() {
141:export default async function Page() {
161:export async function create(data) {
182:export async function create(data) {
205:export default async function Page() {
215:export default async function Page() {
233:export async function deleteCookie(data) {
244:export async function deleteCookie(data) {
257:export async function deleteCookie(data) {
268:export async function deleteCookie(data) {
281:export async function deleteCookie(data) {
292:export async function deleteCookie(data) {
302:| `v15.0.0-RC` | `cookies` is now an async function. A [codemod](/docs/app/guides/upgrading/codemods#150) is available. |
```

</details>

<a id="m53"></a>

**🔎 Grep** `(?i)cache components|cacheComponents|Suspense|async|synchronous|use cache` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\headers.md` output_mode=`content`

<details><summary>Result (8 lines)</summary>

```
6:`headers` is an **async** function that allows you to **read** the HTTP incoming request headers from a [Server Component](/docs/app/getting-started/server-and-client-components).
11:export default async function Page() {
20:export default async function Page() {
45:- `headers` is an **asynchronous** function that returns a promise. You must use `async/await` or React's [`use`](https://react.dev/reference/react/use) function.
46:  - In version 14 and earlier, `headers` was a synchronous function. To help with backwards compatibility, you can still access it synchronously in Next.js 15, but this behavior will be deprecated in the future.
49:- With [Cache Components](/docs/app/getting-started/caching), calling `headers()` outside of a [`<Suspense>`](https://react.dev/reference/react/Suspense) boundary prevents the route from being prerendered. See [Next.js encountered runtime data during prerendering](/docs/messages/blocking-prerender-runtime) for fix options.
58:export default async function Page() {
73:| `v15.0.0-RC` | `headers` is now an async function. A [codemod](/docs/app/guides/upgrading/codemods#150) is available. |
```

</details>


<a id="m55"></a>

**🤖 Claude:**

Now page/layout props helpers, Server Actions, and metadata/viewport/manifest docs.

<a id="m56"></a>

**🔎 Grep** `PageProps|Promise<|searchParams|use\(|typegen|Good to know` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\page.md` output_mode=`content`

<details><summary>Result (55 lines)</summary>

```
11:  searchParams,
13:  params: Promise<{ slug: string }>
14:  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
21:export default function Page({ params, searchParams }) {
26:## Good to know
46:  params: Promise<{ slug: string }>
60:| `app/shop/[slug]/page.js`            | `/shop/1`   | `Promise<{ slug: '1' }>`                |
61:| `app/shop/[category]/[item]/page.js` | `/shop/1/2` | `Promise<{ category: '1', item: '2' }>` |
62:| `app/shop/[...slug]/page.js`         | `/shop/1/2` | `Promise<{ slug: ['1', '2'] }>`         |
67:#### `searchParams` (optional)
73:  searchParams,
75:  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
77:  const filters = (await searchParams).filters
82:export default async function Page({ searchParams }) {
83:  const filters = (await searchParams).filters
87:Client Component **pages** can also access `searchParams` using React’s [`use`](https://react.dev/reference/react/use) hook:
94:  searchParams,
96:  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
98:  const filters = use(searchParams).filters
106:export default function Page({ searchParams }) {
107:  const filters = use(searchParams).filters
111:| Example URL     | `searchParams`                |
113:| `/shop?a=1`     | `Promise<{ a: '1' }>`         |
114:| `/shop?a=1&b=2` | `Promise<{ a: '1', b: '2' }>` |
115:| `/shop?a=1&a=2` | `Promise<{ a: ['1', '2'] }>`  |
117:- Since the `searchParams` prop is a promise. You must use `async/await` or React's [`use`](https://react.dev/reference/react/use) function to access the values.
118:  - In version 14 and earlier, `searchParams` was a synchronous prop. To help with backwards compatibility, you can still access it synchronously in Next.js 15, but this behavior will be deprecated in the future.
119:- `searchParams` is a **[Request-time API](/docs/app/glossary#request-time-apis)** whose values cannot be known ahead of time. Using it will opt the page into **[dynamic rendering](/docs/app/glossary#dynamic-rendering)** at request time.
120:- With [Cache Components](/docs/app/getting-started/caching), where you access `searchParams` in the component tree determines how much of the page can be prerendered. See [Maximizing the static shell](/docs/app/getting-started/caching#maximizing-the-static-shell).
121:- `searchParams` is a plain JavaScript object, not a `URLSearchParams` instance.
… (25 more lines)
```

</details>

<a id="m58"></a>

**🔎 Grep** `LayoutProps|Promise<|typegen|parallel|slot` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\layout.md` output_mode=`content`

<details><summary>Result (11 lines)</summary>

```
70:  params: Promise<{ team: string }>
84:| `app/dashboard/[team]/layout.js`  | `/dashboard/1` | `Promise<{ team: '1' }>`           |
85:| `app/shop/[tag]/[item]/layout.js` | `/shop/1/2`    | `Promise<{ tag: '1', item: '2' }>` |
86:| `app/blog/[...slug]/layout.js`    | `/blog/1/2`    | `Promise<{ slug: ['1', '2'] }>`    |
93:You can type layouts with `LayoutProps` to get a strongly typed `params` and named slots inferred from your directory structure. `LayoutProps` is a globally available helper.
96:export default function Layout(props: LayoutProps<'/dashboard'>) {
100:      {/* If you have app/dashboard/@analytics, it appears as a typed slot: */}
109:> - Types are generated during `next dev`, `next build` or `next typegen`.
110:> - After type generation, the `LayoutProps` helper is globally available. It doesn't need to be imported.
668:  params: Promise<{ team: string }>
710:  params: Promise<{ slug: string }>
```

</details>

<a id="m60"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\layout.md` (from line 90, 25 lines)

<details><summary>Result (25 lines)</summary>

```
90	
91	### Layout Props Helper
92	
93	You can type layouts with `LayoutProps` to get a strongly typed `params` and named slots inferred from your directory structure. `LayoutProps` is a globally available helper.
94	
95	ˋˋˋtsx filename="app/dashboard/layout.tsx"
96	export default function Layout(props: LayoutProps<'/dashboard'>) {
97	  return (
98	    <section>
99	      {props.children}
100	      {/* If you have app/dashboard/@analytics, it appears as a typed slot: */}
101	      {/* {props.analytics} */}
102	    </section>
103	  )
104	}
105	ˋˋˋ
106	
107	> **Good to know**:
108	>
109	> - Types are generated during `next dev`, `next build` or `next typegen`.
110	> - After type generation, the `LayoutProps` helper is globally available. It doesn't need to be imported.
111	
112	### Root Layout
113	
114	The `app` directory **must** include a **root layout**, which is the top-most layout in the root `app` directory. Typically, the root layout is `app/layout.js`.
```

</details>

<a id="m62"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\page.md` (from line 122, 20 lines)

<details><summary>Result (20 lines)</summary>

```
122	
123	### Page Props Helper
124	
125	You can type pages with `PageProps` to get strongly typed `params` and `searchParams` from the route literal. `PageProps` is a globally available helper.
126	
127	ˋˋˋtsx filename="app/blog/[slug]/page.tsx"
128	export default async function Page(props: PageProps<'/blog/[slug]'>) {
129	  const { slug } = await props.params
130	  const query = await props.searchParams
131	  return <h1>Blog Post: {slug}</h1>
132	}
133	ˋˋˋ
134	
135	> **Good to know**
136	>
137	> - Using a literal route (e.g. `'/blog/[slug]'`) enables autocomplete and strict keys for `params`.
138	> - Static routes resolve `params` to `{}`.
139	> - Types are generated during `next dev`, `next build`, or with `next typegen`.
140	> - After type generation, the `PageProps` helper is globally available. It doesn't need to be imported.
141	
```

</details>

<a id="m64"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\01-getting-started\07-mutating-data.md` output_mode=`content`

<details><summary>Result (15 lines)</summary>

```
16:## What are Server Functions?
36:## Creating Server Functions
104:### Server Components
134:### Client Components
172:### Passing actions as props
200:## Invoking Server Functions
209:### Forms
281:### Event Handlers
335:## Examples
337:### Showing a pending state
381:### Refresh data
423:### Revalidate data
460:### Redirect after a mutation
506:### Cookies
553:### useEffect
```

</details>

<a id="m66"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\server-actions.md` output_mode=`content`

<details><summary>Result (6 lines)</summary>

```
26:## Sequential dispatch on the client
34:## A single response carries data and UI
76:## Security
141:## Choosing a cache update
154:## Configuration
172:## Deployment considerations
```

</details>

<a id="m68"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\server-actions.md`

<details><summary>Result (181 lines)</summary>

```
1	---
2	title: Server Actions and Mutations
3	nav_title: Server Actions
4	description: How Server Actions work in Next.js, including the single-roundtrip response model, sequential dispatch, security, and caching integration.
5	related:
6	  title: Next steps
7	  description: Learn more about creating, securing, and configuring Server Actions.
8	  links:
9	    - app/getting-started/mutating-data
10	    - app/guides/forms
11	    - app/guides/data-security
12	    - app/api-reference/directives/use-server
13	    - app/api-reference/functions/revalidatePath
14	    - app/api-reference/functions/revalidateTag
15	    - app/api-reference/functions/redirect
16	    - app/api-reference/functions/refresh
17	    - app/api-reference/config/next-config-js/serverActions
18	---
19	
20	A **Server Action** is a [React Server Function](https://react.dev/reference/rsc/server-functions) invoked through React's action mechanisms, such as `<form action>`, `<button formAction>`, or a client-side transition.
21	
22	You create one by adding the [`'use server'`](/docs/app/api-reference/directives/use-server) directive, then invoke it from a form, or from an event handler or `useEffect` wrapped in `startTransition`. For the basics of creating and invoking Server Functions, see [Mutating data](/docs/app/getting-started/mutating-data) and the [Forms guide](/docs/app/guides/forms).
23	
24	This page covers the parts of Server Actions that are specific to Next.js: how they commonly map to mutations, how the response carries both returned data and re-rendered UI, how the client dispatches them, the security boundary the framework enforces, and the configuration available.
25	
26	## Sequential dispatch on the client
27	
28	Next.js dispatches Server Actions one at a time per client. If a user triggers three actions in quick succession, the second waits for the first to finish, then the third waits for the second. This keeps the re-rendered server tree consistent with the action result that produced it.
29	
30	A consequence: do not rely on `Promise.all` to parallelize Server Actions from the client. If you need parallel work, do it inside a single Server Action, fetch in parallel from a [Server Component](/docs/app/getting-started/fetching-data#server-components), or use a [Route Handler](/docs/app/guides/backend-for-frontend#manipulating-data) for non-mutation requests.
… (151 more lines)
```

</details>

<a id="m70"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\01-getting-started\07-mutating-data.md` (from line 16, 120 lines)

<details><summary>Result (120 lines)</summary>

```
16	## What are Server Functions?
17	
18	A **Server Function** is an asynchronous function that runs on the server. You can call them from the client through a network request, which is why they must be asynchronous.
19	
20	In an `action` or mutation context, they are also called **Server Actions**.
21	
22	By convention, a Server Action is an async function used with [`startTransition`](https://react.dev/reference/react/startTransition). This happens automatically when the function is:
23	
24	- Passed to a `<form>` using the `action` prop.
25	- Passed to a `<button>` using the `formAction` prop.
26	
27	When an action is invoked, Next.js can return both the updated UI and new data in a single server roundtrip.
28	
29	Behind the scenes, actions use the `POST` method, and only this HTTP method can invoke them.
30	
31	> [!WARNING]
32	> Server Functions are reachable via direct POST requests, not just through your application's UI. Always verify authentication and authorization inside every Server Function. See the [Data Security guide](/docs/app/guides/data-security#authentication-and-authorization) for recommended patterns.
33	
34	> **Good to know:** A Server Action is a Server Function used in a specific way (for handling form submissions and mutations). Server Function is the broader term.
35	
36	## Creating Server Functions
37	
38	A Server Function can be defined by using the [`use server`](https://react.dev/reference/rsc/use-server) directive. You can place the directive at the top of an **asynchronous** function to mark the function as a Server Function, or at the top of a separate file to mark all exports of that file.
39	
40	ˋˋˋts filename="app/lib/actions.ts" switcher
41	import { auth } from '@/lib/auth'
42	
43	export async function createPost(formData: FormData) {
44	  'use server'
45	  const session = await auth()
… (90 more lines)
```

</details>

<a id="m72"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\01-metadata\manifest.md`

<details><summary>Result (73 lines)</summary>

```
1	---
2	title: manifest.json
3	description: API Reference for manifest.json file.
4	---
5	
6	Add or generate a `manifest.(json|webmanifest)` file that matches the [Web Manifest Specification](https://developer.mozilla.org/docs/Web/Manifest) in the **root** of `app` directory to provide information about your web application for the browser.
7	
8	## Static Manifest file
9	
10	ˋˋˋjson filename="app/manifest.json | app/manifest.webmanifest"
11	{
12	  "name": "My Next.js Application",
13	  "short_name": "Next.js App",
14	  "description": "An application built with Next.js",
15	  "start_url": "/"
16	  // ...
17	}
18	ˋˋˋ
19	
20	## Generate a Manifest file
21	
22	Add a `manifest.js` or `manifest.ts` file that returns a [`Manifest` object](#manifest-object).
23	
24	> Good to know: `manifest.js` is a special Route Handlers that is cached by default unless it uses a [Request-time API](/docs/app/glossary#request-time-apis) or [dynamic config](/docs/app/guides/caching-without-cache-components#dynamic) option.
25	
26	ˋˋˋts filename="app/manifest.ts" switcher
27	import type { MetadataRoute } from 'next'
28	
29	export default function manifest(): MetadataRoute.Manifest {
30	  return {
… (43 more lines)
```

</details>

<a id="m74"></a>

**🔎 Grep** `^#{1,4} |themeColor|viewportFit|Cache Components|use cache|deprecated` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-viewport.md` output_mode=`content`

<details><summary>Result (31 lines)</summary>

```
21:## The `viewport` object
29:  themeColor: 'black',
37:  themeColor: 'black',
43:## `generateViewport` function
50:    themeColor: '...',
60:    themeColor: '...',
69:## Viewport Fields
71:### `themeColor`
81:  themeColor: 'black',
87:  themeColor: 'black',
101:  themeColor: [
110:  themeColor: [
122:### `width`, `initialScale`, `maximumScale` and `userScalable`
157:### `colorScheme`
179:## With Cache Components
181:When [Cache Components](/docs/app/getting-started/caching) is enabled, `generateViewport` follows the same rules as other components. If viewport accesses runtime data (`cookies()`, `headers()`, `params`, `searchParams`) or performs uncached data fetching, it defers to request time.
185:If viewport depends on external data but not runtime data, use `use cache`:
189:  'use cache'
204:    themeColor: cookieJar.get('theme-color')?.value,
229:    themeColor: cookieJar.get('theme-color')?.value,
242:## Types
246:### `viewport` object
252:  themeColor: 'black',
256:### `generateViewport` function
258:#### Regular function
265:    themeColor: 'black',
270:#### With segment props
282:    themeColor: 'black',
289:#### JavaScript Projects
296:  themeColor: 'black',
… (1 more lines)
```

</details>

<a id="m76"></a>

**🔎 Grep** `^#{1,4} ` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\progressive-web-apps.md` output_mode=`content`

<details><summary>Result (10 lines)</summary>

```
18:## Creating a PWA with Next.js
20:### 1. Creating the Web App Manifest
84:### 2. Implementing Web Push Notifications
410:### 3. Implementing Server Actions
516:### 4. Generating VAPID Keys
551:### 5. Creating a Service Worker
588:### 6. Adding to Home Screen
599:### 7. Testing Locally
610:### 8. Securing your application
670:## Extending your PWA
```

</details>

<a id="m78"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-viewport.md` (from line 1, 242 lines)

<details><summary>Result (242 lines)</summary>

```
1	---
2	title: generateViewport
3	description: API Reference for the generateViewport function.
4	related:
5	  title: Next Steps
6	  description: View all the Metadata API options.
7	  links:
8	    - app/api-reference/file-conventions/metadata
9	    - app/getting-started/caching
10	    - app/api-reference/config/next-config-js/cacheComponents
11	---
12	
13	You can customize the initial viewport of the page with the static `viewport` object or the dynamic `generateViewport` function.
14	
15	> **Good to know**:
16	>
17	> - The `viewport` object and `generateViewport` function exports are **only supported in Server Components**.
18	> - You cannot export both the `viewport` object and `generateViewport` function from the same route segment.
19	> - If you're coming from migrating `metadata` exports, you can use [metadata-to-viewport-export codemod](/docs/app/guides/upgrading/codemods#metadata-to-viewport-export) to update your changes.
20	
21	## The `viewport` object
22	
23	To define the viewport options, export a `viewport` object from a `layout.jsx` or `page.jsx` file.
24	
25	ˋˋˋtsx filename="layout.tsx | page.tsx" switcher
26	import type { Viewport } from 'next'
27	
28	export const viewport: Viewport = {
29	  themeColor: 'black',
30	}
… (212 more lines)
```

</details>

<a id="m80"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\progressive-web-apps.md` (from line 1, 84 lines)

<details><summary>Result (84 lines)</summary>

```
1	---
2	title: How to build a Progressive Web Application (PWA) with Next.js
3	nav_title: PWAs
4	description: Learn how to build a Progressive Web Application (PWA) with Next.js.
5	related:
6	  links:
7	    - app/api-reference/file-conventions/metadata/manifest
8	---
9	
10	Progressive Web Applications (PWAs) offer the reach and accessibility of web applications combined with the features and user experience of native mobile apps. With Next.js, you can create PWAs that provide a seamless, app-like experience across all platforms without the need for multiple codebases or app store approvals.
11	
12	PWAs allow you to:
13	
14	- Deploy updates instantly without waiting for app store approval
15	- Create cross-platform applications with a single codebase
16	- Provide native-like features such as home screen installation and push notifications
17	
18	## Creating a PWA with Next.js
19	
20	### 1. Creating the Web App Manifest
21	
22	Next.js provides built-in support for creating a [web app manifest](/docs/app/api-reference/file-conventions/metadata/manifest) using the App Router. You can create either a static or dynamic manifest file:
23	
24	For example, create a `app/manifest.ts` or `app/manifest.json` file:
25	
26	ˋˋˋtsx filename="app/manifest.ts" switcher
27	import type { MetadataRoute } from 'next'
28	
29	export default function manifest(): MetadataRoute.Manifest {
30	  return {
… (54 more lines)
```

</details>

<a id="m82"></a>

**🔎 Grep** `(?i)themeColor|deprecated|appleWebApp|## With Cache Components|manifest:` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-metadata.md` output_mode=`content`

<details><summary>Result (9 lines)</summary>

```
652:### `themeColor`
654:> **Deprecated**: The `themeColor` option in `metadata` is deprecated as of Next.js 14. Please use the [`viewport` configuration](/docs/app/api-reference/functions/generate-viewport) instead.
658:> **Deprecated**: The `colorScheme` option in `metadata` is deprecated as of Next.js 14. Please use the [`viewport` configuration](/docs/app/api-reference/functions/generate-viewport) instead.
666:  manifest: 'https://nextjs.org/manifest.json',
754:> **Deprecated**: The `viewport` option in `metadata` is deprecated as of Next.js 14. Please use the [`viewport` configuration](/docs/app/api-reference/functions/generate-viewport) instead.
779:### `appleWebApp`
787:  appleWebApp: {
1272:### With Cache Components
1443:| `v14.0.0` | `viewport`, `themeColor`, and `colorScheme` deprecated in favor of the [`viewport` configuration](/docs/app/api-reference/functions/generate-viewport). |
```

</details>

<a id="m84"></a>

**▶ Bash:** Preview offline support, useOffline, instant docs

```bash
cd ~/EnamHoldingsOA/web/node_modules/next/dist/docs/01-app; head -40 02-guides/offline-support.md; echo ----; head -30 03-api-reference/05-config/01-next-config-js/useOffline.md; echo ----; head -40 03-api-reference/03-file-conventions/02-route-segment-config/instant.md
```

<details><summary>Result (112 lines)</summary>

```
---
title: Handling connectivity drops
description: How a Next.js app can recover when the network drops mid-fetch or mid-Server Action, and how to communicate that state to the user.
nav_title: Offline support
version: experimental
related:
  title: Learn more
  description: The hook and config flag used in this guide.
  links:
    - app/api-reference/functions/use-offline
    - app/api-reference/config/next-config-js/useOffline
    - app/guides/progressive-web-apps
---

Network failures during a soft navigation, a data fetch, or a mutation throw errors in the client. Without explicit handling, the UI either breaks or you have to build a fallback UI that asks the user to retry.

With [`experimental.useOffline`](/docs/app/api-reference/config/next-config-js/useOffline) enabled, a failed navigation, RSC data fetch, prefetch, or Server Action no longer throws when the network is down. Next.js keeps it pending and retries it once the connection returns.

While the request is pending, the UI sits in its loading state (a Suspense fallback, or a pending transition for a Server Action), which looks the same as a slow server. Use the [`useOffline`](/docs/app/api-reference/functions/use-offline) hook to give users feedback when the app is offline.

Requests you issue directly with `fetch()` inside a Client Component, or through a client-side data library like React Query or SWR, stay under that library's own retry policy. See [How retry works](/docs/app/api-reference/config/next-config-js/useOffline#how-retry-works) for the framework's detection and polling behavior.

## Example

We will build a live-metrics page that fetches fresh data on every request, plus a ping form that calls a Server Action.

- Source: [github.com/nextjs/use-offline](https://github.com/nextjs/use-offline)
- Live demo: [use-offline.labs.vercel.dev](https://use-offline.labs.vercel.dev)

The companion demo has two versions of this dashboard: `/without-feedback` uses a generic loading fallback, `/with-feedback` uses a connectivity-aware one. The next sections of this guide walk through building each.
… (82 more lines)
```

</details>

<a id="m86"></a>

**🔎 Grep** `(?i)uncached data (was )?accessed|outside of `?<Suspense>|blocking-route|build (will )?fail|fails the build|build error` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app` output_mode=`content`

<details><summary>Result (42 lines)</summary>

```
node_modules\next\dist\docs\01-app\01-getting-started\08-caching.md:138:Without a `<Suspense>` boundary around the uncached read, the dev overlay surfaces the **blocking-route** insight with this fix:
node_modules\next\dist\docs\01-app\01-getting-started\08-caching.md:191:A runtime API access without `<Suspense>` surfaces the same **blocking-route** insight in the dev overlay, with the same fix:
node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\dynamic-routes.md:203:During the build process, the route is executed with each sample param to collect the HTML result. If dynamic content or runtime data are accessed incorrectly, the build will fail.
node_modules\next\dist\docs\01-app\03-api-reference\06-cli\next.md:92:See the [Building guide](/docs/app/guides/building) to learn how to read the output, prerender dynamic routes, and debug build errors.
node_modules\next\dist\docs\01-app\03-api-reference\01-directives\use-cache.md:366:Nesting a short-lived use cache inside one without an explicit [cacheLife](/docs/app/api-reference/functions/cacheLife) fails the build during prerendering. See [Nested short-lived caches](/docs/app/api-reference/functions/cacheLife#nested-short-lived-caches) for the rule and fix.
node_modules\next\dist\docs\01-app\03-api-reference\01-directives\use-cache.md:616:> - Only exported functions are available to Client Components. Other exports, such as constants and objects, are dropped from what the client receives, so importing one fails the build with an "export doesn't exist" error. Move shared values to a separate file without the directive.
node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-static-params.md:311:When using [Cache Components](/docs/app/getting-started/caching) with dynamic routes, `generateStaticParams` must return **at least one param**. Empty arrays cause a [build error](/docs/messages/empty-generate-static-params). This allows Cache Components to validate your route doesn't incorrectly access `cookies()`, `headers()`, or `searchParams` at runtime.
node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-metadata.md:428:> - Using a relative path in a URL-based `metadata` field without configuring a `metadataBase` will cause a build error.
node_modules\next\dist\docs\01-app\03-api-reference\04-functions\next-root-params.md:54:Root parameters are available as soon as you create the routes that define them. A [`generateStaticParams`](/docs/app/api-reference/functions/generate-static-params) function is only required with [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents), where each root parameter must have at least one value or the build fails.
node_modules\next\dist\docs\01-app\03-api-reference\04-functions\next-root-params.md:370:// This will cause a build error
node_modules\next\dist\docs\01-app\02-guides\building.md:84:With Cache Components, `next build` validates that each App Router page can produce a static she
… (12 more lines)
```

</details>

<a id="m88"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\generate-metadata.md` (from line 1272, 60 lines)

<details><summary>Result (60 lines)</summary>

```
1272	### With Cache Components
1273	
1274	When [Cache Components](/docs/app/getting-started/caching) is enabled, `generateMetadata` follows the same rules as other components. If metadata accesses runtime data (`cookies()`, `headers()`, `params`, `searchParams`) or performs uncached data fetching, it defers to request time.
1275	
1276	How Next.js handles this depends on the rest of your page:
1277	
1278	- **If other parts also defer to request time**: Prerendering generates a static shell, and metadata streams in with other deferred content.
1279	- **If the page or layout is otherwise fully prerenderable**: Next.js requires an explicit choice: cache the data if possible, or signal that deferred rendering is intentional.
1280	
1281	Streaming metadata at runtime while the rest of the page is fully prerenderable is not common. To ensure this behavior is intentional, an error is raised indicating which page or layout needs to be handled.
1282	
1283	To resolve this, you have two options. If metadata depends on external data but not runtime data, use `use cache`:
1284	
1285	ˋˋˋtsx filename="app/page.tsx" highlight={2}
1286	export async function generateMetadata() {
1287	  'use cache'
1288	  const { title, description } = await db.query('site-metadata')
1289	  return { title, description }
1290	}
1291	ˋˋˋ
1292	
1293	If metadata genuinely requires runtime data, add a dynamic marker component to your page:
1294	
1295	ˋˋˋtsx filename="app/page.tsx" highlight={11-14,19,31}
1296	import { Suspense } from 'react'
1297	import { cookies } from 'next/headers'
1298	import { connection } from 'next/server'
1299	
1300	export async function generateMetadata() {
1301	  const token = (await cookies()).get('token')?.value
… (30 more lines)
```

</details>

<a id="m90"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\02-guides\building.md` (from line 80, 90 lines)

<details><summary>Result (90 lines)</summary>

```
80	Request-dependent [Route Handlers](/docs/app/api-reference/file-conventions/route) (API endpoints), Proxy (Middleware), and dynamic metadata routes such as `icon`, `opengraph-image`, and `twitter-image` use `ƒ`. These entries render on demand and do not use PPR.
81	
82	### Prerender validation
83	
84	With Cache Components, `next build` validates that each App Router page can produce a static shell. Request-time values such as `params`, `cookies()`, and `headers()` outside of `<Suspense>` produce a [runtime data error](/docs/messages/blocking-prerender-runtime). Uncached data produces an [uncached data error](/docs/messages/blocking-prerender-dynamic). Each error links to the fixes that apply to that data source.
85	
86	### Debug prerender errors
87	
88	Production builds minify server code and omit server source maps by default. Use [`--debug-prerender`](/docs/app/api-reference/cli/next#debugging-prerender-errors) for more detailed stack traces and code frames:
89	
90	ˋˋˋbash filename="Terminal"
91	next build --debug-prerender
92	ˋˋˋ
93	
94	The option disables server minification, enables server source maps, and prevents one failed route from stopping the rest of the build.
95	
96	> **Warning**: Do not deploy builds produced with `--debug-prerender`. These builds include debugging options and are not optimized for production.
97	
98	### Build specific routes
99	
100	Use [`--debug-build-paths`](/docs/app/api-reference/cli/next#building-specific-routes) to compile and prerender selected routes while debugging a large application. The option accepts comma-separated paths and glob patterns. Prefix a pattern with `!` to exclude it. You can also combine it with `--debug-prerender`.
101	
102	Only matching routes appear in the route table. When you select an App Router route, Next.js also includes the built-in `/_not-found` route.
103	
104	## Example
105	
106	> **Good to know**: The following example uses [Cache Components](/docs/app/api-reference/config/next-config-js/cacheComponents) with [Partial Prefetching](/docs/app/api-reference/config/next-config-js/partialPrefetching), enabled with `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`. The route symbols and prerender errors differ when Cache Components is disabled. See [Enabling Cache Components](/docs/app/getting-started/caching#enabling-cache-components) for setup.
107	
108	### Find blocking work
109	
… (60 more lines)
```

</details>

<a id="m92"></a>

**🔎 Grep** `experimental|serverActions:` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\05-config\01-next-config-js\serverActions.md` output_mode=`content`

<details><summary>Result (8 lines)</summary>

```
19:  experimental: {
20:    serverActions: {
51:  experimental: {
52:    serverActions: {
69:  experimental: {
70:    serverActions: {

[Showing results with pagination = limit: 6]
```

</details>

<a id="m94"></a>

**📖 Read** `~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\01-directives\use-cache.md` (from line 336, 60 lines)

<details><summary>Result (60 lines)</summary>

```
336	### Time-based revalidation
337	
338	Set an explicit cache lifetime with [`cacheLife`](/docs/app/api-reference/functions/cacheLife) in every `use cache` scope. It makes the cache behavior clear at the call site, instead of depending on the `default` profile or surrounding caches.
339	
340	ˋˋˋtsx filename="lib/data.ts"
341	import { cacheLife } from 'next/cache'
342	
343	async function getData() {
344	  'use cache'
345	  cacheLife('hours') // Use built-in 'hours' profile
346	  const res = await fetch('https://api.example.com/data')
347	  return res.json()
348	}
349	ˋˋˋ
350	
351	If you omit `cacheLife`, the `default` profile applies and the lifetime is no longer explicit at the call site:
352	
353	- **stale**: 5 minutes (client-side)
354	- **revalidate**: 15 minutes (server-side)
355	- **expire**: never expires by time
356	
357	ˋˋˋtsx filename="lib/data.ts"
358	async function getData() {
359	  'use cache'
360	  // Implicitly uses the 'default' profile
361	  const res = await fetch('https://api.example.com/data')
362	  return res.json()
363	}
364	ˋˋˋ
365	
… (30 more lines)
```

</details>

<a id="m96"></a>

**🔎 Grep** `cacheTag\(.*\.\.\.|256|128|multiple tags|cacheTag\('a'|Good to know` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\04-functions\cacheTag.md` output_mode=`content`

<details><summary>Result (12 lines)</summary>

```
94:## Good to know
95-
96-- **Idempotent Tags**: Applying the same tag multiple times has no additional effect.
97:- **Multiple Tags**: You can assign multiple tags to a single cache entry by passing multiple string values to `cacheTag`.
98-
99-ˋˋˋtsx
100-cacheTag('tag-one', 'tag-two')
--
103:- **Limits**: A single `cacheTag()` call accepts up to 128 tags, each with a maximum length of 256 characters. Tags longer than 256 characters are skipped, and any tags past the 128th in one call are dropped. Both cases log a console warning.
104-
105-## Examples
106-
```

</details>

<a id="m98"></a>

**🔎 Grep** `export (async )?function proxy|export const config|matcher|runtime` path=`~\EnamHoldingsOA\web\node_modules\next\dist\docs\01-app\03-api-reference\03-file-conventions\proxy.md` output_mode=`content`

<details><summary>Result (12 lines)</summary>

```
34:export function proxy(request: NextRequest) {
38:export const config = {
39:  matcher: '/about/:path*',
47:export function proxy(request) {
51:export const config = {
52:  matcher: '/about/:path*',
71:Optionally, a config object can be exported alongside the Proxy function. This object includes the [matcher](#matcher) to specify paths where the Proxy applies.
75:The `matcher` option allows you to target specific paths for the Proxy to run on.
77:Without a `matcher`, Proxy runs on **every request**, including static files (`_next/static`), image optimizations (`_next/image`), and assets in the `public/` folder. Consider using a [negative match pattern](#negative-matching) to exclude these paths, otherwise auth logic or redirects can unintentionally block CSS, JS, or images from loading.
82:- For multiple paths: Use an array to list multiple paths, such as `matcher: ['/about', '/contact']`, which applies the Proxy to both `/about` and `/contact`.

[Showing results with pagination = limit: 10]
```

</details>

<a id="m100"></a>

**🔧 SubagentHandback**

```json
{
 "message": "All findings below come from the docs bundled with Next 16.4.6 under ~\\EnamHoldingsOA\\web\\node_modules\\next\\dist\\docs\\01-app\\. The project's next.config.ts has `cacheComponents: true`, `partialPrefetching: true` and a `turbopack.rules` entry for Tailwind. Some reference pages still show examples from the old caching model, which break under cacheComponents. I point those out below.\n\n## 1. Caching with cacheComponents\nSources: 01-getting-started\\08-caching.md, 02-guides\\migrating-to-cache-components.md, 03-api-reference\\01-directives\\use-cache.md, 04-functions\\cacheLife.md, cacheTag.md, revalidateTag.md, updateTag.md, io.md, 02-guides\\building.md\n\n- **Default:** nothing is cached. `fetch` is uncached unless it runs inside a `'use cache'` scope. Old `cache:'force-cache'` / `next:{revalidate,tags}` and `unstable_cache` \"keep working\", but the docs recommend moving them into `'use cache'`.\n- **Persistence:** `use cache` is stored in memory, per deployment. The build ID is part of the key, and entries are lost on serverless teardown. The fetch Data Cache and `unstable_cache` do persist across deploys.\n- **`'use cache'` placement:** at the top of an async function, a component, or a whole file (then every export is cached and must be async).\n  - Arguments and captured closure variables become the cache key. They must be serializable: no class instances, URL objects, or functions (functions and JSX only as untouched pass-through, e.g. `children`).\n  - You can't call `cookies()`, `headers()` or `searchParams` inside, even through helpers. The error is `next-request-in-use-cache`, and it can pass `next build` and only fail under `next start`. Read those values outside and pass them in as arguments. `draftMode().isEnabled` is allowed.\n  - `connection()` inside a cache scope throws.\n- **`cacheLife`:** `import { cacheLife, cacheTag } from 'next/cache'` (no `unstable_` prefix any more). The docs say to always pair it with `use cache`.\n\n  | Profile | stale | revalidate | expire |\n  |---|---|---|---|\n  | `default` | 5m | 15m | never |\n  | `seconds` | 30s | 1s | 1m |\n  | `minutes` | 5m | 1m | 1h |\n  | `hours` | 5m | 1h | 1d |\n  | `days` | 5m | 1d | 1w |\n  | `weeks` | 5m | 1w | 30d |\n  | `max` | 5m | 30d | 1y |\n\n  - Inline form: `cacheLife({stale,revalidate,expire})`. Custom profiles go in `next.config` under `cacheLife: {name:{...}}`.\n  - If `revalidate` is 0, `expire` is under 5 minutes, or `stale` is under 30 second
… (truncated)
```

<details><summary>Result (1 line)</summary>

```
{"success":true,"message":"Report delivered to your caller."}
```

</details>
