// const Http = new XMLHttpRequest();
// const url = "http://localhost"


// EXPANSION IDEAS:
//  fix stars: J
//  mini map: J
//  powerups: S
//  powerup notification: S
//  scoring: S
//  leaderboard: S
//  kill notification: J

function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const ws = new WebSocket("ws://192.168.1.128");

var keys_down: Set<String> = new Set();
// Benedict Cumberbatch's real name is Bucket Crunderdunder

ws.onmessage = function (message) {
    if (window.asteroidsGame) {
        let msg = JSON.parse(message.data);

        let numNew: number = msg.frameTimer - asteroidsGame.lastFrame;

        asteroidsGame.lastFrame = msg.frameTimer;

        for (let i: number = 0; i < msg.asteroids.length; i++) {
            let asteroid = msg.asteroids[i];

            asteroidsGame.gameElements.push(new Asteroid(asteroid.id, new Vector2D(asteroid.pos.x, asteroid.pos.y), new Vector2D(asteroid.velocity.x, asteroid.velocity.y), asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
        }

        // msg.asteroids.list.forEach(asteroid => {
        //     asteroidsGame.gameElements.push(new Asteroid(asteroid.id, asteroid.pos, asteroid.velocity, asteroid.lines, asteroid.angle, asteroid.rotationalVelocity));
        // });
        msg.bullets.forEach(bullet => {
            asteroidsGame.gameElements.push(new Bullet(bullet.id, new Vector2D(bullet.pos.x, bullet.pos.y), bullet.velocity, bullet.angle, bullet.width, bullet.height, bullet.color))
        });

        msg.ships.forEach(ship => {
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

                asteroidsGame.ctx.fillStyle = "rgb(0, 0, 0)" as string;
                asteroidsGame.ctx.fillRect(0, 0, asteroidsGame.canvas.width, asteroidsGame.canvas.height);

                // msg.ships.forEach(ship => {
                //     if (ship.id === asteroidsGame.playerShipID) {
                //         asteroidsGame.gameElements.forEach(element => {
                //             element.move(new Vector2D(ship.pos.x, ship.pos.y).mult(-1));
                //         });
                //     }
                // });


                for (let i: number = 0; i < (asteroidsGame.width * asteroidsGame.height) / 10000; i++) {
                    asteroidsGame.stars.push(new Star(new Vector2D(Math.random() * asteroidsGame.width, Math.random() * asteroidsGame.height), Math.random() * 5 + 1));
                }

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
                msg.deaths.forEach(death => {
                    asteroidsGame.gameElements = asteroidsGame.gameElements.filter(e => {
                        return !e.id || death !== e.id;
                    });
                });

                for (let i: number = 0; i < numNew; i++) {
                    asteroidsGame.update();
                }

                msg.collisions.forEach(collision => {
                    if (!collision.bullet) {
                        // let asteroid:Asteroid = asteroidsGame.gameElements.find(e => e.id === collision.asteroid);
                        // let ship = msg.ships.find(e => e.id === collision.ship);
                        asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                        asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.asteroid.pos.x, collision.asteroid.pos.y), collision.ship.angle, 30, "#334243"));
                    }
                    else if (!collision.asteroid) {
                        asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.ship.pos.x, collision.ship.pos.y), collision.ship.angle, 30, "#b06000"));
                    }
                    else if (!collision.ship) {
                        asteroidsGame.gameElements.push(new Debris(new Vector2D(collision.bullet.pos.x, collision.bullet.pos.y), collision.bullet.angle, 30, "#334243"));
                    }
                    else {
                        console.log("COLLISION ERROR:\n" + collision);
                    }
                });

                let ship = msg.ships.find(s => s.id === asteroidsGame.playerShipID);

                if (ship) {
                    asteroidsGame.playerShipPos = new Vector2D(ship.pos.x, ship.pos.y);
                }
                // asteroidsGame.gameElements.forEach(element => {
                //     // element.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).add(new Vector2D(ship.velocity.x, ship.velocity.y)).mult(-1));
                //     element.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).mult(-1));
                //     element.move(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2));
                // });

                asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).mult(-1).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2)));
                if(ship && ship.velocity) {
                    asteroidsGame.stars.forEach(e => e.move(new Vector2D(-ship.velocity.x, -ship.velocity.y)));
                }

                asteroidsGame.gameElements.forEach(e => {
                    if (e.pos) {
                        e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                    }
                    else {
                        e.modAll();
                    }
                });

                asteroidsGame.stars.forEach(e => {
                    e.pos.mod(asteroidsGame.width, asteroidsGame.height);
                });

                // console.log(asteroidsGame.stars[0].pos);

                asteroidsGame.draw();

                asteroidsGame.move(new Vector2D(asteroidsGame.playerShipPos.x, asteroidsGame.playerShipPos.y).add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2).mult(-1)));

                msg.ships.forEach(ship => {
                    asteroidsGame.drawShip(ship);
                });

                asteroidsGame.ctx.fillStyle = "#222";
                asteroidsGame.ctx.fillRect(asteroidsGame.clientWidth - 200, 0, 200, 200);
                asteroidsGame.ctx.fillStyle = "#f00";

                msg.ships.forEach(ship => {
                    let xPos = map(ship.pos.x, 0, asteroidsGame.width, asteroidsGame.clientWidth - 200, asteroidsGame.clientWidth);
                    let yPos = map(ship.pos.y, 0, asteroidsGame.height, 0, 200);

                    if (ship.id === asteroidsGame.playerShipID) {
                        asteroidsGame.ctx.fillStyle = "#55f";
                        asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                        asteroidsGame.ctx.fillStyle = "#f00";
                    }
                    else {
                        asteroidsGame.ctx.fillRect(xPos, yPos, 10, 10);
                    }
                });

                break;
        }
    }
}

