# FaceFrame — visual studio and live processing states (1.3.0)

A React/Vite/TypeScript website with real browser-local still-image landmark detection, traceable apparent proportions, provisional shape descriptions, an annotated contour and an optional estimated mesh. The existing design and contracts are retained. There are 24 locally bundled generated hairstyle references, practical preferences, session favourites/comparison and sourced general care. Phase 5 adds local print/PDF and annotated PNG exports, photo exclusion by default, full-session reset and deployment preparation. No live deployment is claimed.

## Run locally

Node.js 20.19+ on 20.x, or 22.12+; Node 24 recommended. Developer unit tests require Node 22.18+ or Node 24 for built-in TypeScript stripping.

```sh
npm ci
npm run dev
```

Run these commands in the directory containing package.json (`outputs/faceframe` in this workspace, or `faceframe` after extracting the source ZIP). Open Vite's printed Local URL (normally http://127.0.0.1:5173). No API keys, environment variables, account, database or backend are required. Model, WASM and licenses are already included; no CDN download is needed at runtime.

```sh
npm test
npm run verify:assets
npm run verify:catalog
npm run typecheck
npm run build
npm run preview
```

Build checks pinned asset hashes, strict TypeScript and production bundling. Preview serves `dist/` locally. Stop dev/preview before running `npm ci` on Windows to avoid locking native Vite modules. Retain package-lock.json and use `npm ci` to reproduce installation.

## Use

1. Choose Men’s styles, Women’s styles or All styles before uploading. This is your reference preference; the app never infers gender from your photo. Then choose Upload a photo or drop exactly one JPEG, PNG or WebP into the upload card.
2. Alternatively, choose Start camera, allow video access, then Capture. Retake opens a new preview. Close camera cancels capture. Camera requires HTTPS or localhost; embedded browsers may restrict access. Upload remains available.
3. The same pipeline prepares either source and automatically loads the local detector, analyzes one still in a worker and runs the implemented quality checks. No continuous video analysis occurs.
4. Exactly one detected face that passes the checks opens Results automatically. No/multiple faces and rejected quality remain in the capture workspace with a retake reason. Open Analysis status & photo for the actual landmark overlay or retry controls; Retry using CPU handles recoverable runtime errors.
5. Results leads with the actual outline, plain-language explanation and three highlighted proportions. Review visibility before shape guidance; reported obstructions make affected values unavailable. All proportions & measurement methods retains every calculation. Explore landmarks & the estimated 3D mesh contains photo/landmark/outline views, endpoint inspection and optional rotation. Download report is at the top of Results and in the persistent header.
6. Navigation retains the current photo/report in browser memory. Clear photo / reset, Retake photo, choosing replacement input or reloading invalidates the report. Leaving capture stops the camera and its worker. Switching browser tabs stops a live camera. Start over / Delete current analysis also clears independent visit preferences, favourites, comparisons, care choices and pending exports.

## Input limits and canonical image

- Nonempty files up to 12 MiB (12 × 1024 × 1024 bytes).
- At most 24,000,000 source pixels and 12,000 pixels per side, checked from actual container headers **before decoding**. Browser decoding must also succeed and match the header dimensions. Filename and supplied MIME alone are never trusted.
- Standard JPEG (baseline/progressive), still PNG and still WebP. APNG and animated WebP are rejected. Corrupt/unsupported metadata and files are rejected. A damaged image that a browser decoder repairs is not a guarantee of complete file-integrity validation.
- JPEG APP1 EXIF, PNG eXIf and WebP EXIF orientation are read and removed before explicit orientation transforms, including reflected EXIF variants. Metadata-free PNG is the single canonical image. EXIF/GPS metadata is not retained in it.
- Preserve aspect ratio, never upscale, resize to a maximum 1280-pixel edge, flatten alpha onto white, never crop. ImageTransform records raw/prepared dimensions, clockwise rotation, optional EXIF reflection, resize factors and no final mirroring. EXIF reflection precedes rotation. Scale factors refer to oriented dimensions, including one-pixel rounding.
- Camera canvas uses the video's intrinsic dimensions. Only CSS mirrors the live preview; capture uses unmirrored source pixels, then the same preparation pipeline. Extremely large camera frames are rejected before allocating a still canvas. The captured PNG must meet the same byte/pixel limits.

