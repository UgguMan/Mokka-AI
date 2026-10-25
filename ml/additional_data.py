"""Load audited supplementary training records; never repartition held-out data."""
import hashlib
import json
from pathlib import Path


def additional_records(root, classes):
    manifest = root / 'dataset' / 'additional' / 'manifest.json'
    if not manifest.exists():
        raise ValueError('Prepare the additional datasets first: npm run datasets:prepare')
    data = json.loads(manifest.read_text(encoding='utf-8'))
    rows = data['training']
    if not rows or {r['dataset'] for r in rows} != {'PlantVillage', 'PlantWild'}:
        raise ValueError('Both supplementary datasets must contain mapped training images.')
    base = (root / 'dataset' / 'additional').resolve()
    for row in rows:
        path = (root / row['file']).resolve()
        if not path.is_relative_to(base) or row['label'] not in classes or row['split'] != 'train':
            raise ValueError('Invalid supplementary training record')
        if hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
            raise ValueError(f'Supplementary image checksum changed: {row["file"]}')
    return rows
