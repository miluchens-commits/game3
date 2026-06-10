extends CharacterBody3D

@export var speed := 8.0
@export var air_speed := 5.0
@export var jump_velocity := 7.7
@export var gravity := 14.8

@export var wall_cling_time := 1.5
@export var wall_slide_speed := 0.5
@export var wall_jump_force := 10.0
@export var wall_jump_up := 6.0

var is_wall_clinging := false
var wall_cling_timer := 0.0
var wall_jump_cooldown := 0.0
var mouse_sens := 0.002

@onready var camera := $Camera3D as Camera3D

func _ready():
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _input(event):
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sens)
		camera.rotate_x(-event.relative.y * mouse_sens)
		camera.rotation.x = clamp(camera.rotation.x, -1.4, 1.4)
	if event.is_action_pressed("ui_cancel"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _physics_process(delta):
	if wall_jump_cooldown > 0:
		wall_jump_cooldown -= delta
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	if is_on_floor():
		is_wall_clinging = false
		wall_cling_timer = 0.0
		if direction:
			velocity.x = direction.x * speed
			velocity.z = direction.z * speed
		else:
			velocity.x = lerp(velocity.x, 0.0, 0.15)
			velocity.z = lerp(velocity.z, 0.0, 0.15)
		if Input.is_action_just_pressed("jump"):
			velocity.y = jump_velocity
	else:
		var can_cling = is_on_wall() and wall_jump_cooldown <= 0
		if can_cling and not is_wall_clinging:
			is_wall_clinging = true
			wall_cling_timer = 0.0
		if is_wall_clinging:
			wall_cling_timer += delta
			velocity.y = -wall_slide_speed
			if direction:
				velocity.x = direction.x * air_speed * 0.3
				velocity.z = direction.z * air_speed * 0.3
			else:
				velocity.x = lerp(velocity.x, 0.0, 0.05)
				velocity.z = lerp(velocity.z, 0.0, 0.05)
			if Input.is_action_just_pressed("jump"):
				var wn := get_wall_normal()
				velocity = -wn * wall_jump_force + Vector3.UP * wall_jump_up
				is_wall_clinging = false
				wall_jump_cooldown = 0.3
			if wall_cling_timer > wall_cling_time:
				is_wall_clinging = false
		else:
			if direction:
				velocity.x = direction.x * air_speed
				velocity.z = direction.z * air_speed
			else:
				velocity.x = lerp(velocity.x, 0.0, 0.05)
				velocity.z = lerp(velocity.z, 0.0, 0.05)
			velocity.y -= gravity * delta
	move_and_slide()

func _unhandled_input(event):
	if event.is_action_pressed("shoot"):
		_shoot()

func _shoot():
	var ss = get_world_3d().direct_space_state
	var vp = get_viewport()
	var center = vp.size * 0.5
	var from = camera.project_ray_origin(center)
	var to = from + camera.project_ray_normal(center) * 100.0
	var query = PhysicsRayQueryParameters3D.new(from, to)
	query.exclude = [self]
	var result = ss.intersect_ray(query)
	if result:
		var impact = MeshInstance3D.new()
		var sm = SphereMesh.new()
		sm.radius = 0.04
		sm.height = 0.08
		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(1, 0.2, 0.1)
		mat.emission_enabled = true
		mat.emission = Color(1, 0.2, 0.1)
		sm.material = mat
		impact.mesh = sm
		impact.position = result.position
		get_tree().root.add_child(impact)
		get_tree().create_timer(2.0).timeout.connect(func():
			impact.queue_free()
		)
