# Mokka AI evaluation

Generated: 2026-10-25T14:52:03.857Z

Successful unique predictions: 224

Accuracy: 29.02%

Coverage (non-abstained / successful predictions): 36.16%

Macro F1: 0.3754

Unweighted mean over classes with test support; zero-support classes excluded.

Failed/skipped log entries: 13. Failed or skipped images are excluded from classification metrics; review failures.jsonl for selection bias.

Classes without test support in this run: Tomato two spotted spider mites leaf

Models: MobileNetV3-Small + PlantDoc/PlantVillage/PlantWild logistic classifier

| Class | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| Apple Scab Leaf | 10 | 0.5000 | 0.1000 | 0.1667 |
| Apple leaf | 9 | 1.0000 | 0.2222 | 0.3636 |
| Apple rust leaf | 9 | 0.7500 | 0.3333 | 0.4615 |
| Bell_pepper leaf | 8 | 0.3333 | 0.1250 | 0.1818 |
| Bell_pepper leaf spot | 9 | 0.5000 | 0.2222 | 0.3077 |
| Blueberry leaf | 10 | 1.0000 | 0.3000 | 0.4615 |
| Cherry leaf | 10 | 0.8000 | 0.4000 | 0.5333 |
| Corn Gray leaf spot | 3 | 0.1667 | 0.3333 | 0.2222 |
| Corn leaf blight | 10 | 0.7500 | 0.3000 | 0.4286 |
| Corn rust leaf | 10 | 1.0000 | 0.8000 | 0.8889 |
| Peach leaf | 9 | 1.0000 | 0.3333 | 0.5000 |
| Potato leaf early blight | 7 | 1.0000 | 0.1429 | 0.2500 |
| Potato leaf late blight | 5 | 0.5000 | 0.2000 | 0.2857 |
| Raspberry leaf | 7 | 0.8333 | 0.7143 | 0.7692 |
| Soyabean leaf | 8 | 0.0000 | 0.0000 | 0.0000 |
| Squash Powdery mildew leaf | 6 | 1.0000 | 0.6667 | 0.8000 |
| Strawberry leaf | 8 | 1.0000 | 0.7500 | 0.8571 |
| Tomato Early blight leaf | 9 | 1.0000 | 0.1111 | 0.2000 |
| Tomato Septoria leaf spot | 10 | 1.0000 | 0.2000 | 0.3333 |
| Tomato leaf | 8 | 0.0000 | 0.0000 | 0.0000 |
| Tomato leaf bacterial spot | 8 | 0.0000 | 0.0000 | 0.0000 |
| Tomato leaf late blight | 10 | 0.0000 | 0.0000 | 0.0000 |
| Tomato leaf mosaic virus | 10 | 0.0000 | 0.0000 | 0.0000 |
| Tomato leaf yellow virus | 5 | 1.0000 | 0.2000 | 0.3333 |
| Tomato mold leaf | 6 | 0.6667 | 0.3333 | 0.4444 |
| Tomato two spotted spider mites leaf | 0 | 0.0000 | 0.0000 | 0.0000 |
| grape leaf | 12 | 1.0000 | 0.6667 | 0.8000 |
| grape leaf black rot | 8 | 1.0000 | 0.3750 | 0.5455 |

The classification head uses frozen ImageNet-pretrained MobileNetV3 features. See the named model and its model.json trainingDatasets metadata for the training sources. Validation chose the abstention thresholds; test images were not used for fitting. Exact-byte test overlap with training/validation was excluded. Near-duplicate images and pretraining overlap may still bias performance. Gemini was not called during evaluation. Class certainty is not a calibrated probability.
