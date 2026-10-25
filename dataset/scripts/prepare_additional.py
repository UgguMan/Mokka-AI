"""Import compatible official training images; exclude held-out and duplicate pixels."""
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
DOWNLOADS = ROOT / 'dataset' / 'downloads'
OUTPUT = ROOT / 'dataset' / 'additional'
SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp'}
Image.MAX_IMAGE_PIXELS = 25_000_000


def pixel_hash(data):
    with Image.open(io.BytesIO(data)) as image:
        if image.width * image.height > 25_000_000:
            raise ValueError('Image too large')
        image = ImageOps.exif_transpose(image).convert('RGB')
        return hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()


def key(path):
    return '/'.join(path.replace('\\', '/').strip().split('/')[-2:])


def split_members(name, archive):
    if name == 'PlantVillage':
        train = {key(p) for p in (DOWNLOADS / 'PlantVillage-color_train.txt').read_text().splitlines()}
        heldout = {key(p) for p in (DOWNLOADS / 'PlantVillage-color_test.txt').read_text().splitlines()}
        members = {key(p): p for p in archive.namelist() if '/color/' in '/' + p and PurePosixPath(p).suffix.lower() in SUFFIXES}
    else:
        files = [p for p in archive.namelist() if p.endswith('/trainval.txt') or p == 'trainval.txt']
        if len(files) != 1:
            raise ValueError('Expected the official PlantWild trainval.txt split; refusing a guessed split')
        train, heldout = set(), set()
        for line in archive.read(files[0]).decode('utf-8-sig').splitlines():
            path, label, split = line.rsplit('=', 2)
            if split not in {'0', '1', '2'}:
                raise ValueError('Unknown PlantWild split')
            (train if split == '1' else heldout).add(key(path))
        members = {key(p): p for p in archive.namelist() if '/images/' in '/' + p and PurePosixPath(p).suffix.lower() in SUFFIXES}
    if train & heldout or not train or not heldout or not (train | heldout) <= members.keys():
        raise ValueError(f'Invalid or incomplete official split for {name}')
    return train, heldout, members


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--per-class', type=int, default=300, help='Maximum added training images per source/class')
    args = parser.parse_args()
    if args.per_class < 1:
        raise ValueError('per-class must be positive')
    maps = json.loads((ROOT / 'dataset/metadata/additional-label-map.json').read_text())
    classes = {r['classLabel'] for r in json.loads((ROOT / 'dataset/metadata/taxonomy.json').read_text())}
    if any(not mapping or not set(mapping.values()) <= classes for mapping in maps.values()):
        raise ValueError('Every additional dataset requires a valid explicit label mapping')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    blocked_bytes, blocked_pixels, skipped, rows, sources = set(), set(), [], [], {}
    # All original data (including validation and test) takes priority. Pixel
    # hashes also catch identical images re-encoded under different filenames.
    for path in sorted((ROOT / 'dataset/PlantDoc').glob('*/*/*')):
        if path.suffix.lower() not in SUFFIXES:
            continue
        data = path.read_bytes()
        blocked_bytes.add(hashlib.sha256(data).hexdigest())
        try:
            blocked_pixels.add(pixel_hash(data))
        except Exception:
            pass
    for name in maps:
        sources[name] = json.loads((DOWNLOADS / f'{name}-source.json').read_text())
        with zipfile.ZipFile(DOWNLOADS / f'{name}.zip') as archive:
            train, heldout, members = split_members(name, archive)
            # Reserve supplementary test/validation as well, even across sources.
            for member in sorted(heldout):
                data = archive.read(members[member])
                blocked_bytes.add(hashlib.sha256(data).hexdigest())
                try:
                    blocked_pixels.add(pixel_hash(data))
                except Exception:
                    pass
    seen_bytes, seen_pixels = set(blocked_bytes), set(blocked_pixels)
    for name, mapping in maps.items():
        counts = Counter()
        with zipfile.ZipFile(DOWNLOADS / f'{name}.zip') as archive:
            train, _, members = split_members(name, archive)
            for member in sorted(train, key=lambda p: hashlib.sha256(p.encode()).hexdigest()):
                source_label = member.split('/')[0]
                label = mapping.get(source_label)
                if not label:
                    skipped.append({'dataset': name, 'file': member, 'reason': 'unmapped class'})
                    continue
                if counts[label] >= args.per_class:
                    skipped.append({'dataset': name, 'file': member, 'reason': 'per-class cap'})
                    continue
                data = archive.read(members[member])
                digest = hashlib.sha256(data).hexdigest()
                try:
                    if not 0 < len(data) <= 4 * 1024 * 1024:
                        raise ValueError('Outside app upload limits')
                    pixels = pixel_hash(data)
                except Exception as error:
                    skipped.append({'dataset': name, 'file': member, 'reason': type(error).__name__})
                    continue
                if digest in seen_bytes or pixels in seen_pixels:
                    skipped.append({'dataset': name, 'file': member, 'reason': 'duplicate or reserved image'})
                    continue
                seen_bytes.add(digest)
                seen_pixels.add(pixels)
                # Hash-derived paths avoid extracting untrusted archive paths.
                target = OUTPUT / name / (digest + PurePosixPath(member).suffix.lower())
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                rows.append({'file': target.relative_to(ROOT).as_posix(), 'sha256': digest,
                             'pixelHash': pixels, 'label': label, 'sourceLabel': source_label,
                             'sourceFile': member, 'dataset': name, 'split': 'train'})
                counts[label] += 1
        if not counts:
            raise ValueError(f'No mapped training images for {name}')
        print(f'{name}: imported {sum(counts.values())} images across {len(counts)} classes', flush=True)
        sources[name]['importedPerClass'] = dict(counts)
    manifest = {'sources': sources, 'perClassLimit': args.per_class, 'training': rows, 'skipped': skipped,
                'policy': 'Official additional train splits only. Original PlantDoc validation remains fixed. Exact byte and decoded-pixel duplicates excluded; near-duplicates may remain.'}
    temp = OUTPUT / 'manifest.json.tmp'
    temp.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    temp.replace(OUTPUT / 'manifest.json')


if __name__ == '__main__':
    main()
