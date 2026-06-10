@tool
extends Node3D

const PLAYER_SCENE = preload("res://scenes/player.tscn")

func _ready():
	if Engine.is_editor_hint():
		_generate_map()
	else:
		_setup_input()
		_generate_map()
		_spawn_player()

func _setup_input():
	if InputMap.has_action("move_left"):
		return
	var key_actions = {
		"move_left": KEY_A,
		"move_right": KEY_D,
		"move_forward": KEY_W,
		"move_back": KEY_S,
		"jump": KEY_SPACE,
	}
	for name in key_actions:
		InputMap.add_action(name)
		var ev = InputEventKey.new()
		ev.keycode = key_actions[name]
		InputMap.action_add_event(name, ev)
	InputMap.add_action("shoot")
	var mev = InputEventMouseButton.new()
	mev.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("shoot", mev)

func _mat(color: Color) -> Material:
	var m = StandardMaterial3D.new()
	m.albedo_color = color
	return m

func _box(pos: Vector3, size: Vector3, color: Color, parent: Node = null) -> MeshInstance3D:
	if parent == null:
		parent = self
	var mi = MeshInstance3D.new()
	var bm = BoxMesh.new()
	bm.size = size
	bm.material = _mat(color)
	mi.mesh = bm
	mi.position = pos
	parent.add_child(mi)
	return mi

func _ramp(pos: Vector3, size: Vector3, angle_deg: float, axis: String, color: Color) -> MeshInstance3D:
	var mi = _box(pos, size, color)
	if axis == "x":
		mi.rotate_x(deg_to_rad(angle_deg))
	elif axis == "z":
		mi.rotate_z(deg_to_rad(angle_deg))
	return mi

func _generate_map():
	var g = Color(0.22, 0.22, 0.22)
	var w = Color(0.5, 0.5, 0.5)
	var dw = Color(0.35, 0.35, 0.4)
	var hw = Color(0.6, 0.45, 0.3)
	var p = Color(0.3, 0.55, 0.3)
	var bl = Color(0.4, 0.45, 0.55)
	var rcol = Color(0.5, 0.35, 0.35)

	_box(Vector3(0, -0.1, 0), Vector3(30, 0.2, 30), g)

	var bw = 0.3
	var bh = 4.0
	_box(Vector3(0, bh / 2, -15), Vector3(30, bh, bw), dw)
	_box(Vector3(0, bh / 2, 15), Vector3(30, bh, bw), dw)
	_box(Vector3(-15, bh / 2, 0), Vector3(bw, bh, 30), dw)
	_box(Vector3(15, bh / 2, 0), Vector3(bw, bh, 30), dw)

	_box(Vector3(0, 0.75, 0), Vector3(5, 1.5, 5), w)
	_box(Vector3(0, 1.55, 0), Vector3(3.5, 0.8, 3.5), Color(0.6, 0.6, 0.6))
	_box(Vector3(0, 2.15, 0), Vector3(2, 0.5, 2), bl)

	var low_walls = [
		[Vector3(-7, 0.8, -6), Vector3(5, 1.6, 0.4), w],
		[Vector3(4, 0.8, -5), Vector3(3, 1.6, 0.4), w],
		[Vector3(-5, 0.8, 7), Vector3(4, 1.6, 0.4), w],
		[Vector3(0, 0.8, -9), Vector3(6, 1.6, 0.4), w],
		[Vector3(9, 0.8, 5), Vector3(2, 1.6, 2), w],
		[Vector3(-3, 0.8, -8), Vector3(2, 1.6, 0.4), w],
	]
	for wall in low_walls:
		_box(wall[0], wall[1], wall[2])

	var high_walls = [
		[Vector3(7, 1.4, 3), Vector3(4, 2.8, 0.4), hw],
		[Vector3(-8, 1.4, -8), Vector3(2.5, 2.8, 2.5), hw],
		[Vector3(-11, 1.4, 5), Vector3(3, 2.8, 0.4), hw],
		[Vector3(0, 1.4, 7), Vector3(3, 2.8, 0.4), hw],
	]
	for wall in high_walls:
		_box(wall[0], wall[1], wall[2])

	var pillar_pos = [
		Vector3(-11, 1.5, -11),
		Vector3(-11, 1.5, 11),
		Vector3(11, 1.5, -11),
		Vector3(11, 1.5, 11),
	]
	for pp in pillar_pos:
		_box(pp, Vector3(0.6, 3, 0.6), dw)

	var platforms = [
		[Vector3(8, 0.75, -8),  Vector3(2, 1.5, 2),    Vector3(8, 1.6, -8),  Vector3(2.5, 0.2, 2.5)],
		[Vector3(-12, 0.75, -5), Vector3(1.5, 1.5, 1.5), Vector3(-12, 1.6, -5), Vector3(2, 0.2, 2)],
		[Vector3(4, 0.75, 8),    Vector3(2, 1.5, 2),    Vector3(4, 1.6, 8),    Vector3(2.5, 0.2, 2.5)],
	]
	for plat in platforms:
		_box(plat[0], plat[1], dw)
		_box(plat[2], plat[3], p)

	var ramps = [
		[Vector3(8, 0.25, -6),   Vector3(0.5, 0.5, 3),  20, "z", rcol],
		[Vector3(-5, 0.25, 5),   Vector3(0.5, 0.5, 3),  20, "x", rcol],
	]
	for ramp in ramps:
		_ramp(ramp[0], ramp[1], ramp[2], ramp[3], ramp[4])

	var boxes = [
		[Vector3(-3, 0.4, -3), Vector3(1, 0.8, 1), dw],
		[Vector3(0, 0.4, 5), Vector3(1.5, 0.8, 1.5), dw],
		[Vector3(-8, 0.4, 0), Vector3(1, 0.8, 2), dw],
		[Vector3(10, 0.4, 0), Vector3(1.5, 0.8, 1), dw],
		[Vector3(3, 0.4, -3), Vector3(1.2, 0.8, 1.2), dw],
	]
	for b in boxes:
		_box(b[0], b[1], b[2])

	var light = DirectionalLight3D.new()
	light.shadow_enabled = true
	light.position = Vector3(10, 15, 10)
	light.look_at(Vector3.ZERO)
	add_child(light)

	var env_node = WorldEnvironment.new()
	var env = Environment.new()
	env.background_color = Color(0.45, 0.55, 0.65)
	env.background_mode = Environment.BG_COLOR
	env_node.environment = env
	add_child(env_node)

func _spawn_player():
	var p = PLAYER_SCENE.instantiate()
	p.position = Vector3(0, 1, 0)
	add_child(p)
