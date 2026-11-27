//------- CONSTANTS -------
// 1 unit = 1/1000 of the canvas width
// 1 tick = 1/60 of a second
const shield_duration = 100                       //ticks
const shield_size = 55;                           //units
const countdown_size = 180;                       //units
const healthbar_size = 40;                        //units
const border_width = 12;                          //units
const healthbar_offset = 25;                      //units
const control_size = 160;                         //units
const bush_size = 40;                             //units
const wall_width = 35;                            //units
const wall_height = wall_width * 3 / 5;           //units
const wall_offset = 3;                            //units
const tank_spawn_pos = { x: 300, y: 150 };        //x: units, y: units
const tank_size = 40;                             //units
const tank_speed = 1.5;                           //units/tick
const tank_rotation_speed = 3 / 180 * Math.PI;    //radians/tick
const tank_cooldown = 30;                         //ticks
const bullet_speed = 5;                           //units/tick
const bullet_size = 10;                           //units
const bg_color = '#D5C69C';                     //color

const unit_width = 1000;                          //units
const unit_height = unit_width * 9 / 16;          //units

const colors = ['yellow', 'blue', 'red', 'green'];
const color_codes = ['#eedb2f', '#4a91e2', '#d0021a', '#72cf0f'];

const player_count_configuration = {
    2: [0, 3],
    3: [0, 1, 3],
    4: [0, 1, 2, 3]
}

const game_state = Object.freeze({
    Menu: 0,
    Tutorial: 1,
    Playing: 2,
    Win: 3,
});

//-------- DEBUG --------
const debug = false;
const alternative_start_state = game_state.Playing;

//------- RENDERING -------
class renderer {
    canvas;
    context;
    html;
    scale;
    canvas_width;
    canvas_height;

    constructor(canvas) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.html = document.documentElement;
    }

    update() {
        this.canvas_width = Math.min(this.html.clientWidth, this.html.clientHeight * 16 / 9);
        this.canvas_height = Math.min(this.html.clientHeight, this.html.clientWidth * 9 / 16);
        this.scale = this.canvas_width / unit_width;
        this.canvas.width = this.canvas_width;
        this.canvas.height = this.canvas_height;
    }

    draw_image(image, x, y, width, height) {
        height = height == -1 ? width * image.height / image.width : height;
        this.context.drawImage(image, x * this.scale, y * this.scale, width * this.scale, height * this.scale);
    }
    draw_image_centered(image, x, y, width, height) {
        height = height == -1 ? width * image.height / image.width : height;
        width = width == -1 ? height * image.width / image.height : width;
        this.context.drawImage(image, (x - width / 2) * this.scale, (y - height / 2) * this.scale, width * this.scale, height * this.scale);
    }
    draw_rotated_image(image, x, y, width, height, angle) {
        height = height == -1 ? width * image.height / image.width : height;
        this.context.save();
        this.context.translate(x * this.scale, y * this.scale);
        this.context.rotate(angle);
        this.context.drawImage(image, -width / 2 * this.scale, -height / 2 * this.scale, width * this.scale, height * this.scale);
        this.context.restore();
    }
    fill_rect(x, y, width, height, rotation, color) {
        this.context.save();
        this.context.translate((x + width / 2) * this.scale, (y + height / 2) * this.scale);
        this.context.rotate(rotation);
        this.context.translate(-(x + width / 2) * this.scale, -(y + height / 2) * this.scale);
        this.context.fillStyle = color;
        this.context.fillRect(x * this.scale, y * this.scale, width * this.scale, height * this.scale);
        this.context.restore();
    }
    draw_rect(x, y, width, height, color, rotation, line_width) {
        this.context.save();
        this.context.translate((x + width / 2) * this.scale, (y + height / 2) * this.scale);
        this.context.rotate(rotation);
        this.context.translate(-(x + width / 2) * this.scale, -(y + height / 2) * this.scale);
        this.context.strokeStyle = color;
        this.context.lineWidth = line_width * this.scale;
        this.context.strokeRect(x * this.scale, y * this.scale, width * this.scale, height * this.scale);
        this.context.restore();
    }
    fill_ellipse(x, y, radius_x, radius_y, rotation, fill_color) {
        this.context.fillStyle = fill_color;
        this.context.beginPath();
        this.context.ellipse(x * this.scale, y * this.scale, radius_x * this.scale, radius_y * this.scale, rotation, 0, 2 * Math.PI);
        this.context.fill();
    }
    draw_ellipse(x, y, radius_x, radius_y, rotation, stroke_color, line_width) {
        this.context.strokeStyle = stroke_color;
        this.context.lineWidth = line_width * this.scale;
        this.context.beginPath();
        this.context.ellipse(x * this.scale, y * this.scale, radius_x * this.scale, radius_y * this.scale, rotation, 0, 2 * Math.PI);
        this.context.stroke();
    }
}

