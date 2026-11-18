//------- CONSTANTS -------
// 1 unit = 1/1000 of the canvas width
// 1 tick = 1/60 of a second
const control_size = 160;                   //units
const tank_spawn_pos = { x: 300, y: 150 };  //x: units, y: unitsy
const tank_size = 40;                       //units
const tank_speed = 2;                       //units/tick
const tank_rotation_speed = 3;              //degrees/tick
const tank_cooldown = 30;                   //ticks
const bullet_speed = 5;                     //units/tick
const bullet_size = 10;                     //units
const bg_color = '#D5C69C';               //color

const unit_width = 1000;                          //units
const unit_height = unit_width * 9 / 16;          //units

const colors = ['yellow', 'blue', 'red', 'green'];
const color_codes = ['#F7E967', '#4A90E2', '#D0021B', '#7ED321'];

//-------- DEBUG --------
const debug = false;

//------- RENDERING -------
class renderer {
    canvas;
    context;
    html;
    scale;
    canvas_width;
    canvas_height;

    constructor() {
        this.canvas = document.body.appendChild(document.createElement('canvas'));
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
        this.context.drawImage(image, (x - width / 2) * this.scale, (y - height / 2) * this.scale, width * this.scale, height * this.scale);
    }
    draw_rotated_image(image, x, y, width, height, angle) {
        height = height == -1 ? width * image.height / image.width : height;
        this.context.save();
        this.context.translate(x * this.scale, y * this.scale);
        this.context.rotate(angle * Math.PI / 180);
        this.context.drawImage(image, -width / 2 * this.scale, -height / 2 * this.scale, width * this.scale, height * this.scale);
        this.context.restore();
    }
    fill_rect(x, y, width, height, color) {
        this.context.fillStyle = color;
        this.context.fillRect(x * this.scale, y * this.scale, width * this.scale, height * this.scale);
    }
    draw_rect(x, y, width, height, color, line_width) {
        this.context.strokeStyle = color;
        this.context.lineWidth = line_width * this.scale;
        this.context.strokeRect(x * this.scale, y * this.scale, width * this.scale, height * this.scale);
    }
    fill_ellipse(x, y, radius_x, radius_y, rotation, fill_color) {
        this.context.fillStyle = fill_color;
        this.context.beginPath();
        this.context.ellipse(x * this.scale, y * this.scale, radius_x * this.scale, radius_y * this.scale, rotation * Math.PI / 180, 0, 2 * Math.PI);
        this.context.fill();
    }
    draw_ellipse(x, y, radius_x, radius_y, rotation, stroke_color, line_width) {
        this.context.strokeStyle = stroke_color;
        this.context.lineWidth = line_width * this.scale;
        this.context.beginPath();
        this.context.ellipse(x * this.scale, y * this.scale, radius_x * this.scale, radius_y * this.scale, rotation * Math.PI / 180, 0, 2 * Math.PI);
        this.context.stroke();
    }
}
renderer = new renderer();

//------- GAME -------
class control {
    id = -1;
    x = 0;
    y = 0;
    orientation = 0;
    down = false;
    image = new Image();
    image_down = new Image();

