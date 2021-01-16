// EXPANSION IDEAS:
//  fix stars: S
//  mini map: J
//  powerups: S
//  powerup notification: S
//  scoring: S
//  leaderboard: S
//---------------------------------
//  sound: J
//  kill notification: J
//  update login page: J
//  respawn players smoothly: S
function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
var keys_down = new Set();
function startWebSocket() {
    window.ws = new WebSocket("wss://space-fighters-multiplayer.herokuapp.com/");
    ws.onmessage = function (message) {
        if (window.asteroidsGame) {
            var msg = JSON.parse(message.data);
            var numNew = msg.frameTimer - asteroidsGame.lastFrame;
            asteroidsGame.lastFrame = msg.frameTimer;
            for (var i = 0; i < msg.asteroids.length; i++) {
                var asteroid = msg.asteroids[i];
                asteroidsGame.gameElements.push(new Asteroid(asteroid.id, new Vector2D(asteroid.pos.x, asteroid.pos.y), new Vector2D(asteroid.velocity.x, asteroid.velocity.y), asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
            }
            msg.ships.forEach(function (ship) {
                asteroidsGame.gameElements.push(new Trail(new Vector2D(ship.pos.x, ship.pos.y).add(Vector2D.fromAngle(ship.angle).mult(-ship.height / 2))));
            });
            switch (msg.type) {
                case "join":
                    console.log(msg);
                    asteroidsGame.playerShipID = msg.id;
                    asteroidsGame.canvas.width = msg.clientWidth;
                    asteroidsGame.canvas.height = msg.clientHeight;
                    asteroidsGame.clientWidth = msg.clientWidth;
                    asteroidsGame.clientHeight = msg.clientHeight;
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
                    for (var i = 0; i < (asteroidsGame.width * asteroidsGame.height) / 10000; i++) {
                        asteroidsGame.stars.push(new Star(new Vector2D(Math.random() * asteroidsGame.width, Math.random() * asteroidsGame.height), Math.random() * 5 + 1));
                    }
                    for (var i = 0; i < msg.powerups.length; i++) {
                        var powerup = msg.powerups[i];
                        asteroidsGame.gameElements.push(new Powerup(powerup.id, new Vector2D(powerup.pos.x, powerup.pos.y), new Vector2D(powerup.velocity.x, powerup.velocity.y), powerup.lines, powerup.width, powerup.height, powerup.type));
                    }
                    msg.bullets.forEach(function (bullet) {
                        var bulletPos = new Vector2D(bullet.pos.x, bullet.pos.y);
                        if (bulletPos.onscreen())
                            asteroidsGame.fire.cloneNode().play();
                        asteroidsGame.gameElements.push(new Bullet(bullet.id, bulletPos, bullet.velocity, bullet.angle, bullet.width, bullet.height, bullet.color));
                    });
                    setInterval(function () {
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
                        if (death == asteroidsGame.playerShipID) {
                            asteroidsGame.deathScreen = true;
                        }
                    });
                    for (var i = 0; i < numNew; i++) {
                        asteroidsGame.update();
                    }
                    msg.collisions.forEach(function (collision) {
                        if (collision.ship && collision.powerup) {
                        }
                        else if (!collision.bullet) {
                            if (new Vector2D(collision.asteroid.pos.x, collision.asteroid.pos.y).onscreen()) {
                                asteroidsGame.bangLarge.cloneNode().play();
                            }
                            if (!collision.ship.powerups.invincibility) {
                                var killee = collision.ship.username;
                                asteroidsGame.killNotificationText = killee + " ran into an asteroid";
                                asteroidsGame.killNotificationTicksLeft = AsteroidsGame.KILL_NOTIFICATION_TICKS;
                                asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                            }
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.asteroid.pos.x, collision.asteroid.pos.y), collision.ship.angle, 30, "#334243"));
                        }
                        else if (!collision.asteroid) {
                            console.log(collision.ship);
                            if (!collision.ship.powerups.invincibility) {
                                var killer = collision.bullet.parentShip.username;
                                var killee = collision.ship.username;
                                if (collision.bullet.parentShip.id === collision.ship.id) {
                                    asteroidsGame.killNotificationText = killee + " died on their own bullet";
                                }
                                else {
                                    asteroidsGame.killNotificationText = killer + " destroyed " + killee;
                                }
                                asteroidsGame.killNotificationTicksLeft = AsteroidsGame.KILL_NOTIFICATION_TICKS;
                            }
                            if (new Vector2D(collision.bullet.pos.x, collision.bullet.pos.y).onscreen()) {
                                asteroidsGame.bangLarge.cloneNode().play();
                            }
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                        }
                        else if (!collision.ship) {
                            if (new Vector2D(collision.asteroid.pos.x, collision.asteroid.pos.y).onscreen()) {
                                if (collision.asteroid.splinterSteps === 2) {
                                    asteroidsGame.bangLarge.cloneNode().play();
                                }
                                else if (collision.asteroid.splinterSteps === 1) {
                                    asteroidsGame.bangMedium.cloneNode().play();
                                }
                                else if (collision.asteroid.splinterSteps === 0) {
                                    asteroidsGame.bangSmall.cloneNode().play();
                                }
                            }
                            asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.bullet.pos.x, collision.bullet.pos.y), collision.bullet.angle, 30, "#334243"));
                        }
                        else {
                            console.log("COLLISION ERROR:\n" + collision);
                        }
                    });
                    var ship_1 = msg.ships.find(function (s) { return s.id === asteroidsGame.playerShipID; });
                    if (ship_1) {
                        asteroidsGame.playerShipPos = new Vector2D(ship_1.pos.x, ship_1.pos.y);
                        asteroidsGame.playerShipScore = ship_1.score;
                        asteroidsGame.deathScreen = false;
                    }
                    for (var i = 0; i < msg.powerups.length; i++) {
                        var powerup = msg.powerups[i];
                        asteroidsGame.gameElements.push(new Powerup(powerup.id, new Vector2D(powerup.pos.x, powerup.pos.y), new Vector2D(powerup.velocity.x, powerup.velocity.y), powerup.lines, powerup.width, powerup.height, powerup.type));
                    }
                    msg.bullets.forEach(function (bullet) {
                        var bulletPos = new Vector2D(bullet.pos.x, bullet.pos.y);
                        if (bulletPos.onscreen())
                            asteroidsGame.fire.cloneNode().play();
                        asteroidsGame.gameElements.push(new Bullet(bullet.id, bulletPos, bullet.velocity, bullet.angle, bullet.width, bullet.height, bullet.color));
                    });
                    asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).mult(-1).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2)));
                    if (ship_1 && ship_1.velocity) {
                        asteroidsGame.stars.forEach(function (e) { return e.move(new Vector2D(-ship_1.velocity.x, -ship_1.velocity.y)); });
                    }
                    asteroidsGame.gameElements.forEach(function (e) {
                        if (e.pos) {
                            e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                        }
                        else {
                            e.modAll();
                        }
                    });
                    asteroidsGame.stars.forEach(function (e) {
                        e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                    });
                    asteroidsGame.draw();
                    if (msg.dbugShapes) {
                        for (var i = msg.dbugShapes.length - 1; i > -1; i--) {
                            asteroidsGame.drawShape(msg.dbugShapes[i]);
                        }
                    }
                    asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2).mult(-1)));
                    msg.ships.forEach(function (ship) {
                        asteroidsGame.drawShip(ship);
                    });
                    asteroidsGame.ctx.fillStyle = "#222";
                    asteroidsGame.ctx.fillRect(asteroidsGame.clientWidth - 200, 0, 200, 200);
                    asteroidsGame.ctx.fillStyle = "#f00";
                    msg.ships.forEach(function (ship) {
                        var xPos = map(ship.pos.x, 0, asteroidsGame.width, asteroidsGame.clientWidth - 205, asteroidsGame.clientWidth - 5);
                        var yPos = map(ship.pos.y, 0, asteroidsGame.height, -5, 195);
                        if (ship.id === asteroidsGame.playerShipID) {
                            asteroidsGame.ctx.fillStyle = "#55f";
                            asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                            asteroidsGame.ctx.fillStyle = "#f00";
                        }
                        else {
                            asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                        }
                    });
                    msg.ships.sort(function (a, b) { return b.score - a.score; });
                    asteroidsGame.ctx.fillStyle = "#FFF";
                    asteroidsGame.ctx.textBaseline = "top";
                    asteroidsGame.ctx.font = "14px Arial";
                    for (var i = 1; i <= Math.min(10, msg.ships.length); i++) {
                        asteroidsGame.ctx.fillStyle = "#FFF";
                        asteroidsGame.ctx.textAlign = "left";
                        asteroidsGame.ctx.fillText(msg.ships[i - 1].username, 0, 20 * i);
                        asteroidsGame.ctx.textAlign = "right";
                        asteroidsGame.ctx.fillText(msg.ships[i - 1].score, 300, 20 * i);
                        if (i % 2 == 0) {
                            asteroidsGame.ctx.fillStyle = "#aaa4";
                        }
                        else {
                            asteroidsGame.ctx.fillStyle = "#3334";
                        }
                        asteroidsGame.ctx.fillRect(0, 20 * i, 300, 20);
                    }
                    break;
            }
        }
    };
    ws.onclose = function () {
        console.log("CONNECTION TERMINATED");
    };
}
var AsteroidsGame = /** @class */ (function () {
    function AsteroidsGame() {
        this.killNotificationText = "";
        this.bangLarge = document.getElementById("bangLarge");
        this.bangMedium = document.getElementById("bangMedium");
        this.bangSmall = document.getElementById("bangSmall");
        this.fire = document.getElementById("fire");
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
        this.stars = [];
        function logKeyData(e, isPressed) {
            if (isPressed)
                keys_down.add(e.key.toLowerCase());
            else
                keys_down.delete(e.key.toLowerCase());
        }
        window.addEventListener("keydown", function (e) {
            logKeyData(e, true);
        });
        window.addEventListener("keyup", function (e) {
            logKeyData(e, false);
        });
        window.addEventListener("click", function (e) {
            if (asteroidsGame.deathScreen) {
                var rect = asteroidsGame.canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                x = map(x, 0, asteroidsGame.canvas.clientWidth, 0, asteroidsGame.width);
                y = map(y, 0, asteroidsGame.canvas.clientHeight, 0, asteroidsGame.height);
                if (x > asteroidsGame.width / 2 - 200 && x < asteroidsGame.width / 2 + 200) {
                    if (y > asteroidsGame.height / 4 && y < asteroidsGame.height / 2) {
                        ws.send(JSON.stringify({ id: asteroidsGame.playerShipID, type: "update", keys: ["r"] }));
                    }
                    else if (y > asteroidsGame.height / 2 + 25 && y < 3 * asteroidsGame.height / 4 + 25) {
                        location.reload();
                    }
                }
            }
        });
    }
    AsteroidsGame.prototype.sendData = function (data) {
        ws.send(data);
    };
    AsteroidsGame.prototype.move = function (d) {
        this.gameElements.forEach(function (e) { return e.move(d); });
    };
    AsteroidsGame.prototype.update = function () {
        this.killNotificationTicksLeft = Math.max(this.killNotificationTicksLeft - 1, 0);
        if (this.killNotificationTicksLeft === 0) {
            this.killNotificationText = "";
        }
        this.gameElements.forEach(function (e) { return e.update(); });
    };
    AsteroidsGame.prototype.draw = function () {
        var _this = this;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.stars.forEach(function (star) { return star.draw(_this.ctx); });
        this.gameElements.filter(function (e) { return e instanceof Bullet; }).forEach(function (e) { return e.draw(_this.ctx); });
        this.gameElements.filter(function (e) { return e instanceof Asteroid; }).forEach(function (e) { return e.draw(_this.ctx); });
        this.gameElements.filter(function (e) { return e instanceof Debris; }).forEach(function (e) { return e.draw(_this.ctx); });
        this.gameElements.filter(function (e) { return e instanceof Trail; }).forEach(function (e) { return e.draw(_this.ctx); });
        this.gameElements.filter(function (e) { return e instanceof Powerup; }).forEach(function (e) { return e.draw(_this.ctx); });
        this.ctx.fillStyle = "#FFF";
        this.ctx.textAlign = "center";
        this.ctx.font = "30px Arial";
        this.ctx.fillText(this.killNotificationText, this.clientWidth / 2, this.clientHeight * 5 / 6);
        if (this.deathScreen) {
            this.drawDeathScreen();
        }
    };
    AsteroidsGame.prototype.drawDeathScreen = function () {
        this.ctx.fillStyle = "#aaa7";
        this.ctx.fillRect(this.canvas.width / 2 - 200, this.canvas.height / 4, 400, this.canvas.height / 4);
        this.ctx.fillRect(this.canvas.width / 2 - 200, this.canvas.height / 2 + 25, 400, this.canvas.height / 4);
        this.ctx.fillStyle = "#FDD";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = "32px Arial";
        this.ctx.fillText("You died! Your score was " + this.playerShipScore + ".", this.canvas.width / 2, this.canvas.height / 4 - 50);
        this.ctx.font = "24px Arial";
        this.ctx.fillText("Restart with same Ship", this.canvas.width / 2, 3 * this.canvas.height / 8);
        this.ctx.fillText("Create new Ship", this.canvas.width / 2, 5 * this.canvas.height / 8 + 25);
    };
    AsteroidsGame.prototype.drawShape = function (shape) {
        shape.pos = new Vector2D(shape.pos.x - this.playerShipPos.x + this.canvas.width / 2, shape.pos.y - this.playerShipPos.y + this.canvas.height / 2);
        shape.pos.mod(this.width, this.height);
        this.ctx.strokeStyle = "#fff";
        this.ctx.save();
        this.ctx.translate(shape.pos.x, shape.pos.y);
        this.ctx.rotate(shape.angle);
        this.ctx.beginPath();
        this.ctx.moveTo(shape.lines[0].x, shape.lines[0].y);
        for (var i = shape.lines.length - 1; i > -1; i--) {
            this.ctx.lineTo(shape.lines[i].x, shape.lines[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    };
    AsteroidsGame.prototype.drawShip = function (ship) {
        this.ctx.save();
        if (ship.id === this.playerShipID) {
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        }
        else {
            var p = new Vector2D(ship.pos.x, ship.pos.y).add((this.playerShipPos.copy()).mult(-1));
            p.add(new Vector2D(this.canvas.width / 2, this.canvas.height / 2));
            p.mod(this.width, this.height);
            this.ctx.translate(p.x, p.y);
        }
        this.ctx.fillStyle = "#FFF";
        this.ctx.textAlign = "center";
        this.ctx.font = "20px Arial";
        this.ctx.fillText(ship.username, 0, -55);
        this.ctx.rotate(ship.angle);
        this.ctx.fillStyle = ship.bodyColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-ship.width / 2, 0);
        this.ctx.bezierCurveTo(0, ship.height, -ship.width / 4, ship.height / 8, ship.width / 2, 0);
        this.ctx.bezierCurveTo(-ship.width / 4, -ship.height / 8, 0, -ship.height, -ship.width / 2, 0);
        this.ctx.fill();
        if (ship.powerups.invincibility) {
            this.ctx.strokeStyle = "#22f8";
            this.ctx.lineWidth = 10;
            this.ctx.lineJoin = "round";
            this.ctx.beginPath();
            this.ctx.moveTo(-ship.width / 2, 0);
            this.ctx.bezierCurveTo(0, ship.height, -ship.width / 4, ship.height / 8, ship.width / 2, 0);
            this.ctx.bezierCurveTo(-ship.width / 4, -ship.height / 8, 0, -ship.height, -ship.width / 2, 0);
            this.ctx.stroke();
        }
        this.ctx.lineWidth = 2.0;
        this.ctx.strokeStyle = "#2222aa88";
        this.ctx.beginPath();
        this.ctx.moveTo(-ship.width / 2, 0);
        this.ctx.lineTo(3 * ship.width / 8, 0);
        this.ctx.stroke();
        this.ctx.strokeStyle = ship.wingColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        this.ctx.quadraticCurveTo(0, 0, ship.width / 2, 0);
        this.ctx.quadraticCurveTo(0, 0, -3 * ship.width / 16, -7 * ship.height / 16);
        this.ctx.stroke();
        this.ctx.strokeStyle = "#99999988";
        this.ctx.beginPath();
        this.ctx.moveTo(-3 * ship.width / 16, -7 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 3, -7 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 8, -5 * ship.height / 16);
        this.ctx.lineTo(-7 * ship.width / 16, -5 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 32, -3 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, -3 * ship.height / 16);
        this.ctx.moveTo(5 * ship.width / 32, -ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, -ship.height / 16);
        this.ctx.moveTo(-3 * ship.width / 16, 7 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 3, 7 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 8, 5 * ship.height / 16);
        this.ctx.lineTo(-7 * ship.width / 16, 5 * ship.height / 16);
        this.ctx.moveTo(-ship.width / 32, 3 * ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, 3 * ship.height / 16);
        this.ctx.moveTo(5 * ship.width / 32, ship.height / 16);
        this.ctx.lineTo(-ship.width / 2, ship.height / 16);
        this.ctx.stroke();
        if (ship.powerups.reflection) {
            this.ctx.strokeStyle = "#22f8";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.sqrt((ship.width * ship.width) / 4 + (ship.height * ship.height) / 4), 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.restore();
        // if (ship.id === this.playerShipID) {
        //     this.gameElements.forEach(element => {
        //         element.move(new Vector2D(ship.pos.x, ship.pos.y));
        //     });
        // }
    };
    AsteroidsGame.KILL_NOTIFICATION_TICKS = 250;
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
        this.chunks = [];
        for (var i = 0; i < count; i++) {
            var randMag = Math.random() * 6 + 1;
            var randAngle = Math.random() * (3 * Math.PI / 2) - 3 * Math.PI / 4 + angle;
            this.chunks.push(new Debris.Debri(new Vector2D(pos.x, pos.y), Vector2D.fromAngle(randAngle).mult(randMag), Math.random() * 8, this));
        }
        this.color = color;
    }
    Debris.prototype.modAll = function () {
        this.chunks.forEach(function (chunk) { return chunk.pos.mod(asteroidsGame.width, asteroidsGame.height); });
    };
    Debris.prototype.move = function (d) {
        this.chunks.forEach(function (chunk) { return chunk.move(d); });
    };
    Debris.prototype.update = function () {
        this.chunks.forEach(function (chunk) { return chunk.update(); });
        this.chunks = this.chunks.filter(function (chunk) { return chunk.radius > 0; });
        if (!this.chunks.length) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    };
    Debris.prototype.draw = function (ctx) {
        this.chunks.forEach(function (chunk) { return chunk.draw(ctx); });
    };
    Debris.FRICTION_CONSTANT = 0.95;
    Debris.DECAY_CONSTANT = 0.2;
    return Debris;
}());
(function (Debris) {
    var Debri = /** @class */ (function () {
        function Debri(pos, vel, radius, superThis) {
            this.pos = pos;
            this.vel = vel;
            this.radius = radius;
            this.superThis = superThis;
        }
        Debri.prototype.move = function (d) {
            this.pos.add(d);
        };
        Debri.prototype.update = function () {
            this.pos.add(this.vel);
            this.vel.mult(Debris.FRICTION_CONSTANT);
            this.radius -= Debris.DECAY_CONSTANT;
        };
        Debri.prototype.draw = function (ctx) {
            ctx.fillStyle = this.superThis.color;
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
        this.pos.add(d.copy().mult(1 - (this.depth / 10)));
        // this.pos.add(d);
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
var Powerup = /** @class */ (function () {
    function Powerup(id, pos, vel, lines, width, height, type) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.lines = lines;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.angleVel = 0.05;
        this.type = type;
    }
    Powerup.prototype.move = function (d) {
        this.pos.add(d);
    };
    Powerup.prototype.update = function () {
        this.pos.add(this.vel);
        this.angle = (this.angleVel + this.angle) % (Math.PI * 2);
    };
    Powerup.prototype.draw = function (ctx) {
        ctx.fillStyle = "#b0b5b0";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.lines[0].x, this.lines[0].y);
        for (var i = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].x, this.lines[i].y);
        }
        ctx.fill();
        switch (this.type) {
            case "invincibility":
                ctx.strokeStyle = "#22f8";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2 - 1, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case "triple shot":
                ctx.strokeStyle = "#8f2839";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -this.height / 5);
                ctx.lineTo(this.width / 5, -this.height / 2);
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(2 * this.width / 5, 0);
                ctx.moveTo(-this.width / 2, this.height / 5);
                ctx.lineTo(this.width / 5, this.height / 2);
                ctx.stroke();
                break;
            case "turbo shot":
                ctx.strokeStyle = "#6a9e6d";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(-3 * this.width / 10, 0);
                ctx.moveTo(-this.width / 10, 0);
                ctx.lineTo(this.width / 10, 0);
                ctx.moveTo(3 * this.width / 10, 0);
                ctx.lineTo(this.width / 2, 0);
                ctx.stroke();
                break;
            case "reflection":
                ctx.strokeStyle = "#22f8";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(this.width / 2, 0);
                ctx.stroke();
                ctx.strokeStyle = "#6a9e6d";
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, this.height / 2);
                ctx.lineTo(0, 0);
                ctx.lineTo(this.width / 2, this.height / 2);
                ctx.stroke();
                break;
            case "asteroid shot":
                ctx.fillStyle = "#334243";
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2 - 1, 0, Math.PI * 2);
                ctx.fill();
                break;
            case "minify":
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#5b5496";
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -this.height / 2);
                ctx.lineTo(-this.width / 20, -this.height / 20);
                ctx.moveTo(-this.width / 10, -this.height / 5);
                ctx.lineTo(-this.width / 20, -this.height / 20);
                ctx.lineTo(-this.width / 5, -this.height / 10);
                ctx.moveTo(-this.width / 2, this.height / 2);
                ctx.lineTo(-this.width / 20, this.height / 20);
                ctx.moveTo(-this.width / 10, this.height / 5);
                ctx.lineTo(-this.width / 20, this.height / 20);
                ctx.lineTo(-this.width / 5, this.height / 10);
                ctx.moveTo(this.width / 2, -this.height / 2);
                ctx.lineTo(this.width / 20, -this.height / 20);
                ctx.moveTo(this.width / 10, -this.height / 5);
                ctx.lineTo(this.width / 20, -this.height / 20);
                ctx.lineTo(this.width / 5, -this.height / 10);
                ctx.moveTo(this.width / 2, this.height / 2);
                ctx.lineTo(this.width / 20, this.height / 20);
                ctx.moveTo(this.width / 10, this.height / 5);
                ctx.lineTo(this.width / 20, this.height / 20);
                ctx.lineTo(this.width / 5, this.height / 10);
                ctx.stroke();
                break;
        }
        ctx.restore();
    };
    return Powerup;
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
        // this.x %= xMax;
        // this.y %= yMax;
        return this;
    };
    Vector2D.prototype.copy = function () {
        return new Vector2D(this.x, this.y);
    };
    Vector2D.prototype.onscreen = function () {
        return Math.abs(this.x - asteroidsGame.playerShipPos.x) < (75 + (asteroidsGame.clientWidth / 2)) &&
            Math.abs(this.y - asteroidsGame.playerShipPos.y) < (75 + (asteroidsGame.clientHeight / 2));
    };
    return Vector2D;
}());
//# sourceMappingURL=main.js.map