function clamp(x, min, max) {
    return x < min ? min : x > max ? max : x;
}

//------- GAME -------
class control {
    id = -1;
    x = 0;
    y = 0;
    orientation = 0;
    down = false;
    game = null;

    constructor(id, game) {
        this.id = id;
        this.x = this.id % 2 ? unit_width - control_size : 0;
        this.y = this.id >= 2 ? unit_height - control_size : 0;
        this.game = game;
    }
    update() {
        //check clicked
        this.down = this.game.mouse_down_box(this.x, this.y, control_size, control_size);
    }
    render() {
        this.game.renderer.draw_image(this.down ? this.game.control_images_down[this.id] : this.game.control_images[this.id], this.x, this.y, control_size, control_size);
        if (debug)
            this.game.renderer.draw_rect(this.x, this.y, control_size, control_size, color_codes[this.id], 0, 3);
    }
}
class tank {
    id = -1;
    health = 2;
    cooldown = 0;
    last_control_state = false;
    x = 0;
    y = 0;
    orientation = 0;
    rot_multiplier = 1;
    shield_time = -1;
    game = null;

    constructor(id, game) {
        this.id = id;
        this.game = game;
        this.x = this.id % 2 ? unit_width - tank_spawn_pos.x : tank_spawn_pos.x;
        this.y = this.id >= 2 ? unit_height - tank_spawn_pos.y : tank_spawn_pos.y;
    }
    bullet_hit() {
        if (this.health && this.shield_time == -1) {
            this.health -= 1;
            if (this.health == 0)
                this.game.tanks_destroyed++;
            else
                this.shield_time = 0;
        }

    }
    update() {
        //if tank active (not destroyed)
        if (this.health) {
            //if its control is down, move / shoot
            if (this.game.controls[this.id].down) {
                //if it's the first frame where the control is down
                if (!this.last_control_state) {
                    this.rot_multiplier *= -1;
                    if (this.cooldown == 0 && this.shield_time == -1) {
                        this.cooldown = tank_cooldown;
                        //shoot (instance a bullet)
                        this.game.bullets.push(new bullet(this.id, this.x + tank_size / 2 * Math.sin(this.orientation), this.y - tank_size / 2 * Math.cos(this.orientation), this.orientation, this.game));
                    }
                }
                //move it
                this.x += tank_speed * Math.sin(this.orientation);
                this.y -= tank_speed * Math.cos(this.orientation);
            }
            //control not down, rotate it
            else {
                //rotate it
                this.orientation += tank_rotation_speed * this.rot_multiplier;
                this.orientation = this.orientation % 360;
            }

            //update cooldown
            this.cooldown -= 1;
            if (this.cooldown < 0) {
                this.cooldown = 0;
            }
            this.last_control_state = this.game.controls[this.id].down;
        }
        //check for collision
        for (let i = 0; i < this.game.players; i++) {
            const tank = this.game.tanks[player_count_configuration[this.game.players][i]];
            if (tank != this)
                while (this.game.circle_collision(this.x, this.y, tank_size / 2, tank.x, tank.y, tank_size / 2))
                    this.game.resolve_collision(this, tank);
            const x = i % 2 ? unit_width : 0;
            const y = i >= 2 ? unit_height : 0;
            if (this.game.circle_collision(this.x, this.y, control_size, x, y, tank_size / 2)) {
                const r = this.game.calculate_point_angle(x, y, this.x, this.y);
                this.x = x + Math.sin(r) * (control_size + tank_size / 2);
                this.y = y + Math.cos(r) * (control_size + tank_size / 2);
            }
        }
        this.x = clamp(this.x, tank_size / 2 + border_width, (unit_width - border_width - tank_size / 2));
        this.y = clamp(this.y, tank_size / 2 + border_width, (unit_height - border_width - tank_size / 2));

        if (this.shield_time != -1) {
            this.shield_time++;
            if (this.shield_time > shield_duration)
                this.shield_time = -1;
        }
    }
    render() {
        this.game.renderer.draw_rotated_image(this.health ? this.game.tank_images[this.id] : this.game.tank_image_destroyed, this.x, this.y, tank_size, -1, this.orientation);

        if (this.shield_time != -1) {
            const percentage = this.shield_time / shield_duration;
            this.game.renderer.context.globalAlpha = 1 - Math.pow(percentage, 5);
            this.game.renderer.draw_image_centered(this.game.shield_image, this.x, this.y, shield_size + percentage * 30, -1);
            this.game.renderer.context.globalAlpha = 1;
        }

        this.game.renderer.draw_image_centered(this.game.healthbar_images[this.health], this.x, this.y - healthbar_offset, healthbar_size, -1);
        if (debug)
            this.game.renderer.draw_ellipse(this.x, this.y, tank_size / 2, tank_size / 2, 0, color_codes[this.id], 3);
    }
}
class bullet {
    id = -1;
    x = 0;
    y = 0;
    orientation = 0;
    element = null;
    game = null;