## Detector and browser support

`@mediapipe/tasks-vision@1.1.1`, IMAGE mode, numFaces=2, detection/presence thresholds 0.5, blendshapes/transformation matrices disabled. The versioned float16/1 model and matching runtime files are served from the app origin. The build verifies hashes and version matching. See THIRD_PARTY_NOTICES.md and public/asset-manifest.json.

The worker uses the official module fileset resolver (`forVisionTasks(path, true)`). GPU initialization is attempted first; failure tries a real CPU delegate. CPU retry is also available. This runtime can still require browser WebGL support for image handling even with the CPU delegate. If worker APIs, runtime initialization or both delegates fail, the interface reports failure/unavailability rather than making results. No main-thread inference fallback is enabled or claimed. Tested browser is the desktop app's Chromium-based browser; Safari, Firefox, physical iOS/Android and actual camera hardware remain unverified.

Only one job is permitted per client/worker. New input/reset/unmount terminates the prior worker and invalidates generation tokens. Both async preparation and detector callbacks check the current generation. Initialization and analysis have cancellation/timeout paths. ImageBitmaps are closed after drawing/transfer/inference; temporary canvases are zeroed. Capture creates no image object URLs. Export uses temporary Blob download URLs, revokes them after the download request and revokes outstanding handles on cleanup. Clear/replacement drops canonical Blobs and results; leaving capture releases WASM memory through worker termination. Garbage-collection timing is browser-controlled, not forensic secure erasure.

## Modules and shared data

`src/contracts.ts` preserves PhotoAsset, QualityCheck, LandmarkFrame, Measurement, FaceAnalysis, Hairstyle and Recommendation. Optional EXIF fields and calculated-image-quality provenance extend existing fields. `Result<T>` continues to distinguish missing, pending, ready, unavailable and error outcomes. Model/rule versions and source references accompany real output. Confidence remains unavailable because this API does not expose overall/per-landmark confidence.

`src/modules/` separates capture, image preparation, worker orchestration, detection, quality, pure geometry, recommendations, report rendering and image export. FaceAnalysis distinguishes model output, calculated geometry and styling interpretation. Additive FinalReportData records export dates, selected references with full credits and explicit photo inclusion; photo-ID guards reject mismatches. See GEOMETRY_METHODS.md for every selection, formula, shape rule and mesh convention.

See QUALITY_CHECKS.md for exact, application-specific size, framing, pose and blur thresholds. These are fallible retake heuristics, not scientific measurements. No skin-tone or lighting classifier is implemented.

## Privacy

Photo pixels and landmarks stay in memory: browser File/Blob → canvas/ImageBitmap → local worker → overlay. No photos/results in URLs, logs, analytics, localStorage, sessionStorage, IndexedDB or a backend. The application creates no cookies, service workers or account. Vendor console output is suppressed inside the inference worker; raw runtime exceptions are not forwarded to UI or logs.

Runtime requests retrieve only same-origin application files, the worker, hairstyle references, WASM and model; the production CSP restricts connections and scripts to this origin. The host sees normal static-file requests. Browser caching of public model/runtime files is permitted; no application persistence is used for photos/results. A local production audit observed only expected static GETs and zero request-body bytes during real inference; see BUILD_STATUS.md for scope and limits.

## Developer verification tools

`npm test` runs 37 metadata, quality, geometry, topology, visibility, shape-rule, catalog/provenance, preference-matching and export/privacy/resource tests. With `npm run dev`, open `/tests/browser.html` for decode/orientation/limit checks, the preview-recovery regression and a test-injected GPU failure followed by real CPU initialization. `tests/camera-fixture.ts` provides controlled streams/errors; it is not imported by the app. Tests are not part of the production entry and no test photos are shipped. Test code never substitutes landmark results.

