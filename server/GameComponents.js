const { Vector2D, Line, overlap } = require('./Utils');
const Constants = require('./Constants');

class BaseComponent {
    lines = [];
    live = true;

    constructor(pos, velocity, width, height, angle, gameInstance) {
        this.pos = pos;
        this.velocity = velocity;
        this.width = width;
        this.height = height;
        this.angle = angle;
        this.gameInstance = gameInstance;
        this.id = gameInstance.getNextID();
    }

    update() {
        this.pos.add(this.velocity);
        this.pos = this.pos.wrap(0, Constants.width, 0, Constants.height);
    }

    destroy() {
        this.live = false;
    }
}

class Asteroid extends BaseComponent {
    live = true;

    constructor(pos, velocity, rotvelocity, size, splinterSteps, gameInstance) {
        super(pos, velocity, size * 2, size * 2, 0, gameInstance);
        this.size = size;
        this.rotationalVelocity = rotvelocity;
        this.splinterSteps = splinterSteps;

        var dist = Math.random() * this.size / 2 + this.size / 2;
        var lastPoint = Vector2D.create(dist, 0);
        var nextPoint;
        for (var i = Math.random() / 4 + .5; i < 2 * Math.PI; i += Math.random() / 4 + .5) {
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
            if (this.splinterSteps > 0) {
                this.gameInstance.addObject(new Asteroid(this.pos, Vector2D.createRandom(-5, 5, -5, 5),
                    Math.random() * 4 * Math.PI - Math.PI * 2, this.size * .8, this.splinterSteps - 1, this.gameInstance));
                this.gameInstance.addObject(new Asteroid(this.pos, Vector2D.createRandom(-5, 5, -5, 5),
                    Math.random() * 4 * Math.PI - Math.PI * 2, this.size * .8, this.splinterSteps - 1, this.gameInstance));
            }
        }
    }

    update() {
        super.update();
        this.angle = (this.angle + this.rotationalVelocity) % (Math.PI * 2);
    }
}

const createRandomAsteroid = function (gameInstance) {
    return new Asteroid(Vector2D.createRandom(0, Constants.width, 0, Constants.height), Vector2D.createRandom(-.5, .5, -.5, .5),
        Math.random() * .05 - .025, 75, 3, gameInstance);
}

// class Star extends BaseComponent {

//     constructor(pos) {
//         super(pos, Vector2D.create(0, 0), 2, 2, 0);
//     }
// }

class Bullet extends BaseComponent {

    constructor(pos, bulletVelocity, angle, color, gameInstance) {
        super(pos, bulletVelocity, 16, 4, angle, gameInstance);
        this.deathTime = this.gameInstance.frameTimer + 200;
        this.color = color;

        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, -this.height)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, this.height)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, this.height)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height)));
    }

    update() {
        super.update();
        if (this.deathTime <= this.gameInstance.frameTimer) {
            this.live = false;
        }
    }
}

class Ship extends BaseComponent {
    bulletDelay = 20;
    lastShotTime = 0;
    keys = [];

    constructor(pos, velocity, width, height, angle, bulletColor, wingColor, bodyColor, gameInstance) {
        super(pos, velocity, width, height, angle, gameInstance);
        this.trueWidth = width;
        this.trueHeight = height;
        this.bulletColor = bulletColor;
        this.wingColor = wingColor;
        this.bodyColor = bodyColor;

        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, 0)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, 0), Vector2D.create(-this.width / 2, this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height / 2)));
    }

    hyperjump() {
        pos = Vector2D.createRandom(0, Constants.width, 0, Constants.height);
        for (var i = 0; i < this.gameInstance.asteroids.length; i++) {
            if (overlap(this.gameInstance.asteroids[i], this)) {
                this.hyperjump();
                break;
            }
        }
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.width = this.trueWidth;
        this.height = this.trueHeight;

    }

    shoot() {
        this.gameInstance.addObject(
            new Bullet(Vector2D.create(this.pos.x + Math.cos(this.angle) * this.width / 2, this.pos.y + Math.sin(this.angle) * this.height / 2),
                Vector2D.create(10 * Math.cos(this.angle) + this.velocity.x,
                    10 * Math.sin(this.angle) + this.velocity.y),
                this.angle, this.bulletColor, this.gameInstance));
        this.lastShotTime = this.gameInstance.frameTimer;
    }

    update() {
        super.update();

        if (this.keys["w"] || this.keys["s"] || this.keys["d"] || this.keys["a"]) {

            if (this.keys["w"]) {
                this.velocity.x += .1 * Math.cos(this.angle);
                this.velocity.y += .1 * Math.sin(this.angle);
            }
            if (this.keys["s"]) {
                this.velocity.x += -.1 * Math.cos(this.angle);
                this.velocity.y += -.1 * Math.sin(this.angle);
            }
            if (this.keys["a"]) {
                this.angle -= .1;
            }
            if (this.keys["d"]) {
                this.angle += .1;
            }
        }

        if (this.keys[" "] && this.gameInstance.frameTimer > this.lastShotTime + this.bulletDelay) {
            this.shoot();
        }
        if (this.keys["h"]) {
            if (!this.hyperjumpTimer) {
                this.hyperjumpTimer = 60;
            }
        }

        if (this.hyperjumpTimer) {
            this.width *= .96;
            this.height *= .96;
            if (!(--this.hyperjumpTimer)) {
                this.hyperjump();
            }
        }
        this.velocity = this.velocity.constMult(.99);
    }

}

module.exports = { Asteroid, Ship, Bullet, createRandomAsteroid };