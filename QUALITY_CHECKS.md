# Phase 2 capture quality rules

Rule name: FaceFrame approximate capture checks, version **2.0.0**. These are conservative, application-specific retake heuristics, not calibrated model confidence, scientific measurements, medical tests or a guarantee of suitability. Automated face detection and these checks can miss problems and reject usable photos.

All checks run only after exactly one face has been detected. The configured maximum is 2: this can identify multiple detected faces, not count every person or guarantee a missed face is absent. No/multiple-face responses contain no selected person's landmarks. A failing check prevents acceptance and the overlay; its reason is displayed. A caution permits the overlay with the caution shown. No per-landmark or overall confidence is invented: FaceLandmarkerResult does not expose those values through this API.

| Check | Implemented rule on the prepared, unmirrored image |
| --- | --- |
| Very small face | Fail if the landmark bounding box is less than 120 px wide, 150 px high, 14% of image width or 18% of image height. A sufficiently small face may not be detected at all. |
| Clipped framing | Fail if any landmark bounding-box edge lies within 2% of an image edge (or outside the frame). This approximates face-outline clipping; it does not detect all hidden hair, forehead or occlusions. |
| Unsuitable pose | Fail if the eye-corner line (indices 33,263) has an absolute image-plane roll above 20 degrees; nose-to-cheek horizontal asymmetry (1,234,454) exceeds 0.48; or nose vertical position relative to forehead/chin (1,10,152) lies outside [0.28,0.78]. These proxies can respond to natural proportion differences; they are not accurate yaw/pitch angles or a structure report. |
| Severe blur / low detail | Resample the detected bounding-box region to 256×256 luminance. Calculate variance of a four-neighbor Laplacian, divided by luminance variance over interior pixels. Fail below 0.006; caution from 0.006 to below 0.025. A constant/near-constant region yields 0. This is a texture-based indicator, vulnerable to compression, noise, background edges and texture differences. It is not a universal blur detector. |

There is **no skin-tone classifier, absolute-brightness threshold or lighting pass/fail test**. The detail score is invariant to an ideal brightness offset and contrast scale (verified in tests). Real images can still differ in noise and texture; no fairness calibration is claimed. Guidance recommends even lighting to help capture, without judging natural skin color.

IMAGE-mode detection thresholds are 0.5 for detection and face presence. These are configuration thresholds, not returned confidence. Model-relative z stays an estimated coordinate; only x/y are used for this overlay and the quality checks. See the retained model cards and THIRD_PARTY_NOTICES.md.