See BROWSER_COMPATIBILITY.md for the API review, actual browser/device coverage and remaining release checks. HTTPS is required for public deployment and secure photo-ID/camera APIs; missing secure UUID support now gives a readable message. Camera/worker cleanup also handles page-history suspension, and PNG canvas size is bounded for mobile memory/dimension limits. No detector, geometry/shape rules or quality thresholds were changed by this QA pass.

For local production network counters, build then run `node scripts/serve-check.mjs` and open http://127.0.0.1:4175. Its `/__qa_stats` endpoint returns only aggregate method/path/body-byte counts, never request URLs, body contents, photos or landmarks. This is a developer-only static QA server, not a product backend.

See PROJECT_SPEC.md for permanent rules and all five phases, and BUILD_STATUS.md for performed checks and remaining hardware/browser/live-host limits. Phase 5 implementation is delivered; no public deployment or physical-camera validation is claimed.

## Hairstyles and care

Open Hairstyles with or without a photo. Choose texture, current/desired length, daily styling time, preferred categories and facial-hair opt-in. Unknown/no preference is supported. Longer-than-current cuts require explicit grow-out opt-in. Practical choices filter the catalog before any optional geometry tie-break. Missing/uncertain geometry uses preferences alone. Five recommendations are shown when five entries qualify; fewer matches or zero matches are explained rather than padded. Remaining ties use a varied editorial reference order, not a fit score.

Use Show all styles to bypass recommendation preferences and browse the whole collection, then narrow by gallery length/texture/maintenance filters. Expand details and image credits; favourite styles or compare up to three. These choices live only in App memory and reset on reload. Photo reset clears photo-derived reports; preference/favourite choices can remain for the same visit. Report recommendations update from the same accepted FaceAnalysis without inference and retain image-credit records.

All 24 reference PNGs are individually generated fictional adults, visually inspected on 2026-10-18 and copied unchanged into public/hairstyles. They are references, not virtual try-on or photos of the visitor. Generation is a development-time asset workflow: the website needs no image/LLM API key, paid generation service or external photo request. See HAIRSTYLE_CATALOG.md, public/hairstyles/credits.json and its hash manifest. npm run verify:catalog runs during the production build.

Gallery/comparison display uses 24 local 768-pixel WebP derivatives: 1,381,254 bytes total versus 55,987,352 original PNG bytes (97.5% less gallery image data). The originals remain unchanged for source links and reports, so this is not a reduction of detector accuracy or a claim that the entire deployment shrank. A missing preview falls back to its original. `public/hairstyles/preview-manifest.json` records source hashes, modifications, sizes and derivative hashes; build checks verify every association. To regenerate after adding/replacing catalog assets, optionally install Pillow in a development Python environment and run `python scripts/generate-previews.py`. Python/Pillow is not required to install, build or run the delivered app because all derivatives are included.

Care asks the visitor's concern rather than examining skin colour. General sun/gentle-care information links to AAD sources reviewed 2026-10-18; optional jawline presentation ideas explain appearance versus anatomy and link AAO guidance about DIY reshaping. Beard-edge suggestions require opt-in. See CARE_CONTENT_SOURCES.md. This is general education, not diagnosis or a prescription.

## Final report and local export