    constructor(id, x, y, orientation, game) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.orientation = orientation;
        this.game = game;
    }
    delete() {
        const index = this.game.bullets.indexOf(this);
        if (index !== -1) this.game.bullets.splice(index, 1);
    }
    update() {
        //move it
        this.x += bullet_speed * Math.sin(this.orientation);
        this.y -= bullet_speed * Math.cos(this.orientation);

        //check if outside border
        if (this.x > unit_width + 200 || this.y > unit_height + 200 || this.x < -200 || this.y < -200)
            this.delete();

        //check if hitting any tank
        for (let i = 0; i < this.game.players; i++) {
            const tank = this.game.tanks[player_count_configuration[this.game.players][i]];
            if (tank.id != this.id) {
                const radians = this.orientation;
                if (this.game.circle_collision(this.x + bullet_size * Math.sin(radians), this.y - bullet_size * Math.cos(radians), bullet_size / 2, tank.x, tank.y, tank_size / 2)) {
                    this.delete();
                    tank.bullet_hit();
                }
            }
        }

        //check if hitting any wall
        for (let i = 0; i < this.game.walls.length; i++) {
            const wall = this.game.walls[i];
            if (this.game.circle_collision(this.x + bullet_size * Math.sin(this.orientation), this.y - bullet_size * Math.cos(this.orientation), bullet_size / 2, wall.x, wall.y, wall_width / 2))
                this.delete();
        }

        //check if hitting any bush
        for (let i = 0; i < this.game.bushes.length; i++) {
            const bush = this.game.bushes[i];
            if (this.game.circle_collision(this.x + bullet_size * Math.sin(this.orientation), this.y - bullet_size * Math.cos(this.orientation), bullet_size / 2, bush.x, bush.y, bush_size / 2)) {
                bush.delete();
                this.delete();
            }
        }
    }
    render() {
        this.game.renderer.draw_rotated_image(this.game.bullet_images[this.id], this.x, this.y, bullet_size, -1, this.orientation);
        if (debug) {
            this.game.renderer.draw_ellipse(this.x, this.y, bullet_size / 2, bullet_size / 2, 0, color_codes[this.id], 3);
        }
    }
}
class wall {
    id = 0;
    x = 0;
    y = 0;
    orientation = 0;
    game = null;