    constructor(id) {
        this.id = id;
        this.image.src = `assets/game/controls/control.${colors[this.id]}.svg`;
        this.image_down.src = `assets/game/controls/control.${colors[this.id]}.down.svg`;

        this.x = this.id % 2 ? unit_width - control_size : 0;
        this.y = this.id >= 2 ? unit_height - control_size : 0;
    }
    update() {
        //check clicked
        this.down = mouse_down_box(this.x, this.y, control_size, control_size);
    }
    render() {
        renderer.draw_image(this.down ? this.image_down : this.image, this.x, this.y, control_size, control_size);
        if (debug)
            renderer.draw_rect(this.x, this.y, control_size, control_size, color_codes[this.id], 3);
    }
}
class tank {
    id = -1;
    destroyed = false;
    cooldown = 0;
    last_control_state = false;
    x = 0;
    y = 0;
    orientation = 0;
    rot_multiplier = 1;
    image = new Image();
    game = null;
    constructor(id, game) {
        this.id = id;
        this.image.src = `assets/game/tanks/tank.${colors[this.id]}.svg`;
        this.game = game;

        this.x = this.id % 2 ? unit_width - tank_spawn_pos.x : tank_spawn_pos.x;
        this.y = this.id >= 2 ? unit_height - tank_spawn_pos.y : tank_spawn_pos.y;
    }
    update() {
        //if tank active (not destroyed)
        if (!this.destroyed) {
            //if its control is down, move / shoot
            if (this.game.controls[this.id].down) {
                //if it's the first time shooting
                if (!this.last_control_state) {
                    this.rot_multiplier *= -1;
                    if (this.cooldown == 0) {
                        this.cooldown = tank_cooldown;
                        //shoot (instance a bullet)
                        this.game.bullets.push(new bullet(this.id, this.x, this.y, this.orientation, this.game));
                    }
                }
                //move it
                const radians = this.orientation * Math.PI / 180;
                this.x += tank_speed * Math.sin(radians);
                this.y -= tank_speed * Math.cos(radians);
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
        for (let i = 0; i < colors.length; i++) {
            const tank = this.game.tanks[i];
            if (tank != this) {
                while (circle_collision(this.x, this.y, tank_size / 2, tank.x, tank.y, tank_size / 2)) {
                    const x_diff = (this.x - tank.x) / 40;
                    const y_diff = (this.y - tank.y) / 40;
                    tank.x -= x_diff;
                    tank.y -= y_diff;
                    this.x += x_diff;
                    this.y += y_diff;
                }
            }
        }
    }
    render() {
        renderer.draw_rotated_image(this.image, this.x, this.y, tank_size, -1, this.orientation);
        if (debug)
            renderer.draw_ellipse(this.x, this.y, tank_size / 2, tank_size / 2, 0, color_codes[this.id], 3);
    }
}
class bullet {
    id = -1;
    x = 0;
    y = 0;
    orientation = 0;
    element = null;
    image = new Image();
    game = null;

    constructor(id, x, y, orientation, game) {
        this.id = id;
        this.game = game;
        //set properties
        this.x = x;
        this.y = y;
        this.orientation = orientation;
        this.image.src = `assets/game/bullets/bullet.${colors[this.id]}.svg`;
    }
    delete() {
        const index = this.game.bullets.indexOf(this);
        if (index !== -1) this.game.bullets.splice(index, 1);
    }
    update() {
        //move it
        this.x += bullet_speed * Math.sin(this.orientation * Math.PI / 180);
        this.y -= bullet_speed * Math.cos(this.orientation * Math.PI / 180);

        //check if outside border
        if (this.x > unit_width + 200 || this.y > unit_height + 200 || this.x < -200 || this.y < -200)
            this.delete();

        //check if hitting any tank
        for (let i = 0; i < colors.length; i++) {
            const tank = this.game.tanks[i];
            if (tank.id != this.id) {
                const radians = this.orientation * Math.PI / 180;
                if (circle_collision(this.x + bullet_size * Math.sin(radians), this.y - bullet_size * Math.cos(radians), bullet_size / 2, tank.x, tank.y, tank_size - 25)) {
                    this.delete();
                    if (!tank.destroyed) {
                        tank.destroyed = true;
                        tank.image.src = `assets/game/tanks/tank.destroyed.svg`;
                        this.game.tanks_destroyed++;
                    }
                }
            }
        }
    }
    render() {
        renderer.draw_rotated_image(this.image, this.x, this.y, bullet_size, -1, this.orientation);
        if (debug) {
            const radians = this.orientation * Math.PI / 180;
            renderer.draw_ellipse(this.x + bullet_size * Math.sin(radians), this.y - bullet_size * Math.cos(radians), bullet_size / 2, bullet_size / 2, 0, color_codes[this.id], 3);
        }
    }
}
// class wall {
//     id = 0;
//     x = 0;
//     y = 0;
//     orientation = 0;
//     image = new Image();

//     constructor(id) {
//         this.id = id;
//         this.orientation = 0;
//         this.image.src = `assets/game/walls/wall.svg`;


//     }
// }

class game {
    //game timing
    ticks_per_second = 60;
    ms_per_tick = 1000 / this.ticks_per_second;
    accumulated_time = 0;
    last_time = performance.now();

    //game objects
    controls = new Array(colors.length);
    tanks = new Array(colors.length);
    walls = new Array();
    bullets = new Array();

    //game images
    control_images = new Array(colors.length);
    control_images_down = new Array(colors.length);

    //mouse detection
    pointers = new Map();

    //game variables
    tanks_destroyed = 0;

    constructor() {
        this.setup_game_objects();
        this.setup_styles();
    }
    tick(now) {
        this.accumulated_time += now - this.last_time;
        this.last_time = now;
        while (this.accumulated_time >= this.ms_per_tick) {
            this.update();
            this.accumulated_time -= this.ms_per_tick;
        }
        this.render();
        requestAnimationFrame(this.tick.bind(this));
    }
    setup_game_objects() {
        this.bullets.length = 0;
        for (let i = 0; i < colors.length; i++) {
            this.controls[i] = new control(i);
            this.tanks[i] = new tank(i, this);
            // this.walls[i] = new wall(i);
        }
    }
    setup_styles() {
        document.body.style.cssText = "background-color: #000000; margin: 0; padding: 0; overflow: hidden;";
        renderer.canvas.style.cssText = "position: absolute; transform: translate(-50%, -50%); top: 50%; left: 50%; touch-action: none; user-select: none; -webkit-user-select: none; -ms-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;";

        renderer.canvas.addEventListener("selectstart", e => e.preventDefault());
        renderer.canvas.addEventListener("gesturestart", e => e.preventDefault());
        renderer.canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
        renderer.canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

        renderer.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
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
            const rect = renderer.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left, y: e.clientY - rect.top, button: e.button, type: e.pointerType // "mouse", "touch", "pen"
            };
        };
    }
    update() {
        for (let i = 0; i < colors.length; i++) {
            this.controls[i].update();
            this.tanks[i].update();
        }
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
        }
        if (this.tanks_destroyed >= colors.length - 1) {
            this.tanks_destroyed = 0;
            this.setup_game_objects();
        }
    }
    render() {
        renderer.update();
        renderer.fill_rect(0, 0, renderer.canvas_width / renderer.scale, renderer.canvas_height / renderer.scale, bg_color);

        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].render();
        }
        for (let i = 0; i < colors.length; i++) {
            this.tanks[i].render();
        }
        for (let i = 0; i < colors.length; i++) {
            this.controls[i].render();
        }
        for (let [id, p] of this.pointers) {
            renderer.fill_ellipse(p.x / renderer.scale, p.y / renderer.scale, 15, 15, 0, '#ffffff69');
            renderer.draw_ellipse(p.x / renderer.scale, p.y / renderer.scale, 18, 18, 0, '#79797994', 6);
        }
    }
}

function mouse_down_box(x, y, w, h) {
    for (const [id, p] of game.pointers) {
        if (p.x >= x * renderer.scale && p.x <= (x + w) * renderer.scale && p.y >= y * renderer.scale && p.y <= (y + h) * renderer.scale) {
            return true;
        }
    }
    return false;
}
function mouse_down_circle(x, y, r) {
    for (const [id, p] of pointers) {
        const distance = Math.sqrt((p.x - x * scale) ** 2 + (p.y - y * scale) ** 2);
        if (distance <= r * scale) {
            return true;
        }
    }
}

function circle_collision(x, y, r, x2, y2, r2) {
    if (Math.abs((x - x2) ** 2 + (y - y2) ** 2) < (r + r2) ** 2) {
        return true;
    }
    return false;
}

game = new game();
requestAnimationFrame(game.tick.bind(game));