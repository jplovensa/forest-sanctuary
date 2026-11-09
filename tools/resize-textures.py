"""Resize embedded glTF images while retaining alpha for the tree foliage."""
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image


def resize(source, target):
    raw = Path(source).read_bytes()
    json_size = struct.unpack_from("<I", raw, 12)[0]
    model = json.loads(raw[20:20 + json_size])
    binary = raw[28 + json_size:]
    images = {image["bufferView"]: image for image in model.get("images", [])}
    out = bytearray()
    for index, view in enumerate(model["bufferViews"]):
        offset = view.get("byteOffset", 0)
        contents = binary[offset:offset + view["byteLength"]]
        if index in images:
            with Image.open(io.BytesIO(contents)) as image:
                image.thumbnail((768, 768), Image.Resampling.LANCZOS)
                alpha = "A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255
                result = io.BytesIO()
                if alpha:
                    image.convert("RGBA").save(result, "PNG", optimize=True)
                    images[index]["mimeType"] = "image/png"
                else:
                    image.convert("RGB").save(result, "JPEG", quality=81, optimize=True)
                    images[index]["mimeType"] = "image/jpeg"
                contents = result.getvalue()
        out.extend(b"\0" * (-len(out) % 4))
        view["byteOffset"] = len(out)
        view["byteLength"] = len(contents)
        out.extend(contents)
    out.extend(b"\0" * (-len(out) % 4))
    model["buffers"][0]["byteLength"] = len(out)
    document = json.dumps(model, separators=(",", ":")).encode()
    document += b" " * (-len(document) % 4)
    Path(target).write_bytes(
        struct.pack("<4sIII4s", b"glTF", 2, 28 + len(document) + len(out), len(document), b"JSON")
        + document + struct.pack("<I4s", len(out), b"BIN\0") + out
    )


if __name__ == "__main__":
    resize(*sys.argv[1:])
