"""Builds the Aethergate player: a low-poly hooded sorcerer with a staff, rigged
on a reduced Quaternius Universal Animation Library skeleton, with clips baked
from that library. This script is the source of truth for the character; run it
through `pnpm assets:player` (see assets-src/README.md).

Blender 5.2, headless:
  blender --background --factory-startup --python-exit-code 1 \
    --python assets-src/player/build_player.py -- --library <zip> --out <glb>

Conventions: 1 Blender unit = 1 m. The library rig faces -Y with +Z up; the
armature object is turned half a turn at export so the glTF faces -Z like the
procedural mannequin (character's right hand on +X, origin at the feet).
"""

import bpy
import bmesh
import json
import math
import os
import sys
import tempfile
import zipfile
from mathutils import Matrix, Quaternion, Vector

LIBRARY_MEMBER = "Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb"
FPS = 30
SOURCE_FPS = 24

# The game plays `run` at rate 1 at this ground speed (config.animation.runClipSpeed).
RUN_CLIP_SPEED = 5.5

BUDGET = {"triangles": 4000, "bones": 40}

# Our bone -> library bone, with parent. Fingers are dropped (the hands are fists).
BONES = [
    ("root", "root", None),
    ("hips", "DEF-hips", "root"),
    ("spine1", "DEF-spine.001", "hips"),
    ("spine2", "DEF-spine.002", "spine1"),
    ("spine3", "DEF-spine.003", "spine2"),
    ("neck", "DEF-neck", "spine3"),
    ("head", "DEF-head", "neck"),
    ("shoulderL", "DEF-shoulder.L", "spine3"),
    ("upperArmL", "DEF-upper_arm.L", "shoulderL"),
    ("forearmL", "DEF-forearm.L", "upperArmL"),
    ("handL", "DEF-hand.L", "forearmL"),
    ("shoulderR", "DEF-shoulder.R", "spine3"),
    ("upperArmR", "DEF-upper_arm.R", "shoulderR"),
    ("forearmR", "DEF-forearm.R", "upperArmR"),
    ("handR", "DEF-hand.R", "forearmR"),
    ("thighL", "DEF-thigh.L", "hips"),
    ("shinL", "DEF-shin.L", "thighL"),
    ("footL", "DEF-foot.L", "shinL"),
    ("toeL", "DEF-toe.L", "footL"),
    ("thighR", "DEF-thigh.R", "hips"),
    ("shinR", "DEF-shin.R", "thighR"),
    ("footR", "DEF-foot.R", "shinR"),
    ("toeR", "DEF-toe.R", "footR"),
]
BONE_NAMES = [b[0] for b in BONES]
UPPER_BODY = {"spine1", "spine2", "spine3", "neck", "head"} | {
    f"{n}{s}" for n in ("shoulder", "upperArm", "forearm", "hand") for s in "LR"
}
LEFT_ARM = [f"{n}L" for n in ("shoulder", "upperArm", "forearm", "hand")]
RIGHT_ARM = [f"{n}R" for n in ("shoulder", "upperArm", "forearm", "hand")]


def mirror_name(name):
    if name.endswith("L"):
        return name[:-1] + "R"
    if name.endswith("R"):
        return name[:-1] + "L"
    return name


# Material slots. The game replaces each by name with a material colored from
# config.colors; these display colors only matter for previews.
MATERIALS = [
    ("robe", (0.36, 0.31, 0.40), 0.0),
    ("hood", (0.24, 0.20, 0.27), 0.0),
    ("skin", (0.78, 0.66, 0.52), 0.0),
    ("accent", (0.85, 0.65, 0.28), 0.0),
    ("staff", (0.29, 0.22, 0.16), 0.0),
    ("staffGem", (0.49, 0.78, 1.0), 4.0),
]
MAT = {name: i for i, (name, _, _) in enumerate(MATERIALS)}

# Fist center in the T-pose and the grip axis through it: the staff leaves the
# fist on the index-finger side, which is -Y while the palms face down.
FIST_R = Vector((-0.80, 0.062, 1.428))
GRIP_REST = Vector((0.0, -1.0, 0.0))

