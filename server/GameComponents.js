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

    missilify() {
        let minDist = Constants.width;
        let minShip = null;
        let newDist;
        for (let i = this.gameInstance.ships.length - 1; i > -1; i--) {
            newDist = this.pos.manDistanceTo(this.gameInstance.ships[i].pos);
            // if(this.gameInstance.ships[i] != this.parentShip && newDist < minDist) {
            if (newDist < minDist) {
                minShip = this.gameInstance.ships[i];
                minDist = newDist;
            }
        }

        if (minShip != null) {
            this.target = minShip;
            this.rotVel = .05;
        }
    }

    update() {
        if (this.target && this.target.live) { //If missilified
            this.angle = (this.angle + 2 * Math.PI) % (2 * Math.PI);
            let targetAngle = this.pos.angleTo((Vector2D.create(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y))
                .wrap(0, Constants.width, 0, Constants.height));
            let diff = this.angle - targetAngle;

            if (Math.abs(diff) > this.rotVel && Math.abs(2 * Math.PI - diff) > this.rotVel) {
                if (diff > Math.PI || (diff < 0 && diff > -Math.PI)) {
                    this.angle += this.rotVel;
                } else {
                    this.angle -= this.rotVel;
                }
                this.velocity = Vector2D.createVectorAtAngle(this.velocity.magnitude(), this.angle);
            }
        }

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
    shotCooldown = 20;
    jumpCooldown = 400;
    lastShotTime = 0;
    lastJumpTime = 0;
    hyperJumpDelay = 60;
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

        this.setLines();
    }

    setLines() {
        this.lines = [];
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, -this.height / 2), Vector2D.create(this.width / 2, 0)));
        this.lines.push(Line.create(Vector2D.create(this.width / 2, 0), Vector2D.create(-this.width / 2, this.height / 2)));
        this.lines.push(Line.create(Vector2D.create(-this.width / 2, this.height / 2), Vector2D.create(-this.width / 2, -this.height / 2)));
    }

    hyperjump() {
        this.hyperjumpTimer = 0;
        this.velocity = Vector2D.createRandom(-10000, 10000, -10000, 10000);
        this.lastJumpTime = this.gameInstance.frameTimer;
        if (this.powerups.invincibility) {
            this.powerups.invincibility = Math.max(this.powerups.invincibility, 100);
        } else {
            this.powerups.invincibility = 100;
        }

        this.setLines();
    }

    shoot(bulletAngle, distance) {
        let shot;

        if (this.powerups['asteroid shot']) {
            distance *= 5;
            shot = new Asteroid(Vector2D.create(this.pos.x + Math.cos(bulletAngle) * (this.width / 2 + distance),
                this.pos.y + Math.sin(bulletAngle) * (this.height / 2 + distance)),
                Vector2D.create(2 * Math.cos(bulletAngle) + this.velocity.x,
                    2 * Math.sin(bulletAngle) + this.velocity.y),
                Math.random() * .02 - .01, 80, 3, this.gameInstance);
        } else {
            shot = new Bullet(Vector2D.create(this.pos.x + Math.cos(bulletAngle) * (this.width / 2 + distance),
                this.pos.y + Math.sin(bulletAngle) * (this.height / 2 + distance)),
                Vector2D.create(20 * Math.cos(bulletAngle) + this.velocity.x,
                    20 * Math.sin(bulletAngle) + this.velocity.y),
                bulletAngle, this, this.gameInstance);

            if (this.powerups['drill']) {
                shot.drill = true;
                this.powerups['drill']--;
            }
        }

        if (this.powerups['missile']) {
            this.powerups['missile']--;
            shot.missilify();
            shot.velocity = shot.velocity.constMult(.5);
            shot.deathTime = (shot.deathTime ? 5000 + shot.deathTime : 8000);
        }

        this.gameInstance.addObject(shot);
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
        const accelFactor = .15 * (1 + 3 * !!this.powerups['dex boost']);
        if (this.keys["w"] || this.keys["arrowup"]) {
            this.velocity.x += accelFactor * Math.cos(this.angle);
            this.velocity.y += accelFactor * Math.sin(this.angle);
        }
        if (this.keys["s"] || this.keys["arrowdown"]) {
            this.velocity.x += -accelFactor * Math.cos(this.angle);
            this.velocity.y += -accelFactor * Math.sin(this.angle);
        }
        if (this.keys["a"] || this.keys["arrowleft"]) {
            this.angle -= .07;
        }
        if (this.keys["d"] || this.keys["arrowright"]) {
            this.angle += .07;
        }

        let powershotCooldown = (1 + 2 * !!this.powerups["asteroid shot"]) * this.shotCooldown / ((!!this.powerups["turbo shot"]) + 1);
        if (this.keys[" "] && (this.gameInstance.frameTimer > this.lastShotTime + powershotCooldown)) {
            if (this.powerups["triple shot"]) {
                this.shoot(this.angle - .5, 25);
                this.shoot(this.angle, 30);
                this.shoot(this.angle + .5, 25);
            } else {
                this.shoot(this.angle, 25);
            }
        }
        if (this.keys["h"]) {
            if (!this.hyperjumpTimer && (this.powerups['turbo jump'] || this.gameInstance.frameTimer > this.lastJumpTime + this.jumpCooldown)) {
                this.hyperjumpTimer = this.hyperJumpDelay / (1 + 5 * !!this.powerups["turbo jump"]);
            }
        }
        if (Constants.debug) {
            if (this.keys['0']) {
                this.powerups['invincibility'] = Constants.powerups["invincibility"];
            }
            if (this.keys['f']) {
                this.powerups['turbo shot'] = Constants.powerups['turbo shot'];
            }
            if (this.keys['r']) {
                this.powerups['reflection'] = Constants.powerups['reflection'];
            }
            if (this.keys['t']) {
                this.powerups['triple shot'] = Constants.powerups['triple shot'];
            }
            if (this.keys['m']) {
                this.powerups['minify'] = Constants.powerups['minify'];
            }
            if (this.keys['q']) {
                this.powerups['asteroid shot'] = Constants.powerups['asteroid shot'];
            }
            if (this.keys['j']) {
                this.powerups['turbo jump'] = Constants.powerups['turbo jump'];
            }
            if (this.keys['x']) {
                this.powerups['drill'] = Constants.powerups['drill'];
            }
            if (this.keys['l']) {
                this.powerups['dex boost'] = Constants.powerups['dex boost'];
            }
            if (this.keys["n"]) {
                this.powerups['missile'] = Constants.powerups['missile'];
            }
        }

        if (this.hyperjumpTimer) {
            let scaleFactor = this.hyperjumpTimer / (this.hyperJumpDelay / (1 + 5 * !!this.powerups["turbo jump"]));
            this.width = (this.trueWidth / (1 + !!this.powerups["minify"])) * scaleFactor;
            this.height = (this.trueHeight / (1 + !!this.powerups["minify"])) * scaleFactor;

            if (!(--this.hyperjumpTimer)) {
                this.hyperjump();
            }
            this.setLines();
        } else if (this.lastJumpTime == this.gameInstance.frameTimer - 1) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        } else if (this.width != (this.trueWidth / (1 + !!this.powerups["minify"]))) {
            this.width = (this.trueWidth / (1 + !!this.powerups["minify"]));
            this.height = (this.trueHeight / (1 + !!this.powerups["minify"]));
            this.setLines();
        }

        Object.keys(this.powerups).forEach(power => {
            if (this.powerups[power] > 0 && power !== "drill" && power !== "missile") {
                this.powerups[power]--;
            }
        });

        if (this.powerups['dex boost']) {
            this.velocity = this.velocity.constMult(.98);
        } else {
            this.velocity = this.velocity.constMult(.99);
        }
    }
}

module.exports = { Asteroid, Ship, Bullet, Powerup, createRandomAsteroid };