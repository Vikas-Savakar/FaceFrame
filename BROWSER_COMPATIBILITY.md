# Browser compatibility review — 2026-10-18

This is a code/API review plus the explicitly recorded tests below. It is not a cross-browser certification. No user-agent spoofing or desktop viewport emulation is counted as a physical mobile/Safari/Firefox test.

2026-10-19 interface update: production upload, real inference, automatic Results navigation, invalid-input focus, hairstyle filtering/comparison, local PNG and A4/Letter print-engine output were checked again in Windows embedded Chromium. Viewports of 320, 390 and 844 CSS pixels were exercised; these are responsive layout checks only. Shared reference images retain local preview/original fallback. No new camera API, worker/runtime or renderer dependency was introduced. Physical hardware and the other browser rows below remain unverified in this update.

## Actual coverage

| Target | What was actually available | Release check still needed |
| --- | --- | --- |
| Embedded Chromium on Windows | Production upload/inference, CPU retry, previews, responsive CSS, controlled camera/worker lifecycle, local exports | Native OS print dialog and real camera hardware |
| Standalone desktop Chrome | New-tab automation failed; existing error tabs were blocked by the browser URL policy. No workaround used | Full journey in a normal Chrome window |
| Android Chrome | No Android device/browser session available | Front camera, portrait/landscape rotation, permissions, memory pressure, downloads and print UI |
| iOS Safari | No iPhone/iPad or Safari session available | Worker graphics on the actual OS, camera lifecycle, photo picker/orientation, downloads, print/share UI |
| macOS Safari | No macOS/Safari session available | Real GPU/CPU initialization, camera, reset, print/PDF and downloads |
| Firefox | No Firefox session available | Real MediaPipe initialization/inference and all export/lifecycle paths |

Google's [Web setup guide](https://developers.google.com/edge/mediapipe/solutions/setup_web) names Chrome and Safari. Firefox is therefore an unverified application target, not a promised upstream-supported configuration. Browser/driver tests are required before advertising support. MDN documents the secure-context requirement for [crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID).

## API assumptions and handling

| Area | Implementation / limits |
| --- | --- |
| Secure context | Deploy over HTTPS; localhost is suitable for local QA. `crypto.randomUUID()` and camera access need a supporting secure context. Missing UUID API now gives a readable error before decoding. `file://` is unsupported. |
| Camera | User action invokes `getUserMedia({audio:false, video:{facingMode:'user', …ideal dimensions}})`. Front-facing is a preference, not an exact hardware constraint. Video is muted/playsInline; CSS alone mirrors the preview. Capture uses intrinsic video dimensions and the common still-image pipeline. Permission/no-device/in-use messages retain upload fallback. |
| Camera lifecycle | Generation tokens handle permission/play/capture promises arriving late. Tracks stop on Capture, Retake, Close, reset, component navigation and visibility loss. `pagehide` also stops tracks and cancels workers/pending preparation for page-history suspension. Interrupted processing becomes retryable; a completed in-memory report may remain. No unload handler or permanent storage is used. |
| Decode/orientation | JPEG/PNG/WebP are byte-checked and actually decoded. EXIF orientation is removed before the explicit transform, so browser auto-orientation cannot apply it twice. All eight orientation corner patterns were checked in Chromium. HEIC/HEIF and animated formats remain outside the accepted formats: export JPEG/PNG/WebP or use a camera still. |
| ImageBitmap | Preparation, preview, transfer and optional-photo export use real ImageBitmap APIs, with close/finally cleanup. Missing preparation API fails clearly. A failed preview canvas stays mounted and can recover on redraw; it no longer leaves a null ref. Actual decoder/memory behavior still needs device testing. |
| Worker/model/WASM | One IMAGE-mode job at a time; pinned same-origin model/runtime, module worker, OffscreenCanvas and transferable ImageBitmap. GPU initialization falls back to real CPU; CPU image handling can still require graphics support. No untested main-thread inference fallback was added. Missing APIs or failed delegates produce honest failure/retry states. |
| Apple worker graphics | API presence alone is insufficient: WebKit documents OffscreenCanvas 2D in Safari 16.4 and WebGL in Safari 17 on supporting Apple OS versions. Older engine/OS combinations may expose only part of the API. Use a current Safari/OS combination and test the actual hardware. See [WebKit release details](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/). |
| Canvas/export size | Preparation stays at a 1280-pixel edge. PNG export now caps image-area height at 2048, adds a 220-pixel footer and centers narrower imagery on an at-least-800-pixel canvas. Canonical inputs keep the output below 1280×2268. Uniform scaling preserves alignment. This avoids the former tall-image upscaling beyond conservative mobile canvas dimensions; it does not reduce detector resolution. |
| Object URLs/downloads | Only explicit PNG export creates temporary Blob handles. They are revoked after the request and on cancellation/reset/unmount. The filename is a download hint; browser save policies differ. The interface says “requested”, not “saved”. Test iOS/Firefox actual save behavior. No report upload or third-party PDF service is used. |
| Printing | User action calls window.print from an image-ready local HTML preview. Screen-only small-target rules do not affect print. Print CSS makes the overlay static and hides the photo-bearing background; SVG outlines, text and source links remain. A4/Letter were inspected using Chromium print-to-PDF; other engines and native dialogs remain unverified. |
| Gallery | 24 verified 768-pixel WebP derivatives, lazy/async decoding, same-original association manifest, original-PNG fallback. Original source/rights records and report PNGs remain intact. All current target engines should be tested rather than assuming file support proves the whole app works. |
| Optional 3D | Lazy canvas-2D wireframe, no added WebGL renderer dependency. A renderer failure preserves the independently rendered 2D report/export. Pointer controls have keyboard sliders. |
| Layout/focus | Narrow/coarse-pointer controls have larger hit areas and 16-pixel select text. Responsive grids, internal table scrolling and wrapped print URLs preserve the visual identity. Print modal uses inert/background focus isolation plus keyboard cycling/Escape. Reduced motion is retained. No screen-reader/device audit is claimed. |

## Supporting API references

Reviewed 2026-10-18; these explain assumptions, not proof of device compatibility.

- [getUserMedia secure contexts, constraints and errors](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [createImageBitmap options](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap).
- [Canvas maximum dimensions](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas): limits depend on browser/device; overly large canvases can become unusable.
- [pagehide and page history](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event): complements visibilitychange and supports back/forward caching; neither event guarantees delivery after a mobile process is killed.
- [Blob URL lifetime](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob), [download hint limitations](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download).

Do not weaken CSP, enable remote scripts, move inference to a server or change measurement thresholds as a substitute for target-browser testing. Run the full journey on the eventual HTTPS origin, including denied permissions, background/Back navigation, failed model download, retake, photo-free/on/off export and reset during analysis.
