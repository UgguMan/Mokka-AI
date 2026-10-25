"""Shared local feature extraction and inference; no Gemini calls."""
from pathlib import Path
import hashlib
import io
import json
import os

import numpy as np
from PIL import Image, ImageOps
import torch
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'ml' / 'artifacts'
CACHE = ROOT / 'ml' / 'cache'
TAXONOMY_PATH = ROOT / 'dataset' / 'metadata' / 'taxonomy.json'
WEIGHTS = MobileNet_V3_Small_Weights.IMAGENET1K_V1
Image.MAX_IMAGE_PIXELS = 25_000_000
torch.set_num_threads(min(4, os.cpu_count() or 1))


def taxonomy():
    return json.loads(TAXONOMY_PATH.read_text(encoding='utf-8'))


def taxonomy_hash():
    return hashlib.sha256(TAXONOMY_PATH.read_bytes()).hexdigest()


def extractor(training=False):
    """Downloads public ImageNet weights only during explicit training."""
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    backbone = ARTIFACTS / 'backbone.pt'
    if training and not backbone.exists():
        torch.hub.set_dir(str(CACHE / 'torch'))
        net = mobilenet_v3_small(weights=WEIGHTS)
        torch.save(net.state_dict(), backbone)
    else:
        if not backbone.exists():
            raise RuntimeError('Local model is not trained. Run npm run train:model.')
        net = mobilenet_v3_small(weights=None)
        net.load_state_dict(torch.load(backbone, map_location='cpu', weights_only=True))
    net.classifier = torch.nn.Identity()
    net.eval()
    return net, WEIGHTS.transforms()


def image_tensor(data, transform):
    with Image.open(io.BytesIO(data)) as image:
        if image.width * image.height > 25_000_000:
            raise ValueError('Image exceeds the pixel limit.')
        image.load()
        return transform(ImageOps.exif_transpose(image).convert('RGB'))


def extract(net, tensors):
    with torch.inference_mode():
        features = net(torch.stack(tensors)).numpy()
    return features / np.maximum(np.linalg.norm(features, axis=1, keepdims=True), 1e-12)


def load_head():
    metadata = json.loads((ARTIFACTS / 'model.json').read_text(encoding='utf-8'))
    if metadata['taxonomyHash'] != taxonomy_hash():
        raise ValueError('Taxonomy changed after training. Retrain the local model.')
    params = np.load(ARTIFACTS / 'head.npz', allow_pickle=False)
    return metadata, params


def predict_features(features, metadata, params):
    # Plain arrays avoid executing a pickled estimator at inference time.
    logits = features @ params['coef'].T + params['intercept']
    exp = np.exp(logits - logits.max(axis=1, keepdims=True))
    probabilities = exp / exp.sum(axis=1, keepdims=True)
    closest = features @ params['referenceFeatures'].T
    predictions = []
    for i, row in enumerate(probabilities):
        order = np.argsort(row)[::-1]
        best = int(order[0])
        score = float(row[best])
        similarity = float(closest[i].max())
        abstain = score < metadata['scoreThreshold'] or similarity < metadata['similarityThreshold']
        certainty = 'low' if abstain else ('high' if score >= .8 else 'medium')
        predictions.append({
            'classLabel': 'uncertain' if abstain else metadata['classes'][best],
            'classifierAssessedCertainty': certainty,
            'classifier': {'name': metadata['name'], 'version': metadata['version'],
                           'trainedOn': metadata.get('trainedOn', 'PlantDoc train split')},
            'abstentionReason': 'Insufficient model evidence or unfamiliar image features.' if abstain else '',
        })
    return predictions
