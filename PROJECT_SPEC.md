# FaceFrame project specification

## Product goal

A visitor uploads a face photo or takes a still photo with a laptop/mobile camera. FaceFrame processes it locally, draws facial landmarks and an estimated mesh, explains apparent face proportions and approximate face shape, suggests hairstyles with reference images, provides general sun-care and jawline styling information, and produces a downloadable report.

The core must work without an account, database, paid face-analysis API, LLM API key, or server photo processing. Use React, Vite and TypeScript, responsive CSS, the planned Google MediaPipe Face Landmarker, browser processing and local report generation. Retain compatible stable packages and the lockfile.

## Permanent rules — apply to all five phases

1. Continue this same codebase and preserve working features.
2. Keep photo pixels, landmarks and reports in browser memory unless the visitor explicitly exports them. Never put them in logs, analytics, URLs, localStorage or a backend.
3. A photograph supports apparent proportions and estimated geometry. Never claim exact depth, bone structure, physical millimetres, medical diagnoses or a scientifically perfect hairstyle.
4. Never invent measurements, model confidence, progress percentages, image licenses, test results or completed features.
5. Use neutral appearance language. Never infer identity, ethnicity, gender, personality or health from the face, or add attractiveness ratings.
6. Implement only the current phase. If an essential dependency is unavailable, finish unaffected work and identify the exact blocker.

## Five-phase roadmap

### 1. Foundation — completed

Polished accessible interface, upload/camera starting screen, photo guidance, empty analysis workspace, and Report / Hairstyles / Care / About-Privacy navigation. Genuine empty/loading/error/unavailable states. Shared PhotoAsset, QualityCheck, LandmarkFrame, Measurement, FaceAnalysis, Hairstyle and Recommendation contracts including dimensions/transforms, statuses, unavailable reasons, model/rule versions, references, and provenance. Separate capture, preparation, analysis, geometry, recommendations and report modules. Setup, specification and build-status documentation. No fake face report.

Acceptance: app starts; responsive navigation and empty states work; production build succeeds. Completed in the previous iteration.

### 2. Capture and detection — completed

Uploads, camera stills, image decoding/orientation, real local Face Landmarker output and quality checks. Cover denied permission, unsupported APIs, invalid/large files, no/multiple faces and model-load failure. Pin and document model/WASM versions, coordinate conventions and asset licenses. Release camera tracks and image resources. Keep all sensitive data ephemeral. Phase 2 itself makes no geometry or recommendation claims.

Phase 2 acceptance: suitable real photos produce corresponding landmark overlays; camera controls use the same preparation and IMAGE-mode inference pipeline. Accept only one detected face. Validate inputs and document approximate checks. Preserve privacy and reject stale jobs. Verify the production build, report unperformed hardware/browser checks and stop before Phase 3. See QUALITY_CHECKS.md and THIRD_PARTY_NOTICES.md for implemented rules and assets.

### 3. Structure report — completed

Documented ratios/proportions, approximate shape and estimated mesh. Include calculation definitions, landmark indices, rule versions, sources, and pose/perspective limitations. Preserve unavailable outcomes instead of guessing. No physical millimetres or exact depth.

### 4. Recommendations — completed

Preference-based hairstyle suggestions with verified licensed reference images and required attribution. Sourced general sun-care information and optional jawline styling guidance. Separate styling advice from model output and geometry. Avoid medical or appearance-based health inference.

### 5. Completion — implemented

Explicit local report export, integration checks and deployment preparation. Verify resource cleanup and privacy across the complete workflow; test responsive/accessibility and device behavior. No server photo processing. Only claim completed checks backed by evidence.

Phase 5 delivery: final report from the current FaceAnalysis; date, quality, available proportions/reasons, photo-free outline, selected reference credits, sourced care and methods. Explicit photo inclusion defaults off for print/PDF and PNG. A4/Letter print styling, local PNG, full visit reset and HTTPS static deployment instructions are implemented. Additive FinalReportData records export choices without changing detector/geometry semantics. BUILD_STATUS.md distinguishes actual inference, controlled lifecycle/error tests, limited photo coverage and unverified hardware/browser/live-host checks. No public deployment is claimed.

## Contract and architecture decisions

`Result<T>` separates empty/loading/ready/unavailable/error. No numeric sentinel represents missing data. Transform metadata describes orientation, crop, resize and mirroring in order; landmarks refer to normalized prepared-image coordinates. Model-relative z is estimated and never a physical depth. PhotoAsset holds an in-memory Blob and avoids storing filename metadata. `VersionedMethod` carries rule/model name, exact version and source references. Hairstyle reference images require creator, license, attribution and source. Recommendations are explicitly styling advice. Capture, preparation and detection are implemented in Phase 2. Phase 3 geometry/report modules consume the actual accepted frame and quality checks. Shared FaceAnalysis retains the report in memory across navigation and invalidates on replacement/reset/retake. Phase 4 recommendations extend FaceAnalysis with the current preferences, recommendations, catalog version and complete image-credit records; Phase 5 adds explicit local final-report and PNG export. Existing fields remain; optional EXIF metadata, image-quality provenance, measurement traces, visibility assessments and versioned shape-rule configuration extend the contracts without removing Phase 1 fields.

Phase 3 acceptance: pixel-space geometry with documented landmark indices, unavailable reasons, visibility uncertainty, configurable provisional shape rules, photo/landmark/annotated outline views and an optional rotatable relative-depth mesh. Every photo-derived number comes from the current frame. Verify known geometry and retain useful 2D output if the mesh fails. See GEOMETRY_METHODS.md. Phase 3 stopped before Phase 4.


Phase 4 acceptance: preferences materially constrain/rank suggestions; unknown choices and all-style browsing work; at least 12 suitable references have verified usage records (target 24); filters, details, session favourites and three-style comparison work. Care content uses current authoritative sources with actual review dates and no appearance-based diagnosis. Keep source/credit metadata with recommendations for future exports. Stop before Phase 5. The current collection has 24 completed generated references; see HAIRSTYLE_CATALOG.md and BUILD_STATUS.md for actual verification and limits.