class AsteroidsGame {
    public canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public playerShipID: number;
    public lastFrame: number;
    public gameElements: any[];
    stars: Star[];
    playerShipPos: Vector2D;
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;

    constructor() {
        let joinMsg = {
            type: "join",
            username: window.username,
            wingColor: window.wingColor,
            bodyColor: window.bodyColor,
            bulletColor: window.bulletColor
        };

        this.sendData(JSON.stringify(joinMsg));

        this.canvas = window.canvas as HTMLCanvasElement;

        this.gameElements = [];
        this.stars = [];

        function logKeyData(e, isPressed) {
            if (isPressed) keys_down.add(e.key);
            else keys_down.delete(e.key);
        }

        window.addEventListener("keydown", function (e) {
            logKeyData(e, true);
        });

        window.addEventListener("keyup", function (e) {
            logKeyData(e, false);
        });
    }

    sendData(data: string) {
        ws.send(data);
    }

    move(d) {
        this.gameElements.forEach(e => e.move(d));
    }

    update() {
        this.gameElements.forEach(e => e.update());
    }

    draw() {
        asteroidsGame.ctx.fillStyle = "#000";
        asteroidsGame.ctx.fillRect(0, 0, asteroidsGame.canvas.width, asteroidsGame.canvas.height);

        asteroidsGame.stars.forEach(star => star.draw(this.ctx));

        asteroidsGame.gameElements.filter(e => e instanceof Bullet).forEach(e => e.draw(this.ctx));
        asteroidsGame.gameElements.filter(e => e instanceof Asteroid).forEach(e => e.draw(this.ctx));
        asteroidsGame.gameElements.filter(e => e instanceof Debris).forEach(e => e.draw(this.ctx));
        asteroidsGame.gameElements.filter(e => e instanceof Trail).forEach(e => e.draw(this.ctx));
    }

    drawShip(ship) {
        asteroidsGame.ctx.save();

        if (ship.id === asteroidsGame.playerShipID) {
            asteroidsGame.ctx.translate(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2);
        }
        else {
            let p = new Vector2D(ship.pos.x, ship.pos.y).add(asteroidsGame.playerShipPos.mult(-1));
            p.add(new Vector2D(asteroidsGame.canvas.width / 2, asteroidsGame.canvas.height / 2));
            p.mod(asteroidsGame.width, asteroidsGame.height);

            asteroidsGame.ctx.translate(p.x, p.y);
        }

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
    }
}

