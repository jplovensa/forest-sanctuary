# Forest Sanctuary

A playable 3D walkthrough of the Fjäll Forest Resort, exported from the furnished Blender scene. Explore the pool and tree courtyard, living and dining pavilion, kitchen, two garden suites, and bathing pavilion.

- **Orbit** to inspect the model, or choose one of seven saved views.
- **Plan** reveals the pavilions from above.
- **Walk** uses WASD or arrow keys and mouse look, with drag and movement controls on touch screens. Open and close the five sliding entrances and the two bathing pavilion doors from the sidebar or press E near a door in Walk mode. Click a nearby door to toggle it.
- **Bedroom lights** are independent. Use either suite’s control, click its wall switch or press L near the switch in Walk mode.
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


## Surface and environment assets

The viewer layers photo-derived PBR maps over the model’s original finishes. The maps and forest lighting below are from Poly Haven under CC0.

- [Teak veneer](https://polyhaven.com/a/teak_veneer)
- [Rough linen](https://polyhaven.com/a/rough_linen)
- [Plastered wall](https://polyhaven.com/a/plastered_wall_02)
- [Concrete floor](https://polyhaven.com/a/concrete_floor_02)
- [Forest ground](https://polyhaven.com/a/forest_ground_04)
- [Nature Reserve Forest HDRI](https://polyhaven.com/a/nature_reserve_forest)

The pool uses a planar reflection with animated surface normals. The forest sway and water ripples respect the operating system’s reduced-motion setting.
