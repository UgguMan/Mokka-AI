"""Download pinned official dataset archives with integrity checks and resume support."""
import hashlib
import json
from pathlib import Path
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'dataset' / 'downloads'
SOURCES = [('PlantVillage', 'mohanty/PlantVillage', 'data.zip'),
           ('PlantWild', 'uqtwei2/PlantWild', 'plantwild.zip')]


def fetch(url):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(url, timeout=90)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def download(url, path, size, digest):
    partial = path.with_suffix(path.suffix + '.part')
    if not path.exists():
        for attempt in range(5):
            offset = partial.stat().st_size if partial.exists() else 0
            if offset == size:
                break
            try:
                request = urllib.request.Request(url, headers={'Range': f'bytes={offset}-'} if offset else {})
                with fetch(request) as response:
                    if offset and response.status != 206:
                        raise RuntimeError('Server did not honor resume range')
                    if offset and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                        raise RuntimeError('Unexpected resume offset')
                    with partial.open('ab' if offset else 'wb') as output:
                        last = time.monotonic()
                        while chunk := response.read(4 * 1024 * 1024):
                            output.write(chunk)
                            offset += len(chunk)
                            if time.monotonic() - last > 15:
                                print(f'{path.name}: {offset / 1e6:.0f}/{size / 1e6:.0f} MB', flush=True)
                                last = time.monotonic()
                if partial.stat().st_size != size:
                    raise RuntimeError('Incomplete download')
                break
            except Exception as error:
                print(f'Download attempt {attempt + 1}: {type(error).__name__}', flush=True)
                if attempt == 4:
                    raise
                time.sleep(2)
        candidate = partial
    else:
        candidate = path
    if candidate.stat().st_size != size:
        raise RuntimeError(f'Wrong file size: {candidate}')
    with candidate.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if actual != digest:
        raise RuntimeError(f'SHA256 mismatch: {candidate}')
    if candidate != path:
        partial.replace(path)
    print(f'Verified {path.name}', flush=True)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for name, repo, filename in SOURCES:
        manifest_path = DEST / f'{name}-source.json'
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text())
        else:
            with fetch(f'https://huggingface.co/api/datasets/{repo}') as response:
                revision = json.load(response)['sha']
            with fetch(f'https://huggingface.co/api/datasets/{repo}/tree/{revision}?recursive=true') as response:
                files = json.load(response)
            info = next(f for f in files if f['path'] == filename)
            manifest = {'dataset': name, 'repository': repo, 'revision': revision,
                        'filename': filename, 'size': info['size'], 'sha256': info['lfs']['oid']}
            manifest_path.write_text(json.dumps(manifest, indent=2))
        base = f'https://huggingface.co/datasets/{repo}/resolve/{manifest["revision"]}/'
        metadata = ['README.md'] + (['splits/color_train.txt', 'splits/color_test.txt', 'leaf_grouping/leaf-map.json'] if name == 'PlantVillage' else [])
        for item in metadata:
            target = DEST / f'{name}-{Path(item).name}'
            if not target.exists():
                with fetch(base + item) as response:
                    target.write_bytes(response.read())
        download(base + filename, DEST / f'{name}.zip', manifest['size'], manifest['sha256'])


if __name__ == '__main__':
    main()
