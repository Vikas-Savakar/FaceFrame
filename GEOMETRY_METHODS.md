# Phase 3 geometry and interpretation methods

Version: FaceFrame image-plane chord geometry 3.0.0; provisional styling shape rules 3.0.0. Implementations: `landmarkSelections.ts`, `geometry.ts`, `shapeRules.ts`. No inference is rerun when changing visibility or views.

## Source and index verification

Use only the accepted, exactly-one-face `LandmarkFrame` from the pinned `tasks-vision@1.1.1 / float16/1` runtime/model and its prepared-image transform. Model confidence is not supplied and is not invented. Zero-based selected contour/eye indices are checked against the pinned package connection sets and the official canonical OBJ reference. Tests verify the reference hash and selected paired vertices. The reference is never used to measure a visitor's photo; all endpoints are actual frame coordinates. See THIRD_PARTY_NOTICES.md for provenance/license.

Sources: [official connections](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py), [canonical index reference](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj), [NormalizedLandmark definition](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.normalizedlandmark).

## Consistent image coordinates

For the unmirrored, orientation-corrected canonical image width W and height H, convert each point to P=(x*W,y*H). All chord lengths are Euclidean distances between these pixel points; all angles use these points. Never calculate ratios directly from raw normalized x/y in a rectangular photo. No physical-size or camera-calibration assumption is used. Euclidean distances/angles are invariant to a rigid image-plane rotation; no roll leveling is necessary. No yaw/pitch or perspective correction is claimed. The Phase 2 quality gate still applies.

| Symbol | Landmark endpoints | Meaning | Visibility regions |
|---|---|---|---|
| H | 10–152 | Top visible model contour to chin; not hairline | upper, lower |
| C | 234–454 | Selected lateral cheek-contour span; not cheekbones | cheeks |
| L | 172–397 | Selected lower-face contour span | lower |
| U | 54–284 | Selected upper-face contour span; not hairline | upper |
| N | 2–152 | Central nose-base surface selection to chin | nose, lower |
| E | 133–362 | Selected inner eye-corner gap; not pupil distance | eyes |

Reported dimensionless ratios: H/C, L/C, U/C, N/H, E/C. These particular straight spans are visible contour proxies, not maximum anatomical widths or clinical facial thirds. Eye spacing uses C as the defined visible width proxy. Raw results remain full precision in FaceAnalysis; display rounds ratios to two decimals and an angle to whole degrees. Inspection pixel coordinates/chord lengths round to one decimal and are explicitly image pixels. Every card retains its formula, method version, indices, endpoint coordinates, spans, availability and explanation.

Invalid/noninteger/nonpositive dimensions, missing/duplicate/nonfinite/out-of-frame selected endpoints or chord lengths <= max(W,H)*1e-6 produce unavailable values, not zeros. Independent valid measurements remain available. Missing/failed size/framing/pose/blur checks withhold measurements and mesh; shape requires its three ratios. No-face/group photos are rejected upstream and geometry also guards exactly one face. Degenerate calculations never produce placeholder results.

## Optional apparent contour angle

At point 172, calculate acos(dot(P132-P172,P152-P172)/(length(P132-P172)*length(P152-P172))) in degrees, clamping the cosine to [-1,1]. This is the viewer-left apparent 2D lower-jaw contour chord angle: selected surface chords, not a clinical gonial/jaw-bone angle. Endpoints 132,172,152 are shown in inspection. Require acceptable capture checks, user-confirmed visible side/lower contour and valid chords; nearly collinear angles <5 or >175 degrees are unavailable. These guards do not validate anatomical accuracy. Pose, facial hair, expression and model endpoint error can change the result.

## Visibility and suitability

Automatic obstruction detection is not implemented. Default visibility is unassessed. Ratios can be shown as uncertain model-contour estimates, with a visible warning; shape descriptions and the angle remain unavailable until the visitor confirms review. User-marked upper/cheeks/lower/eyes/nose obstruction withholds any dependent ratio and angle. Upper, cheek or lower obstruction withholds shape. Any reported obstruction withholds the mesh. Confirmation is a fallible user report, not detector verification. Unsuitable input prompts a retake rather than a forced category. See QUALITY_CHECKS.md for the existing approximate capture rules.

