"""Export the Forest Sanctuary browser model from the furnished Blender scene."""
import sys
from pathlib import Path

import bpy


def collection(prefix):
    return next(item for item in bpy.data.collections if item.name.startswith(prefix))


def parent_to_group(objects, name):
    scene = bpy.context.scene
    marker = bpy.data.objects.new(name, None)
    scene.collection.objects.link(marker)
    for obj in objects:
        if obj.parent is None:
            transform = obj.matrix_world.copy()
            obj.parent = marker
            obj.matrix_world = transform


def prepare_scene():
    canopies = collection("Canopy trees")
    for instance in list(canopies.objects):
        if not instance.instance_collection:
            continue
        for prototype in instance.instance_collection.objects:
            obj = bpy.data.objects.new(instance.name + " • " + prototype.name, prototype.data)
            canopies.objects.link(obj)
            obj.matrix_world = instance.matrix_world @ prototype.matrix_world
        bpy.data.objects.remove(instance, do_unlink=True)

    for source, name in (
        ("03 | Shared canopy", "SharedRoof"),
        ("Canopy trees", "ForestCanopies"),
        ("Terrain, trail", "ForestTerrain"),
    ):
        parent_to_group(list(collection(source).objects), name)
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
        if shader is None:
            continue
        for socket_name in ("Base Color", "Normal"):
            socket = shader.inputs[socket_name]
            for link in list(socket.links):
                if link.from_node.type != "TEX_IMAGE":
                    material.node_tree.links.remove(link)


def main():
    target = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    prepare_scene()
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        export_image_format="AUTO",
        export_jpeg_quality=77,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_gpu_instances=True,
    )


if __name__ == "__main__":
    main()
