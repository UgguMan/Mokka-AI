# Mokka AI — revised viva notes

**Explain the project in one sentence.** A classifier trained on PlantDoc plus compatible PlantVillage and PlantWild images identifies supported classes. Gemini explains matched predictions and separately assesses uncertain leaves, including possible diseases beyond the classifier taxonomy.

**Why is the dataset necessary?** The labeled training images teach the disease classification head. Separate test images measure its performance. The dataset is no longer merely a list of labels.

**What model is trained?** A class-balanced multinomial logistic regression head on frozen MobileNetV3-Small ImageNet-pretrained features. This is transfer learning with a frozen encoder. The full CNN is not trained from scratch or fine-tuned, and Gemini is not trained.

**What does Gemini do?** For matched classes it provides visual observations and a label-locked explanation. For abstentions it supplies a separate tentative assessment: suspected disease, apparently healthy, uncertain, or not a leaf. The backend never overwrites the local result.

**What if Gemini disagrees?** It may describe inconclusive/conflicting evidence in its explanation, but cannot change the predicted class. Both the local prediction and narrative can be wrong; an expert should verify them.

**What if the API key is missing or quota runs out?** Local disease classification still works. The app shows a basic local summary and explicitly says that Gemini's explanation is unavailable. It never fabricates a Gemini response.

**How is training separated from evaluation?** Exact-byte duplicates are removed from the training files, then a stratified 80/20 train/validation split is used. Training fits the head; validation chooses abstention rules. Test images are never used to fit weights or thresholds. Exact test overlap with development data is excluded and reported.

**Why use pretrained image features?** They allow a small local dataset to train a disease-specific classifier with relatively low CPU and data requirements. Pretraining is on ImageNet, not PlantDoc. Actual PlantDoc performance must be evaluated independently.

**Is this image matching?** It is learned classification using image features and trained coefficients. Training-reference feature similarity is only an additional abstention heuristic, not the source of a copied diagnosis.

**Can it recognize anything?** The trained classifier is limited to 28 PlantDoc-compatible classes. Added datasets strengthen those classes without adding every source label. Gemini may suggest other diseases after abstention, but uncertainty does not prove dataset absence. Neither component guarantees non-plant or unfamiliar-disease detection.

**What does certainty mean?** A qualitative classifier score category, not a calibrated statistical probability. The user does not see numeric confidence.

**What is multimodal here?** Gemini's explanation receives the photo, locked prediction and text observations. The local disease classifier is image-only; user text does not secretly alter its prediction.

**What is evaluated?** The local classifier, using the exact same model parameters, preprocessing and abstention logic as the app. Evaluation makes no Gemini calls. It does not measure whether generated explanations are correct.

**Metrics?** Accuracy includes abstentions as incorrect; coverage measures how often the classifier predicts a taxonomy label. Precision/recall/F1 are per class; macro F1 averages classes with test support. Missing/failed/skipped examples are separately disclosed.

**Why 28 classes but 27 test folders?** The official snapshot lacks a test folder for Tomato two spotted spider mites leaf. Reports list that class as having no test support rather than inventing samples.

**How is the photo handled?** The server checks type, magic bytes, file size and decoding in memory, then sends it through stdin to local Python. If Gemini is configured it is also sent to Google for explanation. It is never written to application storage.

**Authentication/security?** Bcrypt hashes, one-hour JWTs, owner-scoped history queries, input/output validation, in-memory rate limits, exact-origin CORS and central safe error handling. SessionStorage tokens remain vulnerable to successful XSS; this is a documented trade-off.

**How is the dashboard calculated?** Actual MongoDB aggregates filtered by the authenticated user. It is not an evaluation accuracy dashboard.

**What are the limitations?** Small/noisy dataset, similar diseases, imperfect unknown-image detection, possible near-duplicate leakage, model pretraining overlap, generated narrative errors and no field validation. It is not professional agricultural diagnosis.

**Demo:** show training artifacts/report → register → upload a real leaf → inspect the dataset-model prediction and explanation source → open history/dashboard → explain offline classification versus optional Gemini explanation.