## Explainable shape rules

Let h=H/C, l=L/C and u=U/C. Defaults below are configurable in the exported SHAPE_THRESHOLDS object, or via calculateGeometry's thresholds argument. FaceAnalysis stores the applied thresholds/method even when a result is unavailable. Finite nonnegative configuration is required. These are provisional, unvalidated application styling heuristics, not anatomy, ideal targets, learned model predictions or probabilities.

| Configuration | Default |
|---|---:|
| shortMax | 1.30 |
| ovalMin / ovalMax | 1.20 / 1.50 |
| longMin | 1.50 |
| narrowLowerMax / broadLowerMin | 0.78 / 0.82 |
| broadUpperMin / narrowUpperMax | 0.78 / 0.82 |
| upperLowerDifference | 0.08 |
| balancedDifferenceMax | 0.10 |
| roundLowerMin | 0.62 |

| Description | Matching conditions |
|---|---|
| round | h<=shortMax; roundLowerMin<=l<broadLowerMin; abs(u-l)<=balancedDifferenceMax |
| square | h<=shortMax; l>=broadLowerMin; abs(u-l)<=balancedDifferenceMax |
| oval | ovalMin<=h<=ovalMax; l<broadLowerMin; u>narrowUpperMax; abs(u-l)<=balancedDifferenceMax |
| oblong | h>=longMin; abs(u-l)<=balancedDifferenceMax |
| heart | u>=broadUpperMin; l<=narrowLowerMax; u-l>=upperLowerDifference |
| diamond | u<=narrowUpperMax; l<=narrowLowerMax; abs(u-l)<=balancedDifferenceMax |
| triangular | l>=broadLowerMin; l-u>=upperLowerDifference |

One match gives that suggestion; several give mixed with every matching rationale; none gives uncertain. Available proportions are quoted in each explanation. Square does not claim bone angularity, heart does not measure hairline, and diamond does not measure cheekbones. No probability percentages or attractiveness score. Unknown/obstructed contours or unavailable required ratios withhold classification. Eye spacing and lower-height ratio are not used by these rules.

## Structure views and mesh

The prepared photo and actual landmarks use the same canonical image; report view toggles do not rerun inference. The clean outline draws official oval edges from current x/y coordinates. Selected numerator/denominator spans and index labels use the same pixel system; inspection shows their current coordinates. The viewBox fits the contour for readability without changing measurement coordinates.

The lazy local renderer draws an orthographic rotatable wireframe on a 2D canvas, adding no WebGL dependency or new renderer package. All 478 vertices are actual detected points. Surface connections use the official 852 tessellation triangles over the base mesh; iris points remain points. For rendering only: X=x*W, Y=y*H, Z=z*W. Center X/Y on their bounding box and Z on its mean; invert Y/Z, then divide all three by the same max(X span,Y span). No depth exaggeration or physical units. Rotation is bounded +/-60 degrees yaw and +/-35 degrees pitch using pointer drag or labeled keyboard sliders. No template/hidden geometry is filled in. Nonfinite z or absent points can withhold the mesh while preserving valid 2D values. Failed lazy loading/rendering displays a local unavailable state and preserves 2D output.

Label: “Estimated 3D landmark mesh — visual approximation.” Model z is relative, not measured depth; rotating it does not reveal accurately observed side/back/hidden surfaces. This is not a medical scan. Camera distance, perspective, pose, expression, facial hair, filters and lighting affect apparent proportions. These methods are not validated for all faces, devices or obstructions.

## Report lifecycle

App memory holds the canonical PhotoAsset, DetectionOutput and complete Result<FaceAnalysis>. Visibility edits calculate from the current frame without inference. Photo IDs and generation tokens prevent stale results. Replacement, clear/reset, retake and page reload invalidate the old report. Navigation retains it only in memory; inference workers/camera tracks are released when leaving capture. No report export or persistence is implemented in Phase 3.
