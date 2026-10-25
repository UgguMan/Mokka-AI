"""Extract a no-checkout PlantDoc clone, preserving folders and recording filename changes.
The upstream data includes filenames containing '?' and ':' which Windows cannot check out.
"""
import hashlib, io, json, pathlib, re, subprocess, zipfile
root = pathlib.Path(__file__).resolve().parents[1] / 'PlantDoc'
archive = subprocess.check_output(['git', '-c', 'core.protectNTFS=false', '-C', str(root), 'archive', '--format=zip', 'HEAD'])
renamed = {}
with zipfile.ZipFile(io.BytesIO(archive)) as source:
    for item in source.infolist():
        if item.is_dir():
            continue
        original = pathlib.PurePosixPath(item.filename)
        if original.is_absolute() or '..' in original.parts:
            raise ValueError('Unsafe archive path')
        name = original.name
        if re.search(r'[<>:"\\|?*]', name) or len(name) > 120:
            name = hashlib.sha256(item.filename.encode()).hexdigest()[:20] + original.suffix
            renamed[str(original)] = str(original.parent / name)
        target = root.joinpath(*original.parts[:-1], name)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_bytes(source.read(item))
(root.parent / 'metadata').mkdir(exist_ok=True)
(root.parent / 'metadata' / 'filename-map.json').write_text(json.dumps(renamed, indent=2), encoding='utf-8')
print(f'Extracted original dataset bytes; safely renamed {len(renamed)} filenames. Class folders unchanged.')
