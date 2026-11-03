"""Externalize existing embedded artwork, preserving its original image bytes."""
import base64
import hashlib
import io
import json
import pathlib
import re
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/site.json').read_text())
manifest = {item['image']: item for item in data.get('imageAssets', [])}
converted = {}

def visit(value):
    if isinstance(value, str) and re.fullmatch(r'data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+', value):
        if value in converted:
            return converted[value]
        mime, content = value.split(',', 1)
        raw = base64.b64decode(content)
        extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}[mime[5:].split(';')[0]]
        path = 'assets/works/upload-' + hashlib.sha256(raw).hexdigest() + '.' + extension
        (root / path).write_bytes(raw)
        with Image.open(io.BytesIO(raw)) as source:
            info = {'image': path, 'width': source.width, 'height': source.height}
            if max(source.size) > 640:
                mobile = source.convert('RGBA')
                mobile.thumbnail((640, 640), Image.Resampling.LANCZOS)
                mobile_path = path.rsplit('.', 1)[0] + '-mobile.webp'
                mobile.save(root / mobile_path, 'WEBP', quality=80, method=6)
                info.update(mobile=mobile_path, mobileWidth=mobile.width, mobileHeight=mobile.height)
            else:
                info.update(mobile=path, mobileWidth=source.width, mobileHeight=source.height)
        manifest[path] = info
        converted[value] = path
        return path
    if isinstance(value, dict):
        return {key: visit(child) for key, child in value.items()}
    if isinstance(value, list):
        return [visit(child) for child in value]
    return value

data = visit(data)
data['imageAssets'] = list(manifest.values())
text = json.dumps(data, ensure_ascii=False, indent=2)
(root / 'data/site.json').write_text(text + '\n')
(root / 'data/site-data.js').write_text('window.TUTU_BOOTSTRAP = ' + text.replace('<', '\\u003c') + ';\n')
print(f'Converted {len(converted)} unique images; {len(manifest)} image records.')
