# Combined model comparison

Same 224 unique PlantDoc test images and ground truth for both models. No Gemini calls during evaluation.

| Metric | PlantDoc baseline | Combined datasets |
|---|---:|---:|
| Accuracy (abstentions count as incorrect) | 24.11% | 29.02% |
| Coverage | 29.02% | 36.16% |
| Macro F1 | 0.3199 | 0.3754 |
| Correct predictions | 54 | 65 |

Accuracy change: 4.91 percentage points. This comparison measures the local classifier only, not Gemini fallback accuracy. Small, noisy benchmark; near-duplicates can remain. Not evidence of real-world diagnostic reliability.
