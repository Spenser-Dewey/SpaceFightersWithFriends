var Http = new XMLHttpRequest();
var url = "http://192.168.1.128";
var keys_down = new Set();
Http.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        var msg = JSON.parse(Http.responseText);
        var numNew = msg.frameTimer - asteroidsGame.lastFrame;
        asteroidsGame.lastFrame = msg.frameTimer;
        console.log(numNew);
        for (var i = 0; i < msg.asteroids.length; i++) {
            var asteroid = msg.asteroids[i];
            asteroidsGame.gameElements.push(new Asteroid(asteroid.id, new Vector2D(asteroid.pos.x, asteroid.pos.y), new Vector2D(asteroid.velocity.x, asteroid.velocity.y), asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
        }
        // msg.asteroids.list.forEach(asteroid => {
        //     asteroidsGame.gameElements.push(new Asteroid(asteroid.id, asteroid.pos, asteroid.velocity, asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
        // });
        msg.bullets.forEach(function (bullet) {
            asteroidsGame.gameElements.push(new Bullet(bullet.id, new Vector2D(bullet.pos.x, bullet.pos.y), bullet.velocity, bullet.angle, bullet.width, bullet.height, bullet.color));
        });
        switch (msg.type) {
            case "join":
                console.log(msg);
                asteroidsGame.playerShipID = msg.id;
                asteroidsGame.canvas.width = msg.clientWidth;
                asteroidsGame.canvas.height = msg.clientHeight;
                asteroidsGame.width = msg.width;
                asteroidsGame.height = msg.height;
                asteroidsGame.ctx = asteroidsGame.canvas.getContext("2d");
                asteroidsGame.ctx.fillStyle = "rgb(0, 0, 0)";
                asteroidsGame.ctx.fillRect(0, 0, asteroidsGame.canvas.width, asteroidsGame.canvas.height);
                // msg.ships.forEach(ship => {
                //     if (ship.id === asteroidsGame.playerShipID) {
                //         asteroidsGame.gameElements.forEach(element => {
                //             element.move(new Vector2D(ship.pos.x, ship.pos.y).mult(-1));
                //         });
                //     }
                // });
                for (var i = 0; i < 100; i++) {
                    asteroidsGame.gameElements.push(new Star(new Vector2D(Math.random() * asteroidsGame.width, Math.random() * asteroidsGame.height), Math.floor(Math.random() * 5 + 1)));
                }
                setInterval(function () {
                    console.log(asteroidsGame.lastFrame);
                    asteroidsGame.sendData(JSON.stringify({
                        type: "update",
                        id: asteroidsGame.playerShipID,
                        lastFrame: asteroidsGame.lastFrame,
                        keys: Array.from(keys_down)
                    }));
                }, 33);
                break;
            case "update":
                msg.deaths.forEach(function (death) {
                    asteroidsGame.gameElements = asteroidsGame.gameElements.filter(function (e) {
                        return !e.id || death !== e.id;
                    });
                });
                for (var i = 0; i < numNew; i++) {
                    asteroidsGame.update();
                }
                // let ship = msg.ships.find(s => s.id === asteroidsGame.playerShipID);
                // if (ship) {
                //     asteroidsGame.gameElements.forEach(element => {
                //         element.move(new Vector2D(ship.pos.x, ship.pos.y).add(new Vector2D(ship.velocity.x, ship.velocity.y)).mult(-1));
                //         element.move(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2));
                //     });
                //     asteroidsGame.draw();
                //     asteroidsGame.gameElements.forEach(element => {
                //         element.move(new Vector2D(ship.pos.x, ship.pos.y).add(new Vector2D(ship.velocity.x, ship.velocity.y)));
                //         element.move(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2).mult(-1));
                //     });
                // }
                // else {
                asteroidsGame.draw();
                // }
                msg.ships.forEach(function (ship) {
                    asteroidsGame.drawShip(ship);
                });
                if (msg.collisions.length !== 0) {
                    console.log(msg);
                }
                break;
        }
    }
};
var AsteroidsGame = /** @class */ (function () {
    function AsteroidsGame() {
        var joinMsg = {
            type: "join",
            username: window.username,
            wingColor: window.wingColor,
            bodyColor: window.bodyColor,
            bulletColor: window.bulletColor
        };
        this.sendData(JSON.stringify(joinMsg));
        this.canvas = window.canvas;
        this.gameElements = [];
        function logKeyData(e, isPressed) {
            if (isPressed)
                keys_down.add(e.key);
            else
                keys_down.delete(e.key);
        }
        window.addEventListener("keydown", function (e) {
            logKeyData(e, true);
        });
        window.addEventListener("keyup", function (e) {
            logKeyData(e, false);
        });
    }
    AsteroidsGame.prototype.sendData = function (data) {
        Http.open("POST", url);
        Http.send(data);
    };
    AsteroidsGame.prototype.move = function (d) {
        var _this = this;
        this.gameElements.forEach(function (e) { return _this.move(d); });
    };
    AsteroidsGame.prototype.update = function () {
        var _this = this;
        this.gameElements.forEach(function (e) { return e.update(); });
        this.gameElements.forEach(function (e) { return e.pos.mod(_this.width, _this.height); });
    };
    AsteroidsGame.prototype.draw = function () {
        var _this = this;
        asteroidsGame.ctx.fillStyle = "#000";
        asteroidsGame.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        asteroidsGame.gameElements.forEach(function (e) { return e.draw(_this.ctx); });
    };
    AsteroidsGame.prototype.drawShip = function (ship) {
        asteroidsGame.ctx.save();
        // if (ship.id === asteroidsGame.playerShipID) {
        //     asteroidsGame.ctx.translate(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2);
        // }
        // else {
        asteroidsGame.ctx.translate(ship.pos.x, ship.pos.y);
        // }
        asteroidsGame.ctx.fillStyle = "#FFF";
        asteroidsGame.ctx.textAlign = "center";
        asteroidsGame.ctx.font = "20px Arial";
        asteroidsGame.ctx.fillText(ship.username, 0, -45);
        asteroidsGame.ctx.rotate(ship.angle);
        asteroidsGame.ctx.fillStyle = ship.bodyColor;
        asteroidsGame.ctx.beginPath();
        asteroidsGame.ctx.moveTo(-ship.width / 2, 0);
        asteroidsGame.ctx.bezierCurveTo(0, ship.height, -ship.width / 4, ship.height / 8, ship.width / 2, 0);
        asteroidsGame.ctx.bezierCurveTo(-ship.width / 4, -ship.height / 8, 0, -ship.height, -ship.width / 2, 0);
        asteroidsGame.ctx.fill();
        asteroidsGame.ctx.lineWidth = 2.0;
        asteroidsGame.ctx.strokeStyle = "#2222aa88";
        asteroidsGame.ctx.beginPath();
        asteroidsGame.ctx.moveTo(-ship.width / 2, 0);
        asteroidsGame.ctx.lineTo(3 * ship.width / 8, 0);
        asteroidsGame.ctx.stroke();
        asteroidsGame.ctx.strokeStyle = ship.wingColor;
        asteroidsGame.ctx.beginPath();
        asteroidsGame.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        asteroidsGame.ctx.quadraticCurveTo(0, 0, ship.width / 2, 0);
        asteroidsGame.ctx.quadraticCurveTo(0, 0, -3 * ship.width / 16, -7 * ship.height / 16);
        asteroidsGame.ctx.stroke();
        asteroidsGame.ctx.strokeStyle = "#99999988";
        asteroidsGame.ctx.beginPath();
        asteroidsGame.ctx.moveTo(-3 * ship.width / 16, -7 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 3, -7 * ship.height / 16);
        asteroidsGame.ctx.moveTo(-ship.width / 8, -5 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-7 * ship.width / 16, -5 * ship.height / 16);
        asteroidsGame.ctx.moveTo(-ship.width / 32, -3 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 2, -3 * ship.height / 16);
        asteroidsGame.ctx.moveTo(5 * ship.width / 32, -ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 2, -ship.height / 16);
        asteroidsGame.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 3, 7 * ship.height / 16);
        asteroidsGame.ctx.moveTo(-ship.width / 8, 5 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-7 * ship.width / 16, 5 * ship.height / 16);
        asteroidsGame.ctx.moveTo(-ship.width / 32, 3 * ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 2, 3 * ship.height / 16);
        asteroidsGame.ctx.moveTo(5 * ship.width / 32, ship.height / 16);
        asteroidsGame.ctx.lineTo(-ship.width / 2, ship.height / 16);
        asteroidsGame.ctx.stroke();
        asteroidsGame.ctx.restore();
        // if (ship.id === asteroidsGame.playerShipID) {
        //     asteroidsGame.gameElements.forEach(element => {
        //         element.move(new Vector2D(ship.pos.x, ship.pos.y));
        //     });
        // }
    };
    return AsteroidsGame;
}());
var Bullet = /** @class */ (function () {
    function Bullet(id, pos, vel, angle, width, height, color) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.angle = angle;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    Bullet.prototype.move = function (d) {
        this.pos.add(d);
    };
    Bullet.prototype.update = function () {
        this.pos.add(this.vel);
    };
    Bullet.prototype.draw = function (ctx) {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    };
    return Bullet;
}());
var Debris = /** @class */ (function () {
    function Debris(pos, angle, count, color) {
        for (var i = 0; i < count; i++) {
            var randMag = Math.random() * 6 + 1;
            var randAngle = Math.random() * (3 * Math.PI / 2) - 3 * Math.PI / 4 + angle;
            this.chunks.push(new Debris.Debri(pos, Vector2D.fromAngle(randAngle).mult(randMag), Math.random() * 8, this));
        }
        this.color = color;
    }
    Debris.prototype.move = function (d) {
        this.chunks.forEach(function (chunk) { return chunk.move(d); });
    };
    Debris.prototype.update = function () {
        this.chunks.forEach(function (chunk) { return chunk.update(); });
        this.chunks.filter(function (chunk) { return chunk.liveTicks < Debris.LIVE_TICKS; });
        if (!this.chunks.length) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    };
    Debris.prototype.draw = function (ctx) {
        this.chunks.forEach(function (chunk) { return chunk.draw(ctx); });
    };
    Debris.FRICTION_CONSTANT = 0.95;
    Debris.DECAY_CONSTANT = 0.2;
    Debris.LIVE_TICKS = 60;
    return Debris;
}());
(function (Debris) {
    var Debri = /** @class */ (function () {
        function Debri(pos, vel, radius, superThis) {
            this.pos = pos;
            this.vel = vel;
            this.radius = radius;
            this.superThis = superThis;
            this.liveTicks = 0;
        }
        Debri.prototype.move = function (d) {
            this.pos.add(d);
        };
        Debri.prototype.update = function () {
            this.pos.add(this.vel);
            this.vel.mult(Debris.FRICTION_CONSTANT);
            this.radius -= Debris.DECAY_CONSTANT;
            this.liveTicks++;
        };
        Debri.prototype.draw = function (ctx) {
            ctx.fillStyle = this.superThis.color;
            ;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
        };
        return Debri;
    }());
    Debris.Debri = Debri;
})(Debris || (Debris = {}));
var Star = /** @class */ (function () {
    function Star(pos, depth) {
        this.pos = pos;
        this.depth = depth;
    }
    Star.prototype.move = function (d) {
        this.pos.add(d.mult((10 - this.depth) / 10));
    };
    Star.prototype.update = function () {
    };
    Star.prototype.draw = function (ctx) {
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    };
    return Star;
}());
var Trail = /** @class */ (function () {
    function Trail(pos) {
        this.pos = pos;
        this.radius = 9;
    }
    Trail.prototype.move = function (d) {
        this.pos.add(d);
    };
    Trail.prototype.update = function () {
        this.radius *= .85;
        if (this.radius < 0.01) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    };
    Trail.prototype.draw = function (ctx) {
        ctx.fillStyle = "#5555ff77";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    };
    return Trail;
}());
var Asteroid = /** @class */ (function () {
    function Asteroid(id, pos, vel, lines, angle, angleVel) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.lines = lines;
        this.angle = angle;
        this.angleVel = angleVel;
    }
    Asteroid.prototype.move = function (d) {
        this.pos.add(d);
    };
    Asteroid.prototype.update = function () {
        this.pos.add(this.vel);
        this.angle = (this.angleVel + this.angle) % (Math.PI * 2);
    };
    Asteroid.prototype.draw = function (ctx) {
        ctx.fillStyle = "#334243";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.lines[0].x, this.lines[0].y);
        for (var i = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].x, this.lines[i].y);
        }
        ctx.fill();
        ctx.restore();
    };
    return Asteroid;
}());
var Vector2D = /** @class */ (function () {
    function Vector2D(x, y) {
        this.x = x;
        this.y = y;
    }
    Vector2D.prototype.add = function (other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    };
    Vector2D.prototype.mult = function (factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    };
    Vector2D.fromAngle = function (angle) {
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    };
    Vector2D.prototype.mod = function (xMax, yMax) {
        this.x = ((this.x % xMax) + xMax) % xMax;
        this.y = ((this.y % yMax) + yMax) % yMax;
        return this;
    };
    return Vector2D;
}());
//# sourceMappingURL=main.js.map