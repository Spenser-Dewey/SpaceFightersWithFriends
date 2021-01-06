//5: planets

const asteroidsGame = {
    starCount: 1000,
    enemyShipMin: 3,
    asteroidMin: 50,
    frameTimer: 0,
    points: 0,
    lives: 3,
    pause: false,
    stars: [],
    asteroids: [],
    enemyShips: [],
    debris: [],
    trails: [],
    bullets: [],
    keys: [],

    start() {
        this.canvas = document.getElementById("asteroidCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.width = 2000;
        this.canvas.width = 2000;
        this.height = 1050;
        this.canvas.height = 1050;

        for (var i = this.asteroidMin; i > 0; i--) {
            this.asteroids.push(new Asteroid(Math.random() * this.width * 3 - this.width, Math.random() * this.height * 3 - this.height, 75, 3));
        }
        spawnEnemyShips(this.enemyShipMin);
        for (var i = 0; i < this.starCount; i++) {
            this.stars.push(new Star(Math.random() * this.width * 3 - this.width, Math.random() * this.height * 3 - this.height, Math.floor(Math.random() * 5 + 1)));
        }
        this.player = createPlayerShip();
        this.interval = setInterval(this.update.bind(this), 20);
    },
    update() {
        if (!this.pause) {
            this.frameTimer += 1;
            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.updateElement(this.stars);
            this.updateElement(this.enemyShips);
            this.updateElement(this.asteroids);
            if (this.player.live) this.player.update(this.ctx);
            this.updateElement(this.bullets);
            this.updateElement(this.trails);
            this.updateElement(this.debris);

            this.checkCollisions();

            while (this.asteroidMin > this.asteroids.length) {
                var xCoord = Math.random() * 2 * this.width;
                var yCoord = Math.random() * 2 * this.height;
                if (xCoord <= this.width) { xCoord -= this.width }
                if (yCoord <= this.height) { yCoord -= this.height }
                this.asteroids.push(new Asteroid(xCoord, yCoord, 75, 3));
            }

            this.ctx.fillStyle = "#fff";
            if (this.lives == 0 && !this.player.live) {
                this.ctx.textBaseline = "middle";
                this.ctx.font = "200px Calibri";
                this.ctx.textAlign = "center";
                this.ctx.fillText("GAME OVER", this.width / 2, this.height / 2 - 100);
                this.ctx.fillText("Points: " + this.points, this.width / 2, this.height / 2 + 100);

            } else {
                this.ctx.textBaseline = "top";
                this.ctx.textAlign = "left";
                this.ctx.font = "40px Calibri";
                this.ctx.fillText("Points: " + this.points, 0, 0);
                this.ctx.fillText("Lives: " + this.lives, this.width - 150, 0);
            }

            if (this.enemyShips.length == 0 && this.player.live) {
                spawnEnemyShips(this.enemyShipMin);
                this.points++;
            }

        }
    },
    updateElement(elementType) {
        for (var i = elementType.length - 1; i > -1; i--) {
            if (!elementType[i].live) {
                elementType.splice(i, 1);
            } else {
                elementType[i].update(this.ctx);
            }
        }
    },
    checkCollisions() {
        for (var i = this.asteroids.length - 1; i > -1; i--) {
            for (var j = this.enemyShips.length - 1; j > -1; j--) {
                if (overlap(this.asteroids[i], this.enemyShips[j])) {
                    this.asteroids[i].destroy(this.enemyShips[j]);
                    this.enemyShips[j].destroy();
                }
            }
            if (this.player.live && overlap(this.asteroids[i], this.player)) {
                this.asteroids[i].destroy(this.player);
                this.player.destroy();
            }
        }
    }
}

function Ship(x, y, width, height, angle, speed) {
    this.pos = new Vector2D(x, y);
    this.bulletDelay = 20;
    this.lastShotTime = 0;
    this.width = width;
    this.height = height;
    this.angle = angle;
    this.speed = speed;
    this.live = true;
    this.lines = [];
    this.invincibleTimer = 200;

    this.wingColor = "#ff888888";
    this.bodyColor = "#bfccbf";

    this.lines.push(new Line(new Vector2D(-this.width / 2, -this.height / 2), new Vector2D(this.width / 2, 0)));
    this.lines.push(new Line(new Vector2D(this.width / 2, 0), new Vector2D(-this.width / 2, this.height / 2)));
    this.lines.push(new Line(new Vector2D(-this.width / 2, this.height / 2), new Vector2D(-this.width / 2, -this.height / 2)));

    this.act = function () {
        this.trails.push(new Trail(this.pos.x - this.width / 2 * Math.cos(this.angle),
            this.pos.y - this.height / 2 * Math.sin(this.angle)),
            this.speed.constMult(-1));

        this.pos.add(this.speed);
    }

    this.update = function (ctx) {

        if (this.invincibleTimer) this.invincibleTimer--;

        this.act();
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.bezierCurveTo(0, this.height, -this.width / 4, this.height / 8, this.width / 2, 0);
        ctx.bezierCurveTo(-this.width / 4, -this.height / 8, 0, -this.height, -this.width / 2, 0);
        ctx.fill();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = "#2222aa88";
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(3 * this.width / 8, 0);
        ctx.stroke();
        ctx.strokeStyle = this.wingColor;
        ctx.beginPath();
        ctx.moveTo(-3 * this.width / 16, 7 * this.height / 16);
        ctx.quadraticCurveTo(0, 0, this.width / 2, 0);
        ctx.quadraticCurveTo(0, 0, -3 * this.width / 16, -7 * this.height / 16);
        ctx.stroke();

        ctx.strokeStyle = "#99999988";
        ctx.beginPath();
        ctx.moveTo(-3 * this.width / 16, -7 * this.height / 16);
        ctx.lineTo(-this.width / 3, -7 * this.height / 16);
        ctx.moveTo(-this.width / 8, -5 * this.height / 16);
        ctx.lineTo(-7 * this.width / 16, -5 * this.height / 16);
        ctx.moveTo(-this.width / 32, -3 * this.height / 16);
        ctx.lineTo(-this.width / 2, -3 * this.height / 16);
        ctx.moveTo(5 * this.width / 32, -this.height / 16);
        ctx.lineTo(-this.width / 2, -this.height / 16);
        ctx.moveTo(-3 * this.width / 16, 7 * this.height / 16);
        ctx.lineTo(-this.width / 3, 7 * this.height / 16);
        ctx.moveTo(-this.width / 8, 5 * this.height / 16);
        ctx.lineTo(-7 * this.width / 16, 5 * this.height / 16);
        ctx.moveTo(-this.width / 32, 3 * this.height / 16);
        ctx.lineTo(-this.width / 2, 3 * this.height / 16);
        ctx.moveTo(5 * this.width / 32, this.height / 16);
        ctx.lineTo(-this.width / 2, this.height / 16);
        ctx.stroke();

        if (this.invincibleTimer) {
            ctx.beginPath();
            ctx.strokeStyle = "#22f8";
            ctx.arc(0, 0, Math.sqrt(this.width * this.width + this.height * this.height) / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    this.shoot = function (color) {
        asteroidsGame.bullets.push(new Bullet(this.pos.x + Math.cos(this.angle) * this.width / 2, this.pos.y + Math.sin(this.angle) * this.height / 2,
            new Vector2D(10 * Math.cos(this.angle) + this.speed.x,
                10 * Math.sin(this.angle) + this.speed.y),
            this.angle, color));
        this.lastShotTime = asteroidsGame.frameTimer;
    }

    this.destroy = function () {
        if (this.live && !this.invincibleTimer) {
            makeDebris(this.pos, this.angle, 35, "#b06000");
            this.live = false;
        }
    }
}

function createPlayerShip() {
    const player = new Ship(asteroidsGame.width / 2, asteroidsGame.height / 2, 50, 50, 0, new Vector2D(0, 0));
    player.trueHeight = player.width;
    player.trueWidth = player.height;

    window.addEventListener('keydown', function (e) {
        if (e.key == "w" || e.key == "a" || e.key == "d" || e.key == "s" || e.key == "h" || e.key == " ") {
            asteroidsGame.keys[e.key] = true;
        } else if (asteroidsGame.lives && !player.live && e.key == "r") {
            player.hyperjumpTimer = 0;
            asteroidsGame.lives--;
            player.invincibleTimer = 100;
            player.hyperjump();
            player.live = true;
            spawnEnemyShips(asteroidsGame.enemyShipMin);
        } else if (e.key == "j") {
            asteroidsGame.pause = !asteroidsGame.pause;
        } else if (e.key == "0") {
            asteroidsGame.player.invincibleTimer = 80;
        }
    });
    window.addEventListener('keyup', function (e) {
        if (e.key == "w" || e.key == "a" || e.key == "d" || e.key == "s" || e.key == "h" || e.key == " ") {
            asteroidsGame.keys[e.key] = false;
        }
    });

    player.hyperjump = function () {
        moveOthersBy(new Vector2D(Math.random() * asteroidsGame.width * 3, Math.random() * asteroidsGame.height * 3));
        for (var i = 0; i < asteroidsGame.asteroids.length; i++) {
            if (overlap(asteroidsGame.asteroids[i], this)) {
                this.hyperjump();
                break;
            }
        }
        this.speed = new Vector2D(0, 0);
        this.width = this.trueWidth;
        this.height = this.trueHeight;
        makeDebris(this.pos, this.angle, 15, "#99f");
    }

    player.act = function () {
        if (!player.live)
            return;

        if (asteroidsGame.keys) {
            if (asteroidsGame.keys["w"] || asteroidsGame.keys["s"] || asteroidsGame.keys["d"] || asteroidsGame.keys["a"]) {

                if (asteroidsGame.keys["w"]) {
                    player.speed.x += .1 * Math.cos(player.angle);
                    player.speed.y += .1 * Math.sin(player.angle);
                }
                if (asteroidsGame.keys["s"]) {
                    player.speed.x += -.1 * Math.cos(player.angle);
                    player.speed.y += -.1 * Math.sin(player.angle);
                }
                if (asteroidsGame.keys["a"]) {
                    player.angle -= .1;
                }
                if (asteroidsGame.keys["d"]) {
                    player.angle += .1;
                }
                asteroidsGame.trails.push(new Trail(player.pos.x - player.width / 2 * Math.cos(player.angle),
                    player.pos.y - player.height / 2 * Math.sin(player.angle),
                    player.speed.constMult(-1)));
            }
            if (asteroidsGame.keys[" "] && asteroidsGame.frameTimer > this.lastShotTime + this.bulletDelay) {
                this.shoot("#99ff99");
            }
            if (asteroidsGame.keys["h"]) {
                if (!this.hyperjumpTimer) {
                    this.hyperjumpTimer = 60;
                }
            }
        }


        if (player.hyperjumpTimer) {
            player.width *= .96;
            player.height *= .96;
            if (!(--player.hyperjumpTimer)) {
                player.hyperjump();
            }
        } else {
            player.width = player.trueWidth;
            player.height = player.trueHeight;
        }

        player.speed = player.speed.constMult(.99);
        moveOthersBy(player.speed.constMult(-1));
    }

    return player;
}

function spawnEnemyShips(quantity) {
    for (var i = quantity; i > 0; i--) {
        asteroidsGame.enemyShips.push(createEnemyShip(Math.random() * asteroidsGame.width * 2+ asteroidsGame.width, Math.random() * asteroidsGame.height * 3 - asteroidsGame.height));
    }
}

function createEnemyShip(x, y) {
    const enemy = new Ship(x, y, 60, 60, 0, new Vector2D(0, 0));
    enemy.bulletDelay = 35;
    enemy.invincibleTimer = 0;

    const bodyColor = enemy.bodyColor;
    enemy.bodyColor = enemy.wingColor;
    enemy.wingColor = bodyColor;

    enemy.act = function () {
        if (this.lastShotTime + this.bulletDelay <= asteroidsGame.frameTimer) {
            this.shoot("#ff9999");
        }

        if (asteroidsGame.player.live) {
            this.speed.x += .07 * Math.cos(this.angle);
            this.speed.y += .07 * Math.sin(this.angle);
        }
        this.speed = this.speed.constMult(.99);

        if (asteroidsGame.player.live) {
            this.angle = this.pos.angleTo(asteroidsGame.player.pos);
        }
        asteroidsGame.trails.push(new Trail(this.pos.x - this.width / 2 * Math.cos(this.angle),
            this.pos.y - this.height / 2 * Math.sin(this.angle),
            this.speed.constMult(-1)));
        this.pos.add(this.speed);
    }
    return enemy;
}

function moveOthersBy(vec) {
    moveElementTypeBy(asteroidsGame.stars, vec, true);
    moveElementTypeBy(asteroidsGame.asteroids, vec, true);
    moveElementTypeBy(asteroidsGame.enemyShips, vec, false);
    moveElementTypeBy(asteroidsGame.bullets, vec, false);
    moveElementTypeBy(asteroidsGame.trails, vec, false);
}

function moveElementTypeBy(elementArr, vec, wrap) {
    for (var i = elementArr.length - 1; i > -1; i--) {
        var ele = elementArr[i];
        if (ele.depth) {
            ele.pos.add(vec.constMult((10 - ele.depth) / 10));
        }
        else
        ele.pos.add(vec);
        if(wrap)
            ele.pos = ele.pos.wrap();
    }
}

function Star(x, y, depth) {
    this.pos = new Vector2D(x, y);
    this.depth = depth;
    this.live = true;

    this.update = function (ctx) {
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    }
}

function Bullet(x, y, bulletSpeed, angle, color) {
    this.pos = new Vector2D(x, y);
    this.bulletSpeed = bulletSpeed;
    this.deathTime = asteroidsGame.frameTimer + 200;
    this.angle = angle;
    this.width = 16;
    this.height = 4;
    this.color = color;
    this.live = true;

    this.lines = [];
    this.lines.push(new Line(new Vector2D(-this.width / 2, -this.height / 2), new Vector2D(this.width / 2, -this.height)));
    this.lines.push(new Line(new Vector2D(this.width / 2, -this.height / 2), new Vector2D(this.width / 2, this.height)));
    this.lines.push(new Line(new Vector2D(this.width / 2, this.height / 2), new Vector2D(-this.width / 2, this.height)));
    this.lines.push(new Line(new Vector2D(-this.width / 2, this.height / 2), new Vector2D(-this.width / 2, -this.height)));

    this.act = function () {
        this.pos.add(this.bulletSpeed);
        if (this.deathTime <= asteroidsGame.frameTimer) {
            this.live = false;
        } else {
            if (aster = asteroidsGame.asteroids.find(asteroid => overlap(asteroid, this))) {
                this.live = false;
                aster.destroy(this);
            } else if (ship = asteroidsGame.enemyShips.find(enShip => overlap(this, enShip))) {
                this.live = false;
                ship.destroy();
            } else if (asteroidsGame.player.live && overlap(this, asteroidsGame.player)) {
                asteroidsGame.player.destroy();
                this.live = false;
            }
        }
    };

    this.update = function (ctx) {
        this.act();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.restore();
    };
}

function Trail(x, y, speed) {
    this.speed = speed;
    this.pos = new Vector2D(x, y);
    this.radius = 9;
    this.live = true;

    this.update = function (ctx) {
        this.pos.add(this.speed);

        ctx.fillStyle = "#5555ff77";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        this.radius *= .85;

        if (this.radius < .01) {
            this.live = false;
        }
    };
}

function Debris(x, y, speed, color, radius) {
    this.pos = new Vector2D(x, y);
    this.speed = speed;
    this.color = color;
    this.radius = radius;
    this.deathTime = asteroidsGame.frameTimer + 40;
    this.live = true;

    this.update = function (ctx) {
        this.pos.add(this.speed);
        this.speed.constMult(.95);
        this.radius -= .2;
        if (this.radius < .2) this.radius = .2;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        if (this.deathTime <= asteroidsGame.frameTimer) {
            this.live = false;
        }
    }
}

function makeDebris(pos, angle, number, color) {
    var randMag;
    var randAngle;

    for (var i = number - 1; i > -1; i--) {
        randMag = Math.random() * 6 + 1;
        randAngle = Math.random() * (3 * Math.PI / 2) - 3 * Math.PI / 4 + angle;
        asteroidsGame.debris.push(new Debris(pos.x, pos.y,
            createVectorAtAngle(randMag, randMag, randAngle),
            color, Math.random() * 8));
    }
}

function Asteroid(x, y, size, splinterSteps) {
    this.pos = new Vector2D(x, y);
    this.size = size;
    this.width = this.size * 2;
    this.height = this.size * 2;
    this.splinterSteps = splinterSteps;
    this.lines = [];
    this.speed = new Vector2D(Math.random() * 5 - 2.5, Math.random() * 5 - 2.5);
    this.rotationSpeed = Math.random() / 8 - 1 / 16;
    this.angle = 0;
    this.live = true;

    var dist = Math.random() * this.size / 2 + this.size / 2;
    var lastPoint = new Vector2D(dist, 0);
    var nextPoint;
    for (var i = Math.random() / 4 + .25; i < 2 * Math.PI; i += Math.random() / 4 + .25) {
        // dist = Math.min(Math.max(dist + Math.random() * this.size / 2 - this.size / 4, this.size / 2), this.size);
        dist = Math.random() * this.size / 2 + this.size / 2;
        nextPoint = new Vector2D(Math.cos(i) * dist, Math.sin(i) * dist);
        this.lines.push(new Line(lastPoint, new Vector2D(Math.cos(i) * dist, Math.sin(i) * dist)));
        lastPoint = nextPoint;
    }
    this.lines.push(new Line(nextPoint, this.lines[0].p1));


    this.destroy = function (incomingBullet) {
        if (this.live) {
            this.live = false;
            makeDebris(incomingBullet.pos, incomingBullet.pos.angleTo(this.pos), this.size, "#334243");
            if (splinterSteps > 0) {
                asteroidsGame.asteroids.push(new Asteroid(this.pos.x, this.pos.y, this.size * .8, splinterSteps - 1));
                asteroidsGame.asteroids.push(new Asteroid(this.pos.x, this.pos.y, this.size * .8, splinterSteps - 1));
            }
        }
    }

    this.update = function (ctx) {
        this.angle += this.rotationSpeed % (Math.PI * 2);
        this.pos.add(this.speed);

        ctx.fillStyle = "#334243";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.lineJoin = "bevel";
        ctx.beginPath();
        ctx.moveTo(this.lines[0].p2.x, this.lines[0].p2.y);
        for (var i = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].p2.x, this.lines[i].p2.y);
        }
        ctx.fill();
        ctx.restore();
    };
}

function Vector2D(x, y) {
    this.x = x;
    this.y = y;

    this.add = function (otherVector) {
        this.x += otherVector.x;
        this.y += otherVector.y;
    }

    this.addAtAngle = function (value, angle) {
        this.x += value * Math.cos(angle);
        this.y += value * Math.sin(angle);
    }

    this.constMult = function (factor) {
        var scaleVec = new Vector2D(this.x * factor, this.y * factor);
        if (Math.abs(scaleVec.x) < .001) {
            scaleVec.x = 0;
        }
        if (Math.abs(scaleVec.y) < .001) {
            scaleVec.y = 0;
        }
        return scaleVec;
    }

    this.angleTo = function (otherPoint) {
        return Math.PI + Math.atan2(this.y - otherPoint.y, this.x - otherPoint.x);
    }

    this.rotateOnOrigin = function (angleDelta) {
        const magnitude = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        var myAngle = Math.atan2(this.y, this.x);

        myAngle += angleDelta;

        this.x = magnitude * Math.cos(myAngle);
        this.y = magnitude * Math.sin(myAngle);
    }

    this.wrap = function () {
        const minX = -asteroidsGame.width;
        const maxX = 2 * asteroidsGame.width;
        const minY = -asteroidsGame.height;
        const maxY = 2 * asteroidsGame.height;

        const wrappedVec = new Vector2D(this.x, this.y);
        if (this.x < minX) {
            wrappedVec.x = maxX - (minX - this.x);
        } else if (this.x > maxX) {
            wrappedVec.x = minX + (this.x - maxX);
        }

        if (this.y < minY) {
            wrappedVec.y = maxY - (minY - this.y);
        } else if (this.y > maxY) {
            wrappedVec.y = minY + (this.y - maxY);
        }
        return wrappedVec;
    }
}

function createVectorAtAngle(x, y, angle) {
    return new Vector2D(x * Math.cos(angle), y * Math.sin(angle));
}

function Line(startPoint, endPoint) {
    this.p1 = startPoint;
    this.p2 = endPoint;

    this.getShiftedLine = function (amount) {
        const shifted = new Line(new Vector2D(this.p1.x, this.p1.y), new Vector2D(this.p2.x, this.p2.y));
        shifted.p1.add(amount);
        shifted.p2.add(amount);
        return shifted;
    }

    this.getRotatedLine = function (angle) {
        const rotated = new Line(new Vector2D(this.p1.x, this.p1.y), new Vector2D(this.p2.x, this.p2.y));
        if (!angle) return rotated;

        rotated.p1.rotateOnOrigin(angle);
        rotated.p2.rotateOnOrigin(angle);
        return rotated;
    }

    this.overlaps = function (otherLine) {
        //Code adopted from GeeksForGeeks
        const o1 = this.orientation(this.p1, this.p2, otherLine.p1);
        const o2 = this.orientation(this.p1, this.p2, otherLine.p2);
        const o3 = this.orientation(otherLine.p1, otherLine.p2, this.p1);
        const o4 = this.orientation(otherLine.p1, otherLine.p2, this.p2);

        // General case
        if (o1 != o2 && o3 != o4)
            return true;

        // Special Cases 
        // p1, q1 and p2 are colinear and p2 lies on segment p1q1 
        if (o1 == 0 && this.onSegment(this.p1, otherLine.p1, this.p2)) return true;

        // p1, q1 and q2 are colinear and q2 lies on segment p1q1 
        if (o2 == 0 && this.onSegment(this.p1, otherLine.p2, this.p2)) return true;

        // p2, q2 and p1 are colinear and p1 lies on segment p2q2 
        if (o3 == 0 && this.onSegment(otherLine.p1, this.p1, otherLine.p2)) return true;

        // p2, q2 and q1 are colinear and q1 lies on segment p2q2 
        if (o4 == 0 && this.onSegment(otherLine.p1, this.p2, otherLine.p2)) return true;

        return false; // Doesn't fall in any of the above cases 
    }
    this.onSegment = function (start, q, end) {
        return (q.x <= Math.max(start.x, end.x) && q.x >= Math.min(start.x, end.x) &&
            q.y <= Math.max(start.y, end.y) && q.y >= Math.min(start.y, end.y));
    }

    this.orientation = function (p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val == 0) return 0; // colinear 

        return (val > 0) ? 1 : 2; // clock or counterclock wise  
    }
}

function overlap(firstShape, otherShape) {
    //Quickly check by radius
    if (Math.abs(firstShape.pos.x - otherShape.pos.x) < otherShape.width / 2 + firstShape.width / 2
        && Math.abs(firstShape.pos.y - otherShape.pos.y) < otherShape.height / 2 + firstShape.height / 2) {
        //Check specific patterning
        const shiftAmount = new Vector2D(firstShape.pos.x - otherShape.pos.x, firstShape.pos.y - otherShape.pos.y);
        var myShiftedLine;
        var otherShiftedLine;
        for (var i = firstShape.lines.length - 1; i > -1; i--) {
            myShiftedLine = firstShape.lines[i].getRotatedLine(firstShape.angle);
            myShiftedLine = myShiftedLine.getShiftedLine(shiftAmount);

            for (var j = otherShape.lines.length - 1; j > -1; j--) {
                otherShiftedLine = otherShape.lines[j].getRotatedLine(otherShape.angle);
                if (myShiftedLine.overlaps(otherShiftedLine)) {
                    return true;
                }
            }
        }
        return false;
    }
    return false;
}

function startGame() {
    asteroidsGame.start();
}

window.onload = startGame;