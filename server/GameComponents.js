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
            if (this.splinterSteps > 0) {
                this.gameInstance.addObject(new Asteroid(this.pos, Vector2D.createRandom(-2, 2, -2, 2),
                    Math.random() * .05 - .025, this.size * .8, this.splinterSteps - 1, this.gameInstance));
                this.gameInstance.addObject(new Asteroid(this.pos, Vector2D.createRandom(-2, 2, -2, 2),
                    Math.random() * .05 - .025, this.size * .8, this.splinterSteps - 1, this.gameInstance));
            }
        }
    }

    update() {
        super.update();
        this.angle = (this.angle + this.rotationalVelocity) % (Math.PI * 2);
    }
}

const createRandomAsteroid = function (gameInstance) {
    return new Asteroid(Vector2D.createRandom(0, Constants.width, 0, Constants.height), Vector2D.createRandom(-1, 1, -1, 1),
        Math.random() * .05 - .025, 75, 2, gameInstance);
}

class Bullet extends BaseComponent {

    constructor(pos, bulletVelocity, angle, parentShip, gameInstance) {
        super(pos, bulletVelocity, 30, 6, angle, gameInstance);
        this.deathTime = this.gameInstance.frameTimer + 40;
        this.parentShip = parentShip;
        this.color = parentShip.bulletColor;

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

class Powerup extends BaseComponent {
    constructor(pos, type, gameInstance) {
        super(pos, Vector2D.create(0, 0), 20, 20, 0, gameInstance);
        this.type = type;

        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, -this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height / 2)));
    }
}

class Ship extends BaseComponent {
    shotDelay = 20;
    jumpDelay = 100;
    lastShotTime = 0;
    lastJumpTime = 0;
    score = 0;
    keys = [];
    powerups = {};

    constructor(pos, velocity, width, height, angle, bulletColor, wingColor, bodyColor, username, gameInstance) {
        super(pos, velocity, width, height, angle, gameInstance);
        this.trueWidth = width;
        this.trueHeight = height;
        this.username = username;
        this.bulletColor = bulletColor;
        this.wingColor = wingColor;
        this.bodyColor = bodyColor;

        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, 0)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, 0), Vector2D.create(-this.width / 2, this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height / 2)));
    }

    hyperjump() {
        this.velocity = Vector2D.createRandom(-10000, 10000, -10000, 10000);
        this.lastJumpTime = this.gameInstance.frameTimer;

        if (!this.powerups["minify"]) {
            this.width = this.trueWidth;
            this.height = this.trueHeight;
        } else {
            this.width = this.trueWidth / 2;
            this.height = this.trueHeight / 2;
        }
    }

    shoot(bulletAngle, distance) {
        this.gameInstance.addObject(
            new Bullet(Vector2D.create(this.pos.x + Math.cos(bulletAngle) * (this.width / 2 + distance),
                this.pos.y + Math.sin(bulletAngle) * (this.height / 2 + distance)),
                Vector2D.create(20 * Math.cos(bulletAngle) + this.velocity.x,
                    20 * Math.sin(bulletAngle) + this.velocity.y),
                bulletAngle, this, this.gameInstance));
        this.lastShotTime = this.gameInstance.frameTimer;
    }

    setKeys(pressedKeys) {
        this.keys = [];
        for (let i = pressedKeys.length - 1; i > -1; i--) {
            this.keys[pressedKeys[i]] = true;
        }
    }

    destroy() {
        if (!this.powerups['invincibility']) {
            super.destroy();
        }
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
                this.angle -= .07;
            }
            if (this.keys["d"]) {
                this.angle += .07;
            }
        }

        if (this.keys[" "] && (this.gameInstance.frameTimer > this.lastShotTime + this.shotDelay
            || (this.powerups["turbo shot"] && this.gameInstance.frameTimer > this.lastShotTime + this.shotDelay / 2))) {
            if (this.powerups["triple shot"]) {
                this.shoot(this.angle - .5, 25);
                this.shoot(this.angle, 30);
                this.shoot(this.angle + .5, 25);
            } else {
                this.shoot(this.angle, 30);
            }
        }
        if (this.keys["h"]) {
            if (!this.hyperjumpTimer && this.gameInstance.frameTimer > this.lastJumpTime + this.jumpDelay) {
                this.hyperjumpTimer = 60;
            }
        }
        if (Constants.debug) {
            if (this.keys['0']) {
                this.powerups['invincibility'] = Constants.powerupTime;
            }
            if (this.keys['f']) {
                this.powerups['turbo shot'] = Constants.powerupTime;
            }
            if (this.keys['r']) {
                this.powerups['reflection'] = Constants.powerupTime;
            }
            if (this.keys['t']) {
                this.powerups['triple shot'] = Constants.powerupTime;
            }
            if (this.keys['m']) {
                this.powerups['minify'] = Constants.powerupTime;
            }
        }

        if (this.hyperjumpTimer) {
            this.width *= .96;
            this.height *= .96;
            if (!(--this.hyperjumpTimer)) {
                this.hyperjump();
            }
        } else if (this.lastJumpTime == this.gameInstance.frameTimer - 1) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        } else if (this.powerups["minify"]) {
            this.width = this.trueWidth / 2;
            this.height = this.trueHeight / 2;
        } else {
            this.width = this.trueWidth;
            this.height = this.trueHeight;
        }

        for (let i = Constants.powerups.length - 1; i > -1; i--) {
            if (this.powerups[Constants.powerups[i]]) {
                this.powerups[Constants.powerups[i]]--;
            }
        }

        this.velocity = this.velocity.constMult(.99);
    }
}

module.exports = { Asteroid, Ship, Bullet, Powerup, createRandomAsteroid };