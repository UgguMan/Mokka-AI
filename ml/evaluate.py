"""Evaluate the trained classifier on untouched PlantDoc test images, entirely locally."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import time
from pathlib import Path

from common import ROOT, ARTIFACTS, taxonomy, extractor, image_tensor, extract, load_head, predict_features

parser = argparse.ArgumentParser()
parser.add_argument('--limit', type=int, default=100000)
parser.add_argument('--perClass', type=int, default=3)
parser.add_argument('--delayMs', type=int, default=0)
parser.add_argument('--retries', type=int, choices=[0, 1], default=0)
parser.add_argument('--resume', action='store_true')
parser.add_argument('--results-dir', default='evaluation/results')
args = parser.parse_args()
if args.limit < 1 or args.perClass < 1 or args.delayMs < 0:
    raise ValueError('limit/perClass must be positive; delayMs must be nonnegative.')
metadata, params = load_head()
net, transform = extractor()
directory = (ROOT / args.results_dir).resolve()
if not directory.is_relative_to(ROOT):
    raise ValueError('Evaluation results must stay inside the project')
directory.mkdir(parents=True, exist_ok=True)
lock = directory / '.evaluation.lock'


def read_rows(name):
    path = directory / name
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line] if path.exists() else []


def log(name, value):
    with (directory / name).open('a', encoding='utf-8') as output:
        output.write(json.dumps({**value, 'timestamp': datetime.now(timezone.utc).isoformat()}) + '\n')


with lock.open('x'):
    pass
try:
    cached = read_rows('predictions.jsonl')
    if cached and not args.resume:
        raise ValueError('Existing results found. Use --resume; no data has been overwritten.')
    if any(row.get('modelVersion') != metadata['version'] for row in cached):
        raise ValueError('Cache belongs to a different model. Preserve it separately before starting a new evaluation.')
    seen = {row['id'] for row in cached}
    manifest = json.loads((ARTIFACTS / 'split-manifest.json').read_text(encoding='utf-8'))
    development_hashes = {row['sha256'] for group in ['training', 'validation'] for row in manifest[group]}
    tensors, pending, selected, submitted = [], [], 0, 0

    def flush():
        global submitted
        if not tensors:
            return
        results = predict_features(extract(net, tensors), metadata, params)
        for record, result in zip(pending, results):
            log('predictions.jsonl', {**record, 'predicted': result['classLabel'], 'result': result,
                                     'model': metadata['name'], 'modelVersion': metadata['version'],
                                     'predictionSource': 'plantdoc_local'})
        submitted += len(results)
        tensors.clear()
        pending.clear()
        print(f'Saved {submitted} local test predictions', flush=True)
        if args.delayMs:
            time.sleep(args.delayMs / 1000)

    for entry in taxonomy():
        folder = ROOT / 'dataset' / 'PlantDoc' / 'test' / entry['classLabel']
        if not folder.exists():
            log('failures.jsonl', {'classLabel': entry['classLabel'], 'reason': 'No test folder', 'skipped': True})
            continue
        files = [p for p in sorted(folder.iterdir()) if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}][:args.perClass]
        for path in files:
            if selected >= args.limit:
                break
            selected += 1
            data = path.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            record = {'id': digest, 'file': str(path.relative_to(ROOT / 'dataset' / 'PlantDoc' / 'test')), 'actual': entry['classLabel']}
            if digest in development_hashes:
                log('failures.jsonl', {**record, 'reason': 'Duplicate bytes overlap training/validation; excluded to prevent leakage', 'skipped': True})
                continue
            if not 0 < len(data) <= 4 * 1024 * 1024:
                log('failures.jsonl', {**record, 'reason': 'Outside app image-size limits', 'skipped': True})
                continue
            try:
                tensor = image_tensor(data, transform)
            except Exception as error:
                log('failures.jsonl', {**record, 'reason': type(error).__name__, 'skipped': True})
                continue
            tensors.append(tensor)
            pending.append(record)
            if len(tensors) >= 32:
                flush()
        if selected >= args.limit:
            break
    flush()
    print(f'Finished. New local predictions: {submitted}. No Gemini calls or image uploads.', flush=True)
finally:
    lock.unlink()
