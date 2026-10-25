"""One image arrives through stdin; neither bytes nor base64 are written to disk."""
import base64
import json
import sys
from common import extractor, image_tensor, extract, load_head, predict_features

def main():
    payload = json.loads(sys.stdin.buffer.read(6 * 1024 * 1024 + 1))
    data = base64.b64decode(payload['image'], validate=True)
    if not 0 < len(data) <= 4 * 1024 * 1024:
        raise ValueError('Invalid image size.')
    metadata, params = load_head()
    net, transform = extractor()
    result = predict_features(extract(net, [image_tensor(data, transform)]), metadata, params)[0]
    print(json.dumps(result), flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Details are deliberately not echoed: stdin contains the uploaded image.
        print(json.dumps({'error': 'Local model could not process this image. Check training artifacts and Python dependencies.'}), flush=True)
        sys.exit(1)
