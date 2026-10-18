"""Developer-only asset optimization. Requires Pillow; never processes visitor photos.

Run from any directory. Originals and their rights records remain unchanged.
"""
from pathlib import Path
from datetime import datetime, timezone
from hashlib import sha256
import json
import PIL
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'public' / 'hairstyles'
credits = json.loads((root / 'credits.json').read_text(encoding='utf-8'))
destination = root / 'previews'
destination.mkdir(exist_ok=True)
records = []
for record in credits['records']:
    original_url = record['image']['url']
    original = root / Path(original_url).name
    output = destination / (original.stem + '.webp')
    with Image.open(original) as image:
        image = image.convert('RGB')
        image.thumbnail((768, 768), Image.Resampling.LANCZOS)
        image.save(output, 'WEBP', quality=85, method=6)
        width, height = image.size
    data = output.read_bytes()
    records.append({
        'id': record['id'], 'source': original_url,
        'sourceSha256': sha256(original.read_bytes()).hexdigest(),
        'path': 'previews/' + output.name, 'width': width, 'height': height,
        'bytes': len(data), 'sha256': sha256(data).hexdigest(),
        'modifications': 'Gallery display resized to 768-pixel edge and encoded as WebP quality 85; original PNG retained unchanged.',
    })
manifest = {'schemaVersion': '1.0.0', 'generatedAt': datetime.now(timezone.utc).date().isoformat(),
            'processor': 'Pillow ' + PIL.__version__, 'records': records}
(root / 'preview-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Generated {len(records)} gallery previews: {sum(r["bytes"] for r in records):,} bytes total.')