    constructor(id, game) {
        this.id = id;
        this.game = game;
        this.orientation = 0;

        let tank_index = Math.floor(this.id / 16);
        this.x = tank_index % 2 ? unit_width - tank_spawn_pos.x : tank_spawn_pos.x;
        this.y = tank_index >= 2 ? unit_height - tank_spawn_pos.y : tank_spawn_pos.y;

        let wall_index = this.id % 16;
        let wall_width_total = wall_offset + wall_width;
        if (wall_index <= 9) {
            this.y += wall_index <= 4 ? wall_width * 2 : -wall_width * 2;
            this.x += (wall_index % 5 - 2) * wall_width_total;
        }
        else {
            this.x += wall_index <= 12 ? wall_width * 3 : -wall_width * 3;
            this.y += (wall_index % 3 - 1) * wall_width_total;
            this.orientation = Math.PI / 2;
        }
    }
    update() {
        for (let i = 0; i < this.game.players; i++) {
            const tank = this.game.tanks[player_count_configuration[this.game.players][i]];
            while (this.game.rotated_rect_circle_collision(tank.x, tank.y, tank_size / 2, this.x, this.y, wall_width, wall_height, this.orientation))
                this.game.resolve_collision(this, tank);

            const x = i % 2 ? unit_width : 0;
            const y = i >= 2 ? unit_height : 0;
            if (this.game.circle_collision(this.x, this.y, control_size, x, y, wall_width / 2)) {
                const r = this.game.calculate_point_angle(x, y, this.x, this.y);
                this.x = x + Math.sin(r) * (control_size + wall_width / 2);
                this.y = y + Math.cos(r) * (control_size + wall_width / 2);
            }
        }
        for (let i = 0; i < this.game.walls.length; i++) {
            const wall = this.game.walls[i];
            if (wall != this)
                while (this.game.rotated_rectangles_collision(this.x, this.y, wall_width, wall_height, this.orientation, wall.x, wall.y, wall_width, wall_height, wall.orientation))
                    this.game.resolve_collision(this, wall);
        }
        this.x = clamp(this.x, wall_width / 2 + border_width, (unit_width - border_width - wall_width / 2));
        this.y = clamp(this.y, wall_width / 2 + border_width, (unit_height - border_width - wall_width / 2));
    }
    render() {
        this.game.renderer.draw_rotated_image(this.game.wall_image, this.x, this.y, wall_width, -1, this.orientation);
        if (debug)
            this.game.renderer.draw_rect(this.x - wall_width / 2, this.y - wall_width / 10 * 3, wall_width, wall_height, '#b45100', this.orientation, 3);
    }
}
class bush {
    id = 0;
    x = 0;
    y = 0;
    orientation = 0;
    game = null;

    constructor(id, game) {
        this.id = id;
        this.game = game;
        this.orientation = Math.random() * 90;

        switch (this.id) {
            case 0:
                this.x = 450;
                this.y = 300;
                break;
            case 1:
                this.x = 800;
                this.y = 270;
                break;
            case 2:
                this.x = 520;
                this.y = 500;
                break;
            case 3:
                this.x = 550;
                this.y = 200;
                break;
        }
    }
    delete() {
        const index = this.game.bushes.indexOf(this);
        if (index !== -1) this.game.bushes.splice(index, 1);
    }
    render() {
        this.game.renderer.draw_rotated_image(this.game.bush_image, this.x, this.y, bush_size, bush_size, this.orientation);
        if (debug)
            this.game.renderer.draw_ellipse(this.x, this.y, bush_size / 2, bush_size / 2, 0, color_codes[3], 3);
    }
}