P = {
    "staff_above": 0.80,
    "staff_below": 0.55,
    "staff_radius": 0.022,
    "gem_radius": 0.06,
    "gem_half_length": 0.11,
    "shell": 0.012,
    "run_staff_carry": 0.8,
    "run_chest_steady": 0.5,
    # Aim: the staff fist out in front of the right shoulder, the staff pointing
    # ahead and a little up (armature space, character facing -Y).
    "aim_fist": Vector((-0.30, -0.42, 1.18)),
    "aim_elbow_pole": Vector((-0.9, 0.3, 0.6)),
    "aim_staff": Vector((-0.06, -0.93, 0.36)),
}

# ---------------------------------------------------------------------------
# Scene setup and library import


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    args = {}
    for key, value in zip(argv[::2], argv[1::2]):
        args[key.lstrip("-")] = value
    if "library" not in args or "out" not in args:
        raise SystemExit("usage: -- --library <zip> --out <glb> [--report <json>]")
    return args


def reset_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for block in list(coll):
            coll.remove(block)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = 1.0


def import_library(zip_path):
    """Imports the library's rig and clips from the zip without unpacking it next to code."""
    with zipfile.ZipFile(zip_path) as zf, tempfile.TemporaryDirectory() as tmp:
        glb = os.path.join(tmp, "library.glb")
        with zf.open(LIBRARY_MEMBER) as src, open(glb, "wb") as dst:
            dst.write(src.read())
        bpy.ops.import_scene.gltf(filepath=glb)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    for ob in list(bpy.data.objects):
        if ob is not rig:
            bpy.data.objects.remove(ob, do_unlink=True)
    rig.name = "library_rig"
    if rig.animation_data is None:
        rig.animation_data_create()
    return rig


# ---------------------------------------------------------------------------
# Rig


