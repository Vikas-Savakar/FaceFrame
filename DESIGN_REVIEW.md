# FaceFrame interface review — 2026-10-19

This is an interface review, not an accuracy or privacy audit of competitors. No visitor photo was submitted. The existing project, model, calculations, licensed assets and browser-local processing are retained. 21st.dev supplied visual inspiration; no third-party component code, paid kit, remote script or new UI dependency was installed.

| Reference | Actual review | Adopted pattern / boundary |
| --- | --- | --- |
| [21st.dev](https://21st.dev/) and component search | Live visual review of homepage and loaded search for minimal cards/dashboard/file upload | Quiet borders, clear primary actions, progressive disclosure. Original implementation in existing React/CSS. |
| [My Face Shape](https://myfaceshape.app/) | Primary content and live screenshot | Short guidance and practical next steps; keep capture easier to reach. |
| [MeasureFace](https://measureface.com/) | Primary content and live screenshot | Prominent report action and privacy wording; no paid-report flow, ideal-ratio grading or precise-depth claims. |
| [Hiface](https://www.hifaceapp.com/face-shape-detector/) | Primary content and live screenshot | Simple styling-oriented heading; keep the app usable without another app download. |
| [Perfect Corp scanner](https://www.perfectcorp.com/business/products/face-scanner-online) | Primary content and loaded live screenshot | Visual/summary pairing and short sequence; leave out commercial navigation and attribute overload. |
| [Face Shape Detect](https://face-shape-detect.com/) | Primary content and live screenshot | Focused upload card; retain stricter supported formats and honest estimates. |
| [DetectMyFaceShape](https://www.detectmyfaceshape.com/) | Primary content and live screenshot | Compact capture/result pairing and explicit styling choice; no confidence percentages or audience counters. |
| [Face Shape Detector](https://www.face-shape-detector.com/) | Primary text; live navigation timed out, then error-page access was denied by browser policy | Text-only reference, no visual-review claim. |
| [faceshape-detector.com](https://faceshape-detector.com/) | Primary text; browser displayed a verification screen | Text-only reference. No interaction with verification. |

Eight analyzer references were reviewed: six visually, two via primary text, plus 21st.dev. Their public claims are not validation of model accuracy. No reference-site portraits, brand assets, copy or supposed confidence scores were added.

## Final direction

- Keep the forest-green identity, with lighter surfaces, deliberate spacing and clearer typography.
- Put the explicit men’s/women’s/all reference choice beside photo capture. Photo pixels never choose gender. An unset preference produces no mixed suggestions.
- Retain capture and quality/error handling. Accepted analysis opens the existing Results component directly.
- Put Download report in the persistent header and result bar. It opens the local print preview; the browser provides Save as PDF. Photo inclusion stays off.
- Lead with the actual photo-free outline, a plain-language shape state and three actual proportions. Visibility review remains explicit.
- Collapse detailed methods, extra measurements and mesh tools while preserving inspection, sources and limitations.
- Show reference cards promptly. Keep core hair preferences visible, with secondary filters/rationale disclosed on demand. Preserve credits and explicit mixed browsing.
- Keep screen styling separate from printing, and inspect actual A4/Letter output. Preserve the working modules and contracts.
