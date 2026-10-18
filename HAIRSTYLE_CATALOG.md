# Phase 4 reference catalog and matching

Version 4.0.0. **24 completed entries**, all locally bundled generated references. No unresolved image blocker. These images depict fictional adults and were generated for this project; no visitor photo, celebrity identity or stock-photo source was used. The original source for each generated image is its unchanged local PNG. Exact original generation filenames, usage terms, creator disclosure, required app credit, review dates and modifications are in `public/hairstyles/credits.json` and each Hairstyle.referenceImage. Hashes/bytes are in `asset-manifest.json`. Reviewed by Codex visual inspection on 2026-10-18; not a professional hairdressing certification.

| Texture | Short | Medium | Long |
|---|---|---|---|
| Straight | Textured crop, Classic side part, Quiff | Straight bob, Straight lob | Long straight layers |
| Wavy | Wavy pixie, Wavy taper | Wavy lob, Wavy shag | Long waves with curtain fringe, Long wavy layers |
| Curly | Curly taper, Curly crop | Curly shag, Curly bob | Long curly layers, Long curls with curtain fringe |
| Tightly coiled | Coiled taper, Close coil crop, Coiled high-top taper | Rounded coils | Long coil layers, Long two-strand twists |

Visual checks: crown/sides and relevant length/shape are readable; crop/part/lift, bob perimeter, curtain pieces, shag layers, ringlets, small coils and rope-like twists correspond to the named cuts. Accurate alt text describes the visible hairstyle and discloses generation. Images are not previews of a visitor wearing a cut. The collection is illustrative, not comprehensive across densities, growth patterns, colours or mixed textures. Length ranges are rough style descriptions, not physical measurements; coil shrinkage and added twist installation requirements need discussion with a stylist. There is no fake try-on.

## Gallery delivery derivatives — post-build QA

All 24 original PNGs and rights records remain unchanged. Gallery cards now use 24 visually inspected 768-pixel WebP derivatives; the original PNG is the fallback and remains the print-report source. Derivatives total 1,381,254 bytes versus 55,987,352 bytes for the originals (97.53% fewer gallery image bytes). Both sets are shipped, so this is a transfer improvement, not a smaller total deployment.

`public/hairstyles/preview-manifest.json` records each derivative's source URL/hash, dimensions, bytes/hash, actual generation date and resizing/encoding modifications. Cards disclose these modifications beside the existing rights credit. Run `python scripts/generate-previews.py` with Pillow after adding or changing an approved original, then `npm run verify:catalog`. This optional developer tool is not needed to install, build or run the site. Never substitute a derivative for an original provenance record.

## Preferences first

Pure TypeScript rankStyles filters unavailable images, selected texture, desired length, daily styling time ceiling and any selected style category. Category choices are OR within that group; other practical constraints are AND. Unknown/no preference leaves that constraint open. Current-length ranges block longer cuts unless grow-out is enabled. Those longer options explicitly say more length is needed, without a fixed growth time.

Within eligible styles, current-length matches get the strongest ordering preference. Optional contour guidance applies only when the current FaceAnalysis has reviewed visibility and a usable approximate shape (including mixed; uncertain gets none). Available actual H/C >=1.50 adds a fringe suggestion, H/C <1.30 adds a top-volume suggestion, and L/C >=0.82 adds a layers suggestion. Each explanation quotes the actual rounded ratio. These provisional cues are not validated ideal proportions or shape guarantees. They can only break practical ties. No probability/fit percentages are displayed. Remaining ties use a deliberately varied editorial reference order and then a stable ID; this is openly stated in the interface. Unavailable geometry cannot exclude a preference-compatible style.

Show five when the catalog supports five, fewer otherwise. Never replace missing matches with unrelated textures or length/time conflicts. Daily styling minutes and maintenance levels are application planning estimates, not guarantees or recommendations inferred from a face. Minutes exclude washing, full drying and initial twist installation; detailed notes clarify that low daily styling can still involve substantial appointment effort. Each card has requirements, maintenance notes and a sentence to show a stylist.

## Session and report

All-style browsing bypasses recommendation preferences; its three gallery filters remain independent. Details and rights records expand inline. Favourites and comparison (max three) are only App memory, survive navigation and reset on reload. A visible sticky comparison status links to the selected cards. There is no storage API or server write. Clearing/replacing a photo invalidates its FaceAnalysis; preference/favourite choices remain independent for that visit. A new accepted result gets a fresh styling snapshot.

FaceAnalysis.styling stores preferences, Recommendation records, catalog version and complete image-credit records for its current shortlist. Preferences/visibility changes recalculate from existing data without inference. Phase 5 reports retain generated labels and exact credits, sources, modifications and usage URLs for selected references. Full Start over also clears independent preferences, favourites and comparison choices.

## Add more entries

1. Obtain a suitable original image and check its actual source/terms; do not label arbitrary portraits as a cut. Generate only fictional references if using this workflow, with no visitor input. Do not introduce a runtime generation dependency.
2. Visually inspect cut, texture and framing; keep the unchanged image under public/hairstyles and describe it accurately.
3. Add one typed CatalogStyle in src/modules/hairstyleCatalog.ts, including a complete referenceImage record, practical tags, requirements, maintenance and stylist brief. Use unavailable status if image rights or suitability are unresolved; never count it complete.
4. Add the matching credits.json record and a hash/byte manifest entry. Keep generated modifications/creation records truthful. No blanket CC or stock-license claim.
5. Run npm test and npm run build; update coverage and review dates. Tests compare catalog credits to the rights record and check every texture/length group. Build verifies each bundled PNG hash.

## Explicit reference presentation (1.1.0)

Each CatalogStyle now carries an editorial `presentations` list (masculine/feminine, sometimes both). This describes how the cut/reference is grouped, not a detected gender or a restriction on wearers. Matching method 4.1.0 applies the visitor's choice before practical/geometry ranking; absent/any retains all 24. Masculine tie order starts with crop, side part, quiff, wavy taper and curly taper. Masculine medium/long coverage is currently missing and disclosed rather than filled with other references. No images, licenses or original rights records changed. Default report favourites must meet current preferences; explicit selections retain their full credits.