1. Suitable detection opens Results. Review visibility, then set practical preferences and optionally favourite references in Hairstyles. Download report in the header opens the final preview from any section. In Results, Export options & selected hairstyles lets you select up to five references. Defaults use preference-compatible favourites, otherwise the first three suggestions. Gallery choices outside current preferences are identified.
2. **Include my original photo (prepared)** starts off whenever export controls mount. This applies to print/PDF and PNG independently of the screen photo/landmark toggle. Off uses only an outline from actual detected points. On includes the orientation-corrected, resized canonical photo, not the raw upload.
3. Press **Download report** to open the local print preview. It includes dates, actual quality/available values and unavailable reasons, outline, selected references, care, limitations, sources and method versions. Complete image credits have their own always-included section. No new inference runs. Reference images decode before printing is enabled; failed images retain their credit and a clear message.
4. Choose **Print / Save as PDF**, then Save as PDF in the browser dialog. Use A4 or Letter, portrait, normal scale; optionally disable browser headers/footers. Text is selectable, with section/card page breaks. Drivers and browser defaults vary. Embedded browsers may restrict the native dialog; open the site directly in a full browser. No server or paid PDF service is involved.
5. **Download annotated structure image** requests a local PNG with the actual outline/spans, rounded values and method versions. Every export uses a fresh canvas. Photo-free export never decodes/draws the photo. Bitmaps/canvases are released after encoding, including cancellation/error paths.
6. **Start over / Delete current analysis** clears the whole visit, pending work and resources. Retake/Clear photo invalidate the photo/report while allowing independent preferences to remain. Reset cannot delete already saved exports or guarantee forensic memory erasure. Use browser/OS file controls for saved PDFs/PNGs.

Print preview traps focus, makes the background inert, supports Escape/Back and restores focus to its opener. The independent SVG outline keeps the report useful if 3D rendering fails. Ctrl+P outside the explicit preview prints instructions instead of the photo-bearing workspace. Browser print/save settings are outside the application's control.

## Adding hairstyle references

See HAIRSTYLE_CATALOG.md. Obtain permission at the original source, visually verify the named cut/texture and bundle the permitted image locally. Add a typed CatalogStyle in `src/modules/hairstyleCatalog.ts` with practical requirements and a complete rights record: original URL, creator, usage basis/license URL, required credit, modifications, review date and generation record if generated. Add matching `public/hairstyles/credits.json` and byte/SHA-256 manifest entries, then regenerate/check gallery derivatives and their manifest as described above. Never count pending/unverified references as completed. Run `npm test` and `npm run build`; inspect the card and print credit. Asset/source links resolve through Vite's base.

## HTTPS static deployment

There is no existing FaceFrame hosting configuration or connected hosted site. Nothing was published or purchased. The production ZIP contains the **contents of dist**, with index.html at its root. The source ZIP contains pinned assets, notices, lockfile and tests, without node_modules or test photos/reports.

Upload every file in `dist/`, preserving `assets/`, `models/`, `vendor/`, `hairstyles/`, `licenses/` and `_headers`. Serve JavaScript correctly and `.wasm` as `application/wasm`; do not rewrite missing model/WASM requests to index.html. Use HTTPS publicly; `file://` is unsupported. Keep all model/runtime files on the same origin. The deployed app needs no backend, keys, account system or database.

One compatible option is [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/): build locally; open Workers & Pages in your own account; choose the Pages upload workflow; name the project; upload the `dist` folder/production ZIP; deploy and open the assigned HTTPS address. These are instructions, not an executed publication. For Git integration, choose the directory containing package.json as root, Node 24, build `npm ci && npm run build`, output `dist` ([build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)).

`public/_headers` supplies CSP, no-referrer, nosniff and video-only permissions policy for hosts supporting that format. Apply equivalent response headers if ignored. HTML also carries CSP; frame-ancestors protection requires the response header. Open directly rather than inside an iframe unless its camera policy is deliberately configured. Do not inject analytics/session recording.

Cloudflare Pages' documented single-asset limit was **25 MiB** when checked 2026-10-18 ([official limits](https://developers.cloudflare.com/pages/platform/limits/)). The largest current asset is 13,519,940 bytes. No pricing/free-bandwidth guarantee is made. Hosting, traffic, a custom domain and optional development/design tools can have separate costs. FaceFrame uses no paid per-photo analysis API and its bundled references need no runtime generation subscription.

For a subdirectory, build for its exact trailing-slash base rather than moving a root build:

