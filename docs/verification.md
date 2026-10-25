# Verification record

## 2026-10-25 — combined datasets and Gemini fallback

- Both additional dataset archive SHA-256 checks passed. Imported 8,221 PlantVillage and 4,353 PlantWild images with source/split records and duplicate filtering.
- Training completed: model `28a90b69843527bd`, 14,442 training images, 28 classes. All 467 validation hashes and labels match the original baseline.
- Both models evaluated on the same 224 unique test images, without Gemini. Correct predictions: 54 to 65; accuracy including abstentions: 24.11% to 29.02%; coverage: 29.02% to 36.16%; macro F1: 0.3199 to 0.3754. Full comparison: `evaluation/comparison.md`.
- Server prediction smoke check loaded the new model and returned a valid uncertain response.
- Automated tests: 62 passed across 9 files. Additional dataset Python tests: 3 passed. Production build passed.
- Live Gemini fallback check with a public sample succeeded. This verifies connectivity and response handling, not diagnostic accuracy.
- Gemini suggestions remain separate from local results and are marked unconfirmed. Quota/configuration failures preserve the uncertain local result.

Not verified: Gemini diagnostic accuracy, real-world field reliability, public deployment, or all browsers/devices. Google sign-in and Atlas still require the user's separate configuration. The earlier record below describes historical checks only.

## Historical verification

Date: 2026-10-09.

- Production Vite build: passed.
- Automated tests: 35 passed across 4 test files, using a temporary real MongoDB and mocked Gemini. No external inference calls were made by tests.
- Dependency audit after updates: 0 known vulnerabilities reported at check time.
- Backend modules load successfully with the generated taxonomy.
- Dataset: official classification snapshot extracted on Windows, 28 train and 27 test classes; generated taxonomy and original license saved.
- Database reference seed: 28 classes loaded successfully.
- Running browser checks: landing page rendered; library loaded 28 database entries; combined Tomato + mosaic search returned one matching entry.

Not verified: real Gemini predictions, statistical evaluation on the PlantDoc test set, public deployment, and behavior on every browser/device. Live inference requires a user-supplied Gemini key. The tests and successful build do not guarantee the absence of every possible defect.
