# Combined datasets and Gemini fallback

## Dataset integration

The application retains its 28-class PlantDoc taxonomy. PlantVillage provides
compatible training examples for 28 classes; PlantWild v1 provides examples for
27. Classes without an explicit mapping are excluded rather than silently merged
with another disease. This is a mapped subset of the two additional datasets,
not a model trained on all of their disease classes.

The reviewed mapping is `dataset/metadata/additional-label-map.json`. PlantWild's
`corn northern leaf blight` maps to PlantDoc's `Corn leaf blight`; its bell pepper
leaf spot and tomato yellow leaf curl classes map to the corresponding broader
PlantDoc names. These label correspondences remain subject to dataset noise.

Sources and licenses (source cards are saved alongside the downloads):

- PlantDoc: https://github.com/pratikkayal/PlantDoc-Dataset — CC BY 4.0.
- PlantVillage: https://huggingface.co/datasets/mohanty/PlantVillage — CC BY-SA 3.0,
  by Sharada Mohanty, David Hughes and Marcel Salathé.
- PlantWild v1: https://huggingface.co/datasets/uqtwei2/PlantWild — CC BY-NC-ND 4.0,
  by Tianqi Wei, Zhi Chen, Zi Huang and Xin Yu. Keep use noncommercial and retain
  attribution. Do not redistribute modified source images under this license.

Downloaded revisions and archive SHA-256 checksums are pinned in the source
manifests. Original archive bytes are retained. The importer copies image bytes
unchanged into hash-derived filenames and records original paths and labels.

## Split and leakage controls

1. PlantVillage uses only its official color training split; its grouped test
   images remain excluded. Grayscale and segmented copies are not imported.
2. PlantWild uses only `trainval.txt` rows with split value 1; values 0 and 2 are
   reserved for test/validation and never become supplementary training images.
3. Byte hashes and decoded RGB pixel hashes exclude duplicates against all
   original PlantDoc images, both supplemental held-out partitions, and already
   accepted additional images. Different encodings with exactly identical pixels
   are caught; approximate/near duplicates are not guaranteed to be detected.
4. Per source/class, at most 300 compatible images are imported in deterministic
   hash order. This bounds local training cost and reduces source imbalance.
5. The original stratified PlantDoc 80/20 development split is retained. Added
   images enter training only; threshold selection still uses the original
   validation images. Class balancing remains enabled.

`dataset/additional/manifest.json` records imported counts, source metadata,
training records, skipped files and reasons. The loader verifies file checksums
before training. Uploaded images are not added to the training set.

## Reproduction

```powershell
npm run datasets:download
npm run datasets:prepare
npm run train:combined
npm run evaluate -- --perClass 1000 --results-dir evaluation/combined-full
.\.venv\Scripts\python.exe dataset/scripts/test_additional.py
npm test
npm run build
```

The original model and its earlier evaluation are preserved under
`.local/baselines/plantdoc-3cfc2c33a236ee23/`. A full-test baseline was generated in
`evaluation/baseline-full/` before retraining. Combined-model results go to
`evaluation/combined-full/`, keeping caches for different model versions separate.
Evaluation never calls Gemini. Compare the same image IDs before interpreting
accuracy changes. Abstentions count as incorrect; coverage reports how often a
supported class was returned. These are dataset measurements, not field accuracy.

## Completed training and evaluation — 2026-10-25

Model `28a90b69843527bd` uses 14,442 training images: 1,868 original
PlantDoc images, 8,221 PlantVillage images and 4,353 PlantWild images.
All 467 original validation image hashes and labels match the preserved baseline.
The taxonomy remains 28 classes; the added datasets contribute mapped subsets.

On the same 224 unique PlantDoc test images, correct predictions increased from
54 to 65. Accuracy with abstentions counted as incorrect rose from 24.11% to
29.02%; coverage rose from 29.02% to 36.16%; macro F1 rose from 0.3199 to 0.3754.
Among the 81 non-abstained predictions, 65 were correct (80.25%). This selective
accuracy excludes 143 uncertain results and must not be presented as overall
accuracy. Gemini was not called during this evaluation, so these measurements
do not establish fallback accuracy. See `evaluation/comparison.md`.

## Gemini fallback behavior

- A supported local prediction receives a label-locked Gemini explanation.
- When the local model abstains, one separate Gemini assessment is requested
  instead of the ordinary explanation. It may suggest a disease outside the
  local taxonomy, describe an apparently healthy leaf, ask for more evidence,
  or indicate that a recognizable leaf is needed.
- The original `classLabel=uncertain`, local certainty and classifier version
  remain intact. Gemini's structured result is stored in `geminiAssessment`.
  Results and history label it as an unconfirmed suggestion. Dashboard disease
  counts do not treat these suggestions as confirmed local classifications.
- Abstention is not a reliable detector of diseases absent from the dataset. A
  confidently wrong local prediction may not trigger fallback. Gemini itself can
  misidentify plants/diseases or miss non-leaf inputs. Expert review is required.
- Missing key, exhausted quota, timeout, safety block or malformed output leaves
  the local uncertain result available. No paid-provider fallback is enabled.
- The schema prohibits extra fields and numeric confidence. Gemini provides short
  treatment and ongoing-care summaries for both explanation paths, with advice
  conditional on the tentative finding. Healthy, uncertain and non-leaf results
  receive appropriate guidance without a promised cure. Generated pesticide
  products or dosing are not requested. Static general advice remains available
  if Gemini fails. Older saved results are unchanged; analyze again for summaries.

The existing privacy behavior applies: Google receives the photo and optional
notes when Gemini is configured. The app stores assessment text, not image bytes.
Keep billing disabled when using the free tier.

`npm run check:gemini -- --fallback` performs one live fallback check with a public
sample image; the regular check validates the label-locked explanation flow.