class game {
    renderer;
    menu = null;
    tutorial = null;
    win = null;
    wiggle_letters = new Array();

    //game timing
    ticks_per_second = 60;
    ms_per_tick = 1000 / this.ticks_per_second;
    accumulated_time = 0;
    time = 0;
    last_time = 0;

    //game objects
    controls = new Array(colors.length);
    tanks = new Array(colors.length);
    walls = new Array(colors.length * 16);
    bushes = new Array(4);
    bullets = new Array();

    //game images
    tank_images = new Array(colors.length);
    healthbar_images = new Array(3);
    tank_image_destroyed = new Image();
    bullet_images = new Array(colors.length);
    bush_image = new Image();
    shield_image = new Image();
    wall_image = new Image();
    control_images = new Array(colors.length);
    control_images_down = new Array(colors.length);
    countdown_images = new Array(4);

    //mouse detection
    pointers = new Map();

    //game variables
    tanks_destroyed = 0;
    countdown_end = -1;
    players = 4;
    state = game_state.Menu;
    state_changed = true;

    constructor() {
        this.setup_event_listeners();
        this.setup_game_images();
        this.setup_game_objects();
        this.setup_wiggle_effects();
        if (debug && alternative_start_state) {
            this.state = alternative_start_state;
            this.state_changed = true;
        }
    }
    tick(now) {
        this.accumulated_time += now - this.last_time;
        this.last_time = now;
        while (this.accumulated_time >= this.ms_per_tick) {
            this.update();
            this.accumulated_time -= this.ms_per_tick;
            this.time += 1 / this.ticks_per_second;
        }
        this.render();
        requestAnimationFrame(this.tick.bind(this));
    }
    setup_game_images() {
        for (let i = 0; i < colors.length; i++) {
            this.tank_images[i] = new Image;
            this.tank_images[i].src = `assets/game/tanks/tank.${colors[i]}.svg`;
            this.bullet_images[i] = new Image;
            this.bullet_images[i].src = `assets/game/bullets/bullet.${colors[i]}.svg`;
            this.control_images[i] = new Image;
            this.control_images[i].src = `assets/game/controls/control.${colors[i]}.svg`;
            this.control_images_down[i] = new Image;
            this.control_images_down[i].src = `assets/game/controls/control.${colors[i]}.down.svg`;
        }
        for (let i = 0; i < this.countdown_images.length; i++) {
            this.countdown_images[i] = new Image;
            this.countdown_images[i].src = `assets/game/countdown/countdown.${[i]}.svg`;
        }
        for (let i = 0; i < this.healthbar_images.length; i++) {
            this.healthbar_images[i] = new Image;
            this.healthbar_images[i].src = `assets/game/healthbars/health.${[i]}.svg`;
        }
        this.tank_image_destroyed.src = `assets/game/tanks/tank.destroyed.svg`;
        this.shield_image.src = `assets/game/shields/shield.svg`;
        this.bush_image.src = `assets/game/bushes/bush.svg`
        this.wall_image.src = `assets/game/walls/wall.svg`
    }
    setup_game_objects() {
        this.bushes.length = 4;
        this.bullets.length = 0;
        for (let i = 0; i < this.tanks.length; i++)
            this.tanks[i] = new tank(i, this);
        for (let i = 0; i < this.controls.length; i++)
            this.controls[i] = new control(i, this);
        for (let i = 0; i < this.walls.length; i++)
            this.walls[i] = new wall(i, this);
        for (let i = 0; i < this.bushes.length; i++)
            this.bushes[i] = new bush(i, this);
    }
    setup_event_listeners() {
        this.renderer = new renderer(document.getElementById("game"));
        this.menu = document.getElementById("menu");
        this.win = document.getElementById("win");
        this.tutorial = document.getElementById("tutorial");
        document.getElementById("play").addEventListener("click", e => {
            this.state = game_state.Tutorial;
            this.state_changed = true;
        });
        let player_button = document.getElementById("players");
        this.players = new URLSearchParams(window.location.search).get("players");
        if (!this.players)
            this.players = 4;
        player_button.textContent += this.players;

        document.addEventListener("click", e => {
            const selector = document.getElementById("player-selector");
            if (e.target == player_button)
                selector.classList.remove("hidden");
            else
                selector.classList.add("hidden");
        });
        document.getElementById("start").addEventListener("click", e => {
            this.state = game_state.Playing;
            this.state_changed = true;
        });
        document.getElementById("restart").addEventListener("click", e => {
            this.state = game_state.Playing;
            this.state_changed = true;
        });
        document.getElementById("home").addEventListener("click", e => {
            this.state = game_state.Menu;
            this.state_changed = true;
        });

        this.renderer.canvas.addEventListener("selectstart", e => e.preventDefault());
        this.renderer.canvas.addEventListener("gesturestart", e => e.preventDefault());
        this.renderer.canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
        this.renderer.canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
        this.renderer.canvas.addEventListener('contextmenu', e => e.preventDefault());

        document.addEventListener("keydown", e => {
            if (e.key === "d") {
                this.debug = !this.debug;
            }
        });
        window.addEventListener("pointerdown", e => {
            this.pointers.set(e.pointerId, this.getPos(e));
        });
        window.addEventListener("pointermove", e => {
            if (this.pointers.has(e.pointerId)) {
                this.pointers.set(e.pointerId, this.getPos(e));
            }
        });
        window.addEventListener("pointerup", e => {
            this.pointers.delete(e.pointerId);
        });
        window.addEventListener("pointercancel", e => {
            this.pointers.delete(e.pointerId);
        });
        this.getPos = function (e) {
            const rect = this.renderer.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left, y: e.clientY - rect.top, button: e.button, type: e.pointerType // "mouse", "touch", "pen"
            };
        };
    }
    setup_wiggle_effects() {
        this.wiggle_letters = document.querySelectorAll("h1 span[data-i]");
        for (const l of this.wiggle_letters) {
            l.style.color = color_codes[l.dataset.i];
        }
    }
    update_wiggle_effects() {
        for (const l of this.wiggle_letters) {
            const anim = Math.sin(this.time * 10 + l.dataset.i * Math.PI * 0.5);
            l.style.translate = `0 ${anim}vw`;
        }
    }
    mouse_down_box(x, y, w, h) {
        for (const [id, p] of this.pointers) {
            if (p.x >= x * this.renderer.scale && p.x <= (x + w) * this.renderer.scale && p.y >= y * this.renderer.scale && p.y <= (y + h) * this.renderer.scale) {
                return true;
            }
        }
        return false;
    }
    mouse_down_circle(x, y, r) {
        for (const [id, p] of this.pointers) {
            const distance = Math.sqrt((p.x - x * this.renderer.scale) ** 2 + (p.y - y * this.renderer.scale) ** 2);
            if (distance <= r * this.renderer.scale) {
                return true;
            }
        }
        return false;
    }
    circle_collision(x, y, r, x2, y2, r2) {
        if (Math.abs((x - x2) ** 2 + (y - y2) ** 2) < (r + r2) ** 2) {
            return true;
        }
        return false;
    }
    distance_points(fromX, fromY, toX, toY) {
        const a = fromX - toX;
        const b = fromY - toY;
        return Math.sqrt((a * a) + (b * b));
    };
    calculate_point_angle(x, y, x1, y1) {
        return Math.atan2(x1 - x, y1 - y);
    }
    rotated_rect_circle_collision(cx, cy, cr, rx, ry, rw, rh, rr) {
        // Rotate circle's center point back
        const unrotated_cx = Math.cos(-rr) * (cx - rx) - Math.sin(-rr) * (cy - ry) + rx;
        const unrotated_cy = Math.sin(-rr) * (cx - rx) + Math.cos(-rr) * (cy - ry) + ry;

        let closest_x, closest_y;

        let rxx = rx - rw / 2;  //top left corner of rect
        let ryy = ry - rh / 2;
        if (unrotated_cx < rxx)
            closest_x = rxx;
        else if (unrotated_cx > rxx + rw)
            closest_x = rxx + rw;
        else
            closest_x = unrotated_cx;

        if (unrotated_cy < ryy)
            closest_y = ryy;
        else if (unrotated_cy > ryy + rh)
            closest_y = ryy + rh;
        else
            closest_y = unrotated_cy;

        const dis = this.distance_points(unrotated_cx, unrotated_cy, closest_x, closest_y);
        if (dis < cr)
            return true;
        return false;
    }
    rotated_rectangles_collision(rx, ry, rw, rh, rr, rx2, ry2, rw2, rh2, rr2) {
        let r1HW = rw / 2;
        let r1HH = rh / 2;
        let r2HW = rw2 / 2;
        let r2HH = rh2 / 2;

        let cosR1A = Math.cos(rr);
        let sinR1A = Math.sin(rr);
        let cosR2A = Math.cos(rr2);
        let sinR2A = Math.sin(rr2);

        let r1RX = cosR2A * (rx - rx2) + sinR2A * (ry - ry2) + rx2 - r1HW;
        let r1RY = -sinR2A * (rx - rx2) + cosR2A * (ry - ry2) + ry2 - r1HH;
        let r2RX = cosR1A * (rx2 - rx) + sinR1A * (ry2 - ry) + rx - r2HW;
        let r2RY = -sinR1A * (rx2 - rx) + cosR1A * (ry2 - ry) + ry - r2HH;

        let cosR1AR2A = Math.abs(cosR1A * cosR2A + sinR1A * sinR2A);
        let sinR1AR2A = Math.abs(sinR1A * cosR2A - cosR1A * sinR2A);
        let cosR2AR1A = Math.abs(cosR2A * cosR1A + sinR2A * sinR1A);
        let sinR2AR1A = Math.abs(sinR2A * cosR1A - cosR2A * sinR1A);

        let r1BBH = rw * sinR1AR2A + rh * cosR1AR2A;
        let r1BBW = rw * cosR1AR2A + rh * sinR1AR2A;
        let r1BBX = r1RX + r1HW - r1BBW / 2;
        let r1BBY = r1RY + r1HH - r1BBH / 2;

        let r2BBH = rw2 * sinR2AR1A + rh2 * cosR2AR1A;
        let r2BBW = rw2 * cosR2AR1A + rh2 * sinR2AR1A;
        let r2BBX = r2RX + r2HW - r2BBW / 2;
        let r2BBY = r2RY + r2HH - r2BBH / 2;

        return rx - r1HW < r2BBX + r2BBW && rx + r1HW > r2BBX && ry - r1HH < r2BBY + r2BBH && ry + r1HH > r2BBY &&
            rx2 - r2HW < r1BBX + r1BBW && rx2 + r2HW > r1BBX && ry2 - r2HH < r1BBY + r1BBH && ry2 + r2HH > r1BBY;
    }
    resolve_collision(me, other) {
        const x_diff = Math.sign(me.x - other.x) / 2;
        const y_diff = Math.sign(me.y - other.y) / 2;
        other.x -= x_diff;
        other.y -= y_diff;
        me.x += x_diff;
        me.y += y_diff;
    }
    update() {
        if (this.state == game_state.Playing) {
            if (this.state_changed) {
                this.state_changed = false;
                this.tutorial.classList.add("hidden");
                this.menu.classList.add("hidden");
                this.win.classList.add("hidden");
                this.countdown_end = this.time + 4;
            }
            for (const c of this.controls)
                c.update();
            for (let i = 0; i < this.players; i++)
                if (this.countdown_end == -1)
                    this.tanks[player_count_configuration[this.players][i]].update();
            for (const b of this.bullets)
                b.update();
            for (const w of this.walls)
                w.update();
            if (this.tanks_destroyed >= this.players - 1) {
                this.state = game_state.Win;
                this.state_changed = true;
            }
        }
        else if (this.state == game_state.Tutorial) {
            if (this.state_changed) {
                this.state_changed = false;
                this.menu.classList.add("hidden");
                this.tutorial.classList.remove("hidden");
            }
        }
        else if (this.state == game_state.Menu) {
            if (this.state_changed == true) {
                this.tutorial.classList.add("hidden");
                this.menu.classList.remove("hidden");
                this.win.classList.add("hidden");
                this.state_changed = false;
            }
        }
        else if (this.state == game_state.Win) {
            if (this.state_changed == true) {
                this.state_changed = false;
                this.tutorial.classList.add("hidden");
                this.menu.classList.add("hidden");
                this.win.classList.remove("hidden");
                const win_color = player_count_configuration[this.players].find(id => this.tanks[id].health > 0);
                let color = document.querySelector("#win h1#color span");
                color.textContent = colors[win_color];
                color.style.color = color_codes[win_color];
                this.tanks_destroyed = 0;
                this.setup_game_objects();
            }
        }
        this.update_wiggle_effects();
    }
    render() {
        this.renderer.update();
        this.renderer.fill_rect(0, 0, unit_width, unit_height, 0, bg_color);

        this.renderer.context.globalAlpha = 1 / border_width;
        for (let i = 1; i <= border_width; i += .3) {
            this.renderer.fill_rect(0, 0, unit_width, i, 0, '#25003d');
            this.renderer.fill_rect(0, 0, i, unit_height, 0, '#25003d');
            this.renderer.fill_rect(0, unit_height, unit_width, -i, 0, '#25003d');
            this.renderer.fill_rect(unit_width, 0, -i, unit_height, 0, '#25003d');
            this.renderer.fill_ellipse(0, 0, control_size - i, control_size - i, 0, '#25003d');
            this.renderer.fill_ellipse(unit_width, 0, control_size - i, control_size - i, 0, '#25003d');
            this.renderer.fill_ellipse(0, unit_height, control_size - i, control_size - i, 0, '#25003d');
            this.renderer.fill_ellipse(unit_width, unit_height, control_size - i, control_size - i, 0, '#25003d');
        }
        this.renderer.context.globalAlpha = 1;

        for (const b of this.bushes)
            b.render();
        for (const w of this.walls)
            w.render();
        for (const b of this.bullets)
            b.render();
        for (let i = 0; i < this.players; i++)
            this.tanks[player_count_configuration[this.players][i]].render();
        for (const c of this.controls)
            c.render()

        for (let [id, p] of this.pointers) {
            this.renderer.fill_ellipse(p.x / this.renderer.scale, p.y / this.renderer.scale, 15, 15, 0, '#ffffff69');
            this.renderer.draw_ellipse(p.x / this.renderer.scale, p.y / this.renderer.scale, 18, 18, 0, '#79797994', 6);
        }
        if (this.countdown_end != -1) {
            const countdown_time = this.countdown_end - this.time;
            if (countdown_time < 0)
                this.countdown_end = -1;
            else {
                if (countdown_time < .4)
                    this.renderer.context.globalAlpha = countdown_time / .4;
                this.renderer.draw_image_centered(this.countdown_images[Math.floor(countdown_time)], unit_width / 2, unit_height / 2, -1, countdown_size - (countdown_time % 1) * 50);
            }
        }
    }
}

game = new game();
requestAnimationFrame(game.tick.bind(game));
