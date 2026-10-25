"""Train a PlantDoc classifier on frozen MobileNet features; test data never fits the model."""
import argparse
import hashlib
import json
import time
from datetime import datetime, timezone

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

from common import ROOT, ARTIFACTS, CACHE, taxonomy, taxonomy_hash, extractor, image_tensor, extract
from additional_data import additional_records

parser = argparse.ArgumentParser()
parser.add_argument('--batch-size', type=int, default=32)
parser.add_argument('--additional', action='store_true', help='Use prepared PlantVillage and PlantWild training images')
args = parser.parse_args()
if not 1 <= args.batch_size <= 128:
    raise ValueError('batch-size must be between 1 and 128')
ARTIFACTS.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
classes = [item['classLabel'] for item in taxonomy()]
net, transform = extractor(training=True)
records, skipped, seen = [], [], {}
features, labels, tensors, pending = [], [], [], []
started = time.time()


def flush():
    if not tensors:
        return
    vectors = extract(net, tensors)
    features.extend(vectors)
    labels.extend(item['label'] for item in pending)
    records.extend(pending)
    tensors.clear()
    pending.clear()
    print(f'Extracted {len(records)} training images', flush=True)


for label in classes:
    folder = ROOT / 'dataset' / 'PlantDoc' / 'train' / label
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
            continue
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest in seen:
            skipped.append({'file': str(path.relative_to(ROOT)), 'reason': 'duplicate bytes', 'firstLabel': seen[digest]})
            continue
        try:
            tensor = image_tensor(data, transform)
        except Exception as error:
            skipped.append({'file': str(path.relative_to(ROOT)), 'reason': type(error).__name__})
            continue
        seen[digest] = label
        tensors.append(tensor)
        pending.append({'file': str(path.relative_to(ROOT)), 'sha256': digest, 'label': label})
        if len(tensors) >= args.batch_size:
            flush()
flush()
X = np.asarray(features)
y = np.asarray(labels)
indices = np.arange(len(y))
train_indices, val_indices = train_test_split(indices, test_size=.2, stratify=y, random_state=42)
sources = ['PlantDoc']
if args.additional:
    # Keep exactly the original PlantDoc validation partition. Supplementary
    # official training images enter training only, never threshold selection.
    extras = additional_records(ROOT, classes)
    original_count = len(records)
    for row in extras:
        if row['sha256'] in seen:
            skipped.append({'file': row['file'], 'reason': 'duplicate supplementary bytes'})
            continue
        try:
            tensor = image_tensor((ROOT / row['file']).read_bytes(), transform)
        except Exception as error:
            skipped.append({'file': row['file'], 'reason': type(error).__name__})
            continue
        seen[row['sha256']] = row['label']
        tensors.append(tensor)
        pending.append(row)
        if len(tensors) >= args.batch_size:
            flush()
    flush()
    if len(records) == original_count:
        raise ValueError('No supplementary training images could be loaded')
    X, y = np.asarray(features), np.asarray(labels)
    train_indices = np.concatenate([train_indices, np.arange(original_count, len(records))])
    sources += sorted({r['dataset'] for r in records[original_count:]})
print(f'Fitting disease classification head: {len(train_indices)} train / {len(val_indices)} validation', flush=True)
# The frozen feature extractor is pretrained on ImageNet; the disease head learns PlantDoc labels.
model = LogisticRegression(C=10, max_iter=2000, class_weight='balanced', random_state=42)
model.fit(X[train_indices], y[train_indices])
scores = model.predict_proba(X[val_indices])
predicted = model.classes_[scores.argmax(axis=1)]
validation_accuracy = float(accuracy_score(y[val_indices], predicted))
validation_f1 = float(f1_score(y[val_indices], predicted, average='macro', zero_division=0))
# Select abstention threshold on validation ONLY, without looking at test labels.
options = []
for threshold in np.arange(.25, .851, .05):
    keep = scores.max(axis=1) >= threshold
    coverage = float(keep.mean())
    accuracy = float((predicted[keep] == y[val_indices][keep]).mean()) if keep.any() else 0
    options.append({'threshold': round(float(threshold), 2), 'coverage': coverage, 'accuracy': accuracy})
eligible = [o for o in options if o['accuracy'] >= .8 and o['coverage'] >= .2]
chosen = max(eligible, key=lambda o: o['coverage']) if eligible else min(options, key=lambda o: abs(o['threshold'] - .5))
nearest = (X[val_indices] @ X[train_indices].T).max(axis=1)
similarity_threshold = float(np.quantile(nearest, .02))
version = hashlib.sha256(model.coef_.tobytes() + model.intercept_.tobytes()).hexdigest()[:16]
metadata = {
    'name': 'MobileNetV3-Small + ' + '/'.join(sources) + ' logistic classifier', 'version': version,
    'trainingDatasets': sources, 'trainedOn': ' + '.join(sources) + ' training images',
    'createdAt': datetime.now(timezone.utc).isoformat(), 'classes': model.classes_.tolist(),
    'taxonomyHash': taxonomy_hash(), 'featureExtractor': 'MobileNetV3-Small ImageNet1K V1 (frozen)',
    'trainingMethod': 'L2-normalized frozen features; class-balanced multinomial logistic regression C=10',
    'trainCount': len(train_indices), 'validationCount': len(val_indices),
    'scoreThreshold': chosen['threshold'], 'similarityThreshold': similarity_threshold,
    'validationAccuracyWithoutAbstention': validation_accuracy, 'validationMacroF1WithoutAbstention': validation_f1,
    'thresholdSelection': options, 'thresholdTargetReached': bool(eligible),
    'notes': 'Scores are not calibrated probabilities. Similarity rejection is a heuristic, not validated non-plant detection. Test split never used for fitting or threshold selection.',
}
np.savez_compressed(ARTIFACTS / 'head.npz', coef=model.coef_, intercept=model.intercept_, referenceFeatures=X[train_indices])
(ARTIFACTS / 'model.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
manifest = {'training': [records[i] for i in train_indices], 'validation': [records[i] for i in val_indices], 'skipped': skipped}
(ARTIFACTS / 'split-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'trained': True, 'train': len(train_indices), 'validation': len(val_indices), 'skipped': len(skipped),
                  'validationAccuracy': validation_accuracy, 'validationMacroF1': validation_f1,
                  'seconds': round(time.time() - started, 1)}), flush=True)
