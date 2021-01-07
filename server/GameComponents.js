import GameState from './SpaceFightersMain';
import Vector2D from './Utils.js';
import Line from './Utils.js';
import overlap from './Utils';

class BaseComponent {
    lines = [];
    live = true;

    constructor(pos, speed, width, height, angle) {
        this.pos = pos;
        this.speed = speed;
        this.width = width;
        this.height = height;
        this.angle = angle;
    }

    update() {
        this.pos.add(this.speed);
    }

    destroy() {
        this.live = false;
    }
}

class Asteroid extends BaseComponent {
    size = 0;
    splinterSteps = 0;
    rotationSpeed = 0;
    live = true;

    constructor(pos, speed, rotSpeed, size, splinterSteps) {
        super(pos, speed, size * 2, size * 2, 0);
        this.rotSpeed = rotSpeed;
        this.splinterSteps = splinterSteps;

        var dist = Math.random() * this.size / 2 + this.size / 2;
        var lastPoint = Vector2D.create(dist, 0);
        var nextPoint;
        for (var i = Math.random() / 4 + .25; i < 2 * Math.PI; i += Math.random() / 4 + .25) {
            // dist = Math.min(Math.max(dist + Math.random() * this.size / 2 - this.size / 4, this.size / 2), this.size);
            dist = Math.random() * this.size / 2 + this.size / 2;
            nextPoint = Vector2D.create(Math.cos(i) * dist, Math.sin(i) * dist);
            this.lines.push(Line.create(lastPoint, Vector2D.create(Math.cos(i) * dist, Math.sin(i) * dist)));
            lastPoint = nextPoint;
        }
        this.lines.push(Line.create(nextPoint, this.lines[0].p1));
    }

    destroy() {
        if (this.live) {
            this.live = false;
            if (splinterSteps > 0) {
                SpaceFightersMain.addObject(Asteroid.create(this.pos, Vector2D.createRandom(-5, 5, -5, 5),
                    Math.random() * 4 * Math.PI - Math.PI * 2, this.size * .8, splinterSteps - 1));
                SpaceFightersMain.addObject(Asteroid.create(this.pos, Vector2D.createRandom(-5, 5, -5, 5),
                    Math.random() * 4 * Math.PI - Math.PI * 2, this.size * .8, splinterSteps - 1));
            }
        }
    }

    update() {
        super.update();
        this.angle += this.rotationSpeed % (Math.PI * 2);
    }
}

const createRandomAsteroid = function () {
    return new Asteroid(Vector2D.createRandom(0, 500, 0, 500), Vector2D.createRandom(-5, 5, -5, 5),
        Math.random() * 4 * Math.PI - Math.PI * 2, 75, 3);
}

class Bullet extends BaseComponent {
    
    constructor (pos, bulletSpeed, angle, color) {
        super(pos, bulletSpeed, 16, 4, angle);
        this.deathTime = GameState.frameTimer + 200;
        this.color = color;
    
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, -this.height)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, this.height)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, this.height)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height)));
    }

    update() {
        super.update();
        if (this.deathTime <= GameState.frameTimer) {
            this.live = false;
        }
        if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, this))) {
            this.destroy();
            aster.destroy();
        } else if (ship = GameState.ships.find(plShip => overlap(this, plShip))) {
            this.destroy();
            ship.destroy();
        }
    }
}

