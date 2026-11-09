# Forest Sanctuary

A playable 3D walkthrough of the Fjäll Forest Resort, exported from the furnished Blender scene. Explore the pool and tree courtyard, living and dining pavilion, kitchen, two garden suites, and bathing pavilion.

- **Orbit** to inspect the model, or choose one of seven saved views.
- **Plan** reveals the pavilions from above.
- **Walk** uses WASD or arrow keys and mouse look, with drag and movement controls on touch screens. The sliding door leaves are hidden in Walk mode to leave the entrances open, with the fixed tracks and frames visible.
- **Guided tour** moves through all seven views. Switch between daylight, golden hour and dusk.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open [localhost:8000](http://localhost:8000). The viewer uses bundled assets and a WebGL-capable browser. It has no server-side dependencies.

Run `npm run check` to verify the JavaScript and decode the model's compressed mesh data.

## GitHub Pages

In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/ (root)**. The expected address is [jplovensa.github.io/forest-sanctuary](https://jplovensa.github.io/forest-sanctuary/).

## Re-export the model

Run these commands from the repository root with Blender 4.3, Python with Pillow, and gltfpack 0.25.

```sh
blender -b Fjall_Forest_Resort_Blender.blend -P tools/export_scene.py -- /tmp/forest-raw.glb
python3 tools/resize-textures.py /tmp/forest-raw.glb /tmp/forest-resized.glb
gltfpack -i /tmp/forest-resized.glb -o assets/sanctuary.glb -cc -kn -km
npm run check
```

The browser model retains the source rooms, forest placements, guests, joinery, textures and courtyard layout. Browser lighting is configured in `app.js`. Third-party runtime licenses are in `vendor/`.