```sh
npm run build -- --base=/faceframe/
npm run preview -- --base=/faceframe/ --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173/faceframe/. A separate `/faceframe/` production build was exercised with actual inference, all 24 images, report and export. Root deployment uses default `npm run build`. Base changes require rebuilding.

After publishing, open the actual HTTPS/base URL. Confirm worker/model/WASM/images load, upload a permission-cleared photo, inspect alignment/geometry, change preferences, save photo-free PDF/PNG, test photo opt-in/out and reset during analysis. Test camera start/capture/close on target hardware. Confirm only public static downloads and no photo/report network payloads. Inspect A4/Letter and target browsers/devices before claiming those deployment checks. No live-host validation has been performed here.


## Historical style presentation and readable reports (1.1.0)

In Hairstyles, choose Style presentation → Masculine styles, Feminine styles, or All styles/no preference. Presentation is a visitor choice, never inferred from the photo. These editorial reference groups do not restrict who may wear a cut. The current masculine collection focuses on short styles; unavailable combinations return fewer matches instead of unrelated references. Texture and desired length remain strong constraints. Show all styles explicitly bypasses preferences. Preferences remain session-only.

Report starts with an at-a-glance explanation. Review visibility to enable shape guidance; the app never fills an unconfirmed category. The standard print report uses readable labels, a compact method record, sources and full image credits. Enable the optional technical appendix for formulas, indices, thresholds and detailed limitations. Original photo still defaults off independently. Automatic report selection excludes favourites outside current preferences; you can still explicitly select those favourites. Changing preferences reinitializes export choices with photo inclusion off. Calculation algorithms and the model are unchanged.

## Historical explicit-choice update (1.1.1)

A fresh visit or reset now starts with no reference group selected. Uploading a photo does not select gender or populate a mixed recommendation list. In Hairstyles, press **Men’s / masculine styles**, **Women’s / feminine styles**, or explicitly choose **All styles / no preference**. The men’s group contains five curated short-cut reference images (crop, side part, quiff, wavy taper, curly taper). Coiled-texture and medium/long men’s reference coverage is missing; those combinations return no matches instead of substituting other references. All 24 assets remain accessible in explicitly selected mixed browsing.

The gallery labels its active mode. Pressing a group button always exits mixed browsing, resets gallery filters and clears comparison cards, including when that group was already selected. Reset preferences requires a new choice. Choices remain in browser memory only; a reload clears them. A report cannot automatically insert favourites before a group is chosen. Existing geometry, detection and photo-free export behavior remain unchanged. In an already-open Chrome tab, use Ctrl+Shift+R to load the updated build, then upload again and choose your group.

## Interface refinement (1.2.0)

The existing application uses a three-step photo/results/styles journey, a compact capture screen, explicit reference choice before upload, clearer measurement highlights and prominent report access. Secondary preferences, filters, formulas and mesh controls remain available under labelled disclosures. Men’s styling coverage is still five short-cut references; the other catalog assets and all rights records are preserved. See DESIGN_REVIEW.md for the eight analyzer references and 21st.dev reviewed before implementation.

Screen CSS is isolated in `src/interface.css`; print styling remains independent. No new runtime dependencies, detector changes, quality-threshold changes or shape-rule changes were introduced. Report format 5.2.0 removes repeated reference metadata from the reading path and retains full credits separately. This is a modification of the same React codebase. No replacement app or live deployment is claimed.

## Visual studio update (1.3.0)

The user-requested visual layer in `src/studio.css` adds charcoal surfaces, mint/lavender accents, sans-serif display type, stronger buttons, bounded hover effects and a gently floating original SVG illustration. The illustration is explicitly decorative; it is neither a detected face nor a sample report. `VisualEffects.tsx` also renders an indeterminate scan illustration only while the real pipeline is preparing, loading or analyzing. Its phase label follows application state. There are no invented percentages, simulated completions or minimum-duration delays.

Pause effects in the illustration, or Pause visual effects in the footer, disables decorative animations and transitions for the visit. The system’s `prefers-reduced-motion` setting automatically disables them. Neither option pauses inference. Effects use CSS/SVG; no Python server, animation library, remote script, WebGL shader or additional runtime package is required. The existing print preview remains light, with original-photo inclusion off by default. The studio styles are screen-only and scoped away from report printing.