class Bullet {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    angle: number;
    width: number;
    height: number;
    color: string;

    constructor(id: number, pos: Vector2D, vel: Vector2D, angle: number, width: number, height: number, color: string) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.angle = angle;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.pos.add(this.vel);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Debris {
    public static readonly FRICTION_CONSTANT: number = 0.95;
    public static readonly DECAY_CONSTANT: number = 0.2;

    public color: string;
    private chunks: Debris.Debri[];

    constructor(pos: Vector2D, angle: number, count: number, color: string) {
        this.chunks = []
        for (let i: number = 0; i < count; i++) {
            let randMag = Math.random() * 6 + 1;
            let randAngle = Math.random() * (3 * Math.PI / 2) - 3 * Math.PI / 4 + angle;
            this.chunks.push(new Debris.Debri(new Vector2D(pos.x, pos.y), Vector2D.fromAngle(randAngle).mult(randMag), Math.random() * 8, this));
        }

        this.color = color;
    }

    modAll() {
        this.chunks.forEach(chunk => chunk.pos.mod(asteroidsGame.width, asteroidsGame.height));
    }

    move(d: Vector2D) {
        this.chunks.forEach(chunk => chunk.move(d));
    }

    update() {
        this.chunks.forEach(chunk => chunk.update());
        this.chunks = this.chunks.filter(chunk => chunk.radius > 0);

        if (!this.chunks.length) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.chunks.forEach(chunk => chunk.draw(ctx));
    }
}

namespace Debris {
    export class Debri {
        public pos: Vector2D;
        private vel: Vector2D;
        public radius: number;
        private superThis: Debris;

        constructor(pos: Vector2D, vel: Vector2D, radius: number, superThis: Debris) {
            this.pos = pos;
            this.vel = vel;
            this.radius = radius;
            this.superThis = superThis;
        }

        move(d: Vector2D) {
            this.pos.add(d);
        }

        update() {
            this.pos.add(this.vel);
            this.vel.mult(Debris.FRICTION_CONSTANT);
            this.radius -= Debris.DECAY_CONSTANT;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = this.superThis.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

class Star {
    public pos: Vector2D;
    private depth: number;

    constructor(pos: Vector2D, depth: number) {
        this.pos = pos;
        this.depth = depth;
    }

    move(d: Vector2D) {
        this.pos.add(d.copy().mult(1 - (this.depth / 10)));
        // console.log(d);
        // this.pos.add(d);
    }

    update() {
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    }
}

class Trail {
    private pos: Vector2D;
    private radius: number;

    constructor(pos: Vector2D) {
        this.pos = pos;
        this.radius = 9;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.radius *= .85;
        if (this.radius < 0.01) {
            asteroidsGame.gameElements.splice(asteroidsGame.gameElements.indexOf(this), 1);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#5555ff77";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

class Asteroid {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    lines: Vector2D[];
    angle: number;
    angleVel: number;

    constructor(id: number, pos: Vector2D, vel: Vector2D, lines: Vector2D[], angle: number, angleVel: number) {
        this.id = id;
        this.pos = pos;
        this.vel = vel;
        this.lines = lines;
        this.angle = angle;
        this.angleVel = angleVel;
    }

    move(d: Vector2D) {
        this.pos.add(d);
    }

    update() {
        this.pos.add(this.vel);
        this.angle = (this.angleVel + this.angle) % (Math.PI * 2);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#334243";
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();

        ctx.moveTo(this.lines[0].x, this.lines[0].y);
        for (let i: number = this.lines.length - 1; i > -1; i--) {
            ctx.lineTo(this.lines[i].x, this.lines[i].y);
        }

        ctx.fill();
        ctx.restore();
    }
}

class Vector2D {
    x: number;
    y: number;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2D) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    mult(factor: number) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    static fromAngle(angle: number) {
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }

    mod(xMax: number, yMax: number) {
        this.x = ((this.x % xMax) + xMax) % xMax;
        this.y = ((this.y % yMax) + yMax) % yMax;
        // this.x %= xMax;
        // this.y %= yMax;
        return this;
    }

    copy() {
        return new Vector2D(this.x, this.y);
    }
}