def build_rig(library_rig):
    data = bpy.data.armatures.new("player_rig")
    rig = bpy.data.objects.new("player", data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, source, parent in BONES:
        src = library_rig.data.bones[source]
        eb = data.edit_bones.new(name)
        eb.head = (0, 0, 0)
        eb.tail = (0, src.length, 0)
        eb.matrix = src.matrix_local
        if parent:
            eb.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    rig.animation_data_create()
    return rig


# ---------------------------------------------------------------------------
# Mesh: parts are lofted rings in the T-pose, each tagged for skin weights.


def frame_for(axis):
    axis = axis.normalized()
    helper = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
    u = helper.cross(axis).normalized()
    v = axis.cross(u)
    return u, v


def loft(bm, rings, segments, material, cap_start=False, cap_end=False, phase=0.0):
    """Tube through `rings` of (center, axis, ru, rv). Quads wind outward."""
    loops = []
    for center, axis, ru, rv in rings:
        u, v = frame_for(axis)
        loop = []
        for i in range(segments):
            a = phase + 2 * math.pi * i / segments
            loop.append(bm.verts.new(center + u * (ru * math.cos(a)) + v * (rv * math.sin(a))))
        loops.append(loop)
    faces = []
    for lo, hi in zip(loops, loops[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            faces.append(bm.faces.new((lo[i], lo[j], hi[j], hi[i])))
    if cap_start:
        faces.append(bm.faces.new(list(reversed(loops[0]))))
    if cap_end:
        faces.append(bm.faces.new(loops[-1]))
    for f in faces:
        f.material_index = material
    return loops, faces


def tip(bm, loop, point, material):
    """Closes a ring into a point (hood tip, gem ends)."""
    apex = bm.verts.new(point)
    faces = []
    for i in range(len(loop)):
        f = bm.faces.new((loop[i], loop[(i + 1) % len(loop)], apex))
        f.material_index = material
        faces.append(f)
    return faces


def shell(bm, faces, thickness):
    """Gives open surfaces thickness: an inward copy plus rim quads on the borders."""
    faces = [f for f in faces if f.is_valid]
    bm.normal_update()
    inner = {}
    for f in faces:
        for v in f.verts:
            if v not in inner:
                inner[v] = bm.verts.new(v.co - v.normal * thickness)
    region = set(faces)
    for f in faces:
        back = bm.faces.new([inner[v] for v in reversed(f.verts)])
        back.material_index = f.material_index
        for loop in f.loops:
            a, b = loop.vert, loop.link_loop_next.vert
            if sum(1 for g in loop.edge.link_faces if g in region) == 1:
                rim = bm.faces.new((b, a, inner[a], inner[b]))
                rim.material_index = f.material_index


def vertical(z, rx, ry, cx=0.0, cy=0.0):
    return (Vector((cx, cy, z)), Vector((0, 0, 1)), rx, ry)


def part_head(bm):
    rings = []
    for k in range(1, 6):
        t = k / 6
        a = math.pi * t
        rings.append(vertical(1.70 - 0.125 * math.cos(a), 0.092 * math.sin(a), 0.105 * math.sin(a), cy=-0.012))
    loops, faces = loft(bm, rings, 8, MAT["skin"])
    faces += tip(bm, list(reversed(loops[0])), Vector((0, -0.012, 1.575)), MAT["skin"])
    faces += tip(bm, loops[-1], Vector((0, -0.012, 1.825)), MAT["skin"])
    _, neck = loft(bm, [vertical(1.46, 0.055, 0.05, cy=0.02), vertical(1.62, 0.05, 0.045, cy=0.015)], 6, MAT["skin"])


def part_hood(bm):
    seg = 10
    rings = [
        vertical(1.50, 0.150, 0.150, cy=0.035),
        vertical(1.60, 0.140, 0.150, cy=0.025),
        vertical(1.72, 0.135, 0.148, cy=0.025),
        vertical(1.82, 0.110, 0.125, cy=0.040),
        vertical(1.89, 0.060, 0.075, cy=0.075),
    ]
    # Phase puts a seam at the front (-Y) so the face opening is symmetric.
    loops, faces = loft(bm, rings, seg, MAT["hood"], phase=-math.pi / 2 + math.pi / seg)
    faces += tip(bm, loops[-1], Vector((0, 0.17, 1.92)), MAT["hood"])
    # Face opening: front faces of the middle bands.
    opening = []
    for f in faces:
        c = f.calc_center_median()
        if 1.585 < c.z < 1.80 and c.y < 0 and abs(math.atan2(c.x, -c.y)) < math.radians(62):
            opening.append(f)
    bmesh.ops.delete(bm, geom=opening, context="FACES")
    surface = [f for f in faces if f.is_valid]
    shell(bm, surface, P["shell"])


def part_mantle(bm):
    seg = 12
    loops, faces = loft(
        bm,
        [vertical(1.50, 0.11, 0.095, cy=0.02), vertical(1.43, 0.22, 0.15, cy=0.02), vertical(1.31, 0.27, 0.18, cy=0.03)],
        seg,
        MAT["hood"],
    )
    # The back of the mantle hangs lower, like a short cape.
    for v in loops[-1]:
        back = max(0.0, v.co.y - 0.03) / 0.18
        v.co.z -= 0.14 * back
    shell(bm, faces, P["shell"])


def part_torso(bm):
    loft(
        bm,
        [
            vertical(0.93, 0.150, 0.110, cy=0.03),
            vertical(1.12, 0.155, 0.115, cy=0.02),
            vertical(1.30, 0.170, 0.120, cy=0.01),
            vertical(1.44, 0.150, 0.110, cy=0.02),
            vertical(1.50, 0.075, 0.065, cy=0.02),
        ],
        8,
        MAT["robe"],
        cap_start=True,
        cap_end=True,
    )


def part_skirt(bm):
    loops, faces = loft(
        bm,
        [
            vertical(1.04, 0.165, 0.125, cy=0.03),
            vertical(0.82, 0.215, 0.165, cy=0.03),
            vertical(0.52, 0.270, 0.215, cy=0.035),
            vertical(0.20, 0.320, 0.265, cy=0.04),
        ],
        12,
        MAT["robe"],
    )
    shell(bm, faces, P["shell"])


def part_sash(bm):
    _, faces = loft(
        bm,
        [vertical(0.975, 0.180, 0.142, cy=0.03), vertical(1.055, 0.172, 0.135, cy=0.03)],
        12,
        MAT["accent"],
        cap_start=True,
        cap_end=True,
    )
    # Knotted tail on the left hip so facing reads from behind.
    loft(
        bm,
        [
            (Vector((0.13, -0.10, 1.00)), Vector((0.15, -0.2, -1)), 0.035, 0.012),
            (Vector((0.15, -0.13, 0.80)), Vector((0.1, -0.2, -1)), 0.04, 0.012),
        ],
        4,
        MAT["accent"],
        cap_start=True,
        cap_end=True,
    )


def part_legs(bm):
    for s in (1, -1):
        x = 0.089 * s
        loft(
            bm,
            [vertical(0.94, 0.085, 0.085, cx=x), vertical(0.53, 0.065, 0.068, cx=x, cy=0.01), vertical(0.17, 0.052, 0.055, cx=x, cy=0.03)],
            6,
            MAT["hood"],
            cap_end=True,
        )
        # Boot: lofted from the heel to the toe.
        heel_to_toe = Vector((0, -1, -0.12))
        loft(
            bm,
            [
                (Vector((x, 0.075, 0.075)), heel_to_toe, 0.058, 0.075),
                (Vector((x, -0.02, 0.07)), heel_to_toe, 0.062, 0.07),
                (Vector((x, -0.16, 0.045)), heel_to_toe, 0.056, 0.045),
                (Vector((x, -0.25, 0.035)), heel_to_toe, 0.036, 0.034),
            ],
            6,
            MAT["hood"],
            cap_start=True,
            cap_end=True,
        )
        loft(bm, [vertical(0.06, 0.06, 0.062, cx=x, cy=0.03), vertical(0.22, 0.062, 0.064, cx=x, cy=0.03)], 6, MAT["hood"], cap_end=True)


def part_arm(bm, s):
    """Sleeve and fist for side s (+1 left, -1 right) in the T-pose."""
    axis = Vector((s, 0, 0))

    def ring(x, r, dz=0.0, rz=None):
        return (Vector((s * x, 0.065, 1.441 + dz)), axis, r, rz if rz is not None else r)

    _, faces = loft(
        bm,
        [ring(0.16, 0.078), ring(0.30, 0.070), ring(0.466, 0.062), ring(0.62, 0.075, -0.01), ring(0.725, 0.098, -0.025, 0.11)],
        8,
        MAT["robe"],
    )
    shell(bm, faces, P["shell"])
    # Cuff trim in the accent color.
    loft(bm, [ring(0.70, 0.096, -0.022, 0.106), ring(0.726, 0.100, -0.025, 0.112)], 8, MAT["accent"])
    fist = FIST_R.copy()
    fist.x = s * abs(fist.x)
    loft(
        bm,
        [
            (fist + Vector((-s * 0.07, 0, 0.005)), axis, 0.035, 0.04),
            (fist + Vector((-s * 0.035, 0, 0)), axis, 0.046, 0.05),
            (fist + Vector((s * 0.03, 0, -0.005)), axis, 0.045, 0.048),
            (fist + Vector((s * 0.055, 0, -0.01)), axis, 0.03, 0.035),
        ],
        6,
        MAT["skin"],
        cap_start=True,
        cap_end=True,
    )


def gem_offset():
    """Distance from the fist to the gem's widest ring, along the grip axis."""
    return P["staff_above"] + 0.03


def part_staff(bm):
    up = GRIP_REST
    base = FIST_R + (-up) * P["staff_below"]
    r = P["staff_radius"]
    pts = [
        (base, r * 0.9),
        (FIST_R + (-up) * 0.2, r),
        (FIST_R + up * 0.25, r * 1.05),
        (FIST_R + up * (P["staff_above"] - 0.12), r * 1.1),
    ]
    loft(bm, [(c, up, rr, rr) for c, rr in pts], 6, MAT["staff"], cap_start=True)
    # Ferrule at the foot and a metal band under the head.
    loft(bm, [(base + up * 0.0, up, r * 1.15, r * 1.15), (base + up * 0.06, up, r * 1.15, r * 1.15)], 6, MAT["accent"], True, True)
    head = FIST_R + up * (P["staff_above"] - 0.12)
    loft(
        bm,
        [(head - up * 0.02, up, r * 1.35, r * 1.35), (head + up * 0.03, up, r * 1.4, r * 1.4)],
        6,
        MAT["accent"],
        True,
        True,
    )
    # Metal cup holding the gem; most of the gem sits above it so it reads from behind.
    loops, faces = loft(
        bm,
        [(head + up * 0.03, up, r * 1.2, r * 1.2), (head + up * 0.08, up, 0.042, 0.042), (head + up * 0.10, up, 0.048, 0.048)],
        6,
        MAT["accent"],
        cap_start=True,
    )
    shell(bm, faces, 0.008)
    gem_center = FIST_R + up * gem_offset()
    h, gr = P["gem_half_length"], P["gem_radius"]
    gem_loops, _ = loft(bm, [(gem_center, up, gr, gr)], 6, MAT["staffGem"])
    tip(bm, list(reversed(gem_loops[0])), gem_center - up * h * 0.6, MAT["staffGem"])
    tip(bm, gem_loops[0], gem_center + up * h, MAT["staffGem"])


PARTS = [
    ("head", part_head),
    ("hood", part_hood),
    ("mantle", part_mantle),
    ("torso", part_torso),
    ("skirt", part_skirt),
    ("sash", part_sash),
    ("legs", part_legs),
    ("armL", lambda bm: part_arm(bm, 1)),
    ("armR", lambda bm: part_arm(bm, -1)),
    ("staff", part_staff),
]


def build_mesh(rig):
    bm = bmesh.new()
    ranges = []
    for name, build in PARTS:
        start = len(bm.verts)
        build(bm)
        bm.verts.ensure_lookup_table()
        ranges.append((name, start, len(bm.verts)))
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = False
    mesh = bpy.data.meshes.new("player")
    bm.to_mesh(mesh)
    bm.free()
    for name, color, emission in MATERIALS:
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1.0)
        bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*color, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.9
            if emission:
                bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
                bsdf.inputs["Emission Strength"].default_value = emission
        mesh.materials.append(mat)
    obj = bpy.data.objects.new("player_mesh", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = rig
    mod = obj.modifiers.new("rig", "ARMATURE")
    mod.object = rig
    assign_weights(obj, rig, ranges)
    return obj


# ---------------------------------------------------------------------------
# Skin weights: per part, inverse distance to the allowed bones' segments.


def seg_distance(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def inverse_distance(p, bones, segs, power=4.0):
    w = {b: 1.0 / (seg_distance(p, *segs[b]) ** power + 1e-6) for b in bones}
    return w


def side_of(p):
    return "L" if p.x >= 0 else "R"


def part_weights(part, p, segs):
    if part == "head":
        return {"head": 1.0} if p.z > 1.58 else inverse_distance(p, ["neck", "head", "spine3"], segs)
    if part == "hood":
        k = smoothstep(1.53, 1.64, p.z)
        return {"head": k, "neck": (1 - k) * 0.6, "spine3": (1 - k) * 0.4}
    if part == "mantle":
        return inverse_distance(p, ["spine3", "neck", "shoulderL", "shoulderR"], segs, 2.0)
    if part == "torso":
        return inverse_distance(p, ["hips", "spine1", "spine2", "spine3"], segs, 3.0)
    if part == "skirt":
        # Stiff at the waist, following the thighs toward the hem.
        hips = 0.3 + 0.7 * smoothstep(0.62, 1.0, p.z)
        left = smoothstep(-0.10, 0.10, p.x)
        return {"hips": hips, "thighL": (1 - hips) * left, "thighR": (1 - hips) * (1 - left)}
    if part == "sash":
        return {"hips": 1.0}
    if part == "legs":
        s = side_of(p)
        return inverse_distance(p, [f"thigh{s}", f"shin{s}", f"foot{s}", f"toe{s}"], segs)
    if part in ("armL", "armR"):
        s = part[-1]
        if abs(p.x) > 0.735:
            return {f"hand{s}": 1.0}
        return inverse_distance(p, [f"shoulder{s}", f"upperArm{s}", f"forearm{s}"], segs)
    if part == "staff":
        return {"handR": 1.0}
    raise KeyError(part)


def assign_weights(obj, rig, ranges):
    segs = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones}
    groups = {name: obj.vertex_groups.new(name=name) for name in BONE_NAMES}
    verts = obj.data.vertices
    for part, start, end in ranges:
        for i in range(start, end):
            w = part_weights(part, verts[i].co, segs)
            top = sorted(((v, b) for b, v in w.items() if v > 0), reverse=True)[:4]
            total = sum(v for v, _ in top)
            for v, b in top:
                if v / total > 0.01:
                    groups[b].add([i], v / total, "REPLACE")


# ---------------------------------------------------------------------------
# Clip baking. A pose is {bone: (location, quaternion)} in bone-local space.


def use_action(rig, action):
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]


def sample_library(library_rig, action, frame):
    """Pose of the library rig at `frame` in the library's own 24 fps numbering.

    The importer keys clips at the scene rate (FPS), so frames are converted here."""
    use_action(library_rig, action)
    scene = bpy.context.scene
    frame = frame * FPS / SOURCE_FPS
    whole = math.floor(frame)
    scene.frame_set(int(whole), subframe=frame - whole)
    pose = {}
    for name, source, _ in BONES:
        pb = library_rig.pose.bones[source]
        pose[name] = (pb.location.copy(), pb.rotation_quaternion.copy())
    # The physics body moves the character, so the root never does.
    pose["root"] = (Vector(), Quaternion())
    return pose


def mirrored(pose):
    """Mirrors a pose across the character's sagittal plane (the rig is symmetric)."""
    out = {}
    for name, (loc, q) in pose.items():
        out[mirror_name(name)] = (Vector((-loc.x, loc.y, loc.z)), Quaternion((q.w, q.x, -q.y, -q.z)))
    return out


def blend(a, b, w, bones=None):
    out = dict(a)
    for name in bones or BONE_NAMES:
        la, qa = a[name]
        lb, qb = b[name]
        out[name] = (la.lerp(lb, w), qa.slerp(qb, w))
    return out


def apply_pose(rig, pose):
    for name, (loc, q) in pose.items():
        pb = rig.pose.bones[name]
        pb.location = loc
        pb.rotation_quaternion = q
    bpy.context.view_layer.update()


def read_pose(rig):
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in rig.pose.bones}


def write_action(rig, name, frames):
    """Keys every bone on every frame so each glTF clip carries full tracks."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    slot = action.slots.new(id_type="OBJECT", name="player")
    strip = action.layers.new("base").strips.new(type="KEYFRAME")
    bag = strip.channelbag(slot, ensure=True)
    for bone in BONE_NAMES:
        path = f'pose.bones["{bone}"]'
        prev = None
        quats = []
        for pose in frames:
            q = pose[bone][1].normalized()
            if prev is not None and prev.dot(q) < 0:
                q = -q
            quats.append(q)
            prev = q
        for index in range(3):
            fc = bag.fcurves.new(f"{path}.location", index=index, group_name=bone)
            fc.keyframe_points.add(len(frames))
            fc.keyframe_points.foreach_set("co", [c for i, p in enumerate(frames) for c in (i, p[bone][0][index])])
        for index in range(4):
            fc = bag.fcurves.new(f"{path}.rotation_quaternion", index=index, group_name=bone)
            fc.keyframe_points.add(len(frames))
            fc.keyframe_points.foreach_set("co", [c for i, q in enumerate(quats) for c in (i, q[index])])
    for fc in bag.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    return action


def bake_range(library_rig, source, start, end, duration, loop=False):
    """Samples library frames start..end (24 fps) into `duration` seconds at 30 fps."""
    action = bpy.data.actions[source]
    count = max(2, round(duration * FPS) + 1)
    frames = [sample_library(library_rig, action, start + (end - start) * i / (count - 1)) for i in range(count)]
    if loop:
        frames[-1] = frames[0]
    return frames


def bone_world(rig, name, point="head"):
    pb = rig.pose.bones[name]
    return rig.matrix_world @ (pb.head if point == "head" else pb.tail)


def stance_speed(rig, frames):
    """How fast the ground passes under a planted foot (ball of the foot near the floor).

    Whole planted spans are measured end to end, because single-step speeds
    alias against the sampling rate."""
    distance = 0.0
    seconds = 0.0
    for foot in ("footL", "footR"):
        pts = []
        for pose in frames:
            apply_pose(rig, pose)
            pts.append(bone_world(rig, foot, "tail"))
        floor = min(p.z for p in pts)
        span = []
        for p in pts + [None]:
            if p is not None and p.z < floor + 0.03:
                span.append(p)
                continue
            if len(span) >= 3:
                distance += abs(span[-1].y - span[0].y)
                seconds += (len(span) - 1) / FPS
            span = []
    return distance / seconds


def with_upper_body(base, upper):
    out = dict(base)
    for name in UPPER_BODY:
        out[name] = upper[name]
    return out


def envelope(t, rise, fall_start):
    """0 -> 1 over [0, rise], hold, 1 -> 0 over [fall_start, 1] (normalized time)."""
    if t < rise:
        return smoothstep(0, rise, t)
    if t > fall_start:
        return 1 - smoothstep(fall_start, 1, t)
    return 1.0


def staff_direction(rig, pose):
    apply_pose(rig, pose)
    pb = rig.pose.bones["handR"]
    return (pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted() @ GRIP_REST).normalized()


def point_staff(rig, pose, direction):
    """Turns the right wrist so the staff points along `direction` (armature space)."""
    apply_pose(rig, pose)
    pb = rig.pose.bones["handR"]
    rest = pb.bone.matrix_local.to_3x3()
    grip_local = rest.inverted() @ GRIP_REST
    current = (pb.matrix.to_3x3() @ grip_local).normalized()
    turn = current.rotation_difference(direction.normalized()).to_matrix()
    target = pb.matrix.copy()
    loc = target.translation.copy()
    target = (turn @ target.to_3x3()).to_4x4()
    target.translation = loc
    basis = rig.convert_space(pose_bone=pb, matrix=target, from_space="POSE", to_space="LOCAL")
    out = dict(pose)
    out["handR"] = (pose["handR"][0], basis.to_quaternion())
    return out


def reach(rig, pose, chain, target, pole):
    """Two-bone IK with a temporary constraint, baked back into local rotations."""
    apply_pose(rig, pose)
    empties = []
    for name, co in (("ik_target", target), ("ik_pole", pole)):
        e = bpy.data.objects.new(name, None)
        e.location = co
        bpy.context.scene.collection.objects.link(e)
        empties.append(e)
    upper, lower = chain
    con = rig.pose.bones[lower].constraints.new("IK")
    con.target = empties[0]
    con.pole_target = empties[1]
    con.pole_angle = 0.0
    con.chain_count = 2
    bpy.context.view_layer.update()
    mats = {n: rig.pose.bones[n].matrix.copy() for n in chain}
    rig.pose.bones[lower].constraints.remove(con)
    for e in empties:
        bpy.data.objects.remove(e, do_unlink=True)
    out = dict(pose)
    for n in chain:
        pb = rig.pose.bones[n]
        apply_pose(rig, out)
        basis = rig.convert_space(pose_bone=pb, matrix=mats[n], from_space="POSE", to_space="LOCAL")
        out[n] = (out[n][0], basis.to_quaternion())
    apply_pose(rig, out)
    return out


def bake_clips(library_rig, rig):
    lib = bpy.data.actions
    report = {}

    idle = bake_range(library_rig, "Idle_Loop", 0, 60, 60 / SOURCE_FPS, loop=True)
    rest_pose = idle[0]

    # Run: retime the jog so the planted foot moves at RUN_CLIP_SPEED.
    jog = bake_range(library_rig, "Jog_Fwd_Loop", 0, 22, 22 / SOURCE_FPS)
    natural = stance_speed(rig, jog)
    run_duration = 22 / SOURCE_FPS * natural / RUN_CLIP_SPEED
    run = bake_range(library_rig, "Jog_Fwd_Loop", 0, 22, run_duration, loop=True)
    # A full arm pump swings the staff through the face, so the staff arm keeps
    # most of the idle carry and only a little of the jog's swing.
    run = [blend(f, rest_pose, P["run_staff_carry"], ["shoulderR", "upperArmR"]) for f in run]
    run = [blend(f, rest_pose, 1.0, ["forearmR", "handR"]) for f in run]
    # The jog counter-rotates the chest about 36 degrees, which swings a held
    # staff from side to side and would also swing an aim layer added on top.
    run = [blend(f, rest_pose, P["run_chest_steady"], ["spine2", "spine3"]) for f in run]
    carry = staff_direction(rig, rest_pose)
    run = [point_staff(rig, f, carry) for f in run]
    report["run"] = {"natural_speed": natural, "speed": stance_speed(rig, run), "seconds": run_duration}
    if abs(report["run"]["speed"] - RUN_CLIP_SPEED) > 0.25:
        raise RuntimeError(f"run clip speed off: {report['run']}")

    # Dodge: the dive and roll, without getting up; the game fits it to config.dodge.duration.
    dodge = bake_range(library_rig, "Roll", 2, 24, 22 / SOURCE_FPS)

    # Layers hold the idle pose below the waist and start and end on it.
    aim_pose = with_upper_body(rest_pose, sample_library(library_rig, lib["Pistol_Aim_Neutral"], 0))
    aim_pose = blend(aim_pose, rest_pose, 1.0, LEFT_ARM)
    aim_pose = reach(rig, aim_pose, ("upperArmR", "forearmR"), P["aim_fist"], P["aim_elbow_pole"])
    aim_pose = point_staff(rig, aim_pose, P["aim_staff"])
    apply_pose(rig, aim_pose)
    report["aim"] = {"gem": list(gem_position(rig))}
    aim = [aim_pose, aim_pose]

    bash = []
    swing = bake_range(library_rig, "Sword_Attack", 3, 30, 27 / SOURCE_FPS)
    for i, pose in enumerate(swing):
        t = i / (len(swing) - 1)
        bash.append(blend(rest_pose, with_upper_body(rest_pose, pose), envelope(t, 0.12, 0.55), UPPER_BODY))

    reload = lib["Pistol_Reload"]
    # The reload frame where the right fist comes closest to the face, mirrored to the left hand.
    gaps = {}
    for f in range(0, 40):
        apply_pose(rig, sample_library(library_rig, reload, f))
        gaps[f] = (bone_world(rig, "handR") - bone_world(rig, "head", "tail")).length
    best = min(gaps, key=gaps.get)
    sip = blend(rest_pose, mirrored(sample_library(library_rig, reload, best)), 1.0, LEFT_ARM)
    head_loc, head_q = sip["head"]
    sip["head"] = (head_loc, head_q @ Quaternion(Vector((1, 0, 0)), -0.3))
    drink_seconds = 0.9
    drink = []
    count = round(drink_seconds * FPS) + 1
    for i in range(count):
        t = i / (count - 1)
        drink.append(blend(rest_pose, sip, envelope(t, 0.3, 0.75), LEFT_ARM + ["head"]))
    report["drink"] = {"source_frame": best}

    apply_pose(rig, rest_pose)
    for name, frames in (("idle", idle), ("run", run), ("dodge", dodge), ("aim", aim), ("bash", bash), ("drink", drink)):
        write_action(rig, name, frames)
    return report


def gem_position(rig):
    pb = rig.pose.bones["handR"]
    deform = pb.matrix @ pb.bone.matrix_local.inverted()
    return deform @ (FIST_R + GRIP_REST * gem_offset())


# ---------------------------------------------------------------------------
# Checks and export


def census(obj):
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    loose = sum(1 for v in bm.verts if not v.link_faces)
    degenerate = sum(1 for f in bm.faces if f.calc_area() <= 1e-8)
    bm.free()
    unweighted = sum(1 for v in mesh.vertices if not v.groups)
    report = {
        "triangles": len(mesh.polygons),
        "vertices": len(mesh.vertices),
        "bones": len(BONES),
        "loose_vertices": loose,
        "degenerate_faces": degenerate,
        "unweighted_vertices": unweighted,
        "height": max(v.co.z for v in mesh.vertices),
    }
    problems = [k for k in ("loose_vertices", "degenerate_faces", "unweighted_vertices") if report[k]]
    if problems or report["triangles"] > BUDGET["triangles"] or report["bones"] > BUDGET["bones"]:
        raise RuntimeError(f"census failed: {report}")
    return report


def export(rig, out):
    for ob in list(bpy.data.objects):
        if ob.name == "library_rig":
            bpy.data.objects.remove(ob, do_unlink=True)
    for action in list(bpy.data.actions):
        if action.name not in ("idle", "run", "dodge", "aim", "bash", "drink"):
            bpy.data.actions.remove(action)
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
    # Half a turn so the character faces glTF -Z.
    rig.rotation_euler = (0, 0, math.pi)
    bpy.context.view_layer.update()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_vertex_color="NONE",
        export_skins=True,
        export_influence_nb=4,
        export_def_bones=False,
        export_leaf_bone=False,
        export_rest_position_armature=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_step=1,
        export_optimize_animation_size=False,
        export_anim_slide_to_zero=True,
        export_morph=False,
        export_extras=False,
    )


def main():
    args = parse_args()
    reset_scene()
    library_rig = import_library(args["library"])
    rig = build_rig(library_rig)
    obj = build_mesh(rig)
    report = {"mesh": census(obj)}
    report["clips"] = bake_clips(library_rig, rig)
    export(rig, args["out"])
    text = json.dumps(report, indent=2, default=lambda v: round(v, 4) if isinstance(v, float) else str(v))
    print("PLAYER_REPORT " + json.dumps(report, default=str))
    if "report" in args:
        with open(args["report"], "w") as fh:
            fh.write(text + "\n")


main()
