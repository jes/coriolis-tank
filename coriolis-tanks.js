let rpm = -0.3;
let vx = 0; // m/s
let vy = 1; // m/s
let px_per_metre = 180;
let tick_ms = 15;

let angle = 0; // degrees
let ballx = 0; // metres (0,0) = centre of roundabout
let bally = 0; // metres
let show_ball = false;

let players = [make_player('#f22'), make_player('#22f')];
let curplayer = -1;
next_player();

$('#shoot').click(function() {
    $('#shoot').attr('disabled', true);
    show_ball = true;

    // start at position of red person in roundabout coords
    let x1 = Math.cos(players[curplayer].angle * Math.PI / 180) * 265;
    let y1 = Math.sin(players[curplayer].angle * Math.PI / 180) * 265;
    let xoff = Math.cos((180 + players[curplayer].angle + players[curplayer].gunangle) * Math.PI / 180) * 18;
    let yoff = Math.sin((180 + players[curplayer].angle + players[curplayer].gunangle) * Math.PI / 180) * 18;
    let pos = roundabout_to_world([x1+xoff, y1+yoff]);
    ballx = pos[0] / px_per_metre;
    bally = pos[1] / px_per_metre;

    // velocity of bullet from gun
    let vx1 = Math.cos((180 + players[curplayer].angle + players[curplayer].gunangle) * Math.PI / 180) * players[curplayer].firepower;
    let vy1 = Math.sin((180 + players[curplayer].angle + players[curplayer].gunangle) * Math.PI / 180) * players[curplayer].firepower;

    // current velocity of player
    let speed = tangential_velocity();
    let tvx1 = Math.cos((90 + players[curplayer].angle) * Math.PI / 180) * speed;
    let tvy1 = Math.sin((90 + players[curplayer].angle) * Math.PI / 180) * speed;

    let vel = roundabout_to_world([vx1 + tvx1, vy1 + tvy1]);
    vx = vel[0];
    vy = vel[1];
});

$('#reset').click(function() {
    show_ball = false;
    $('#rpm').val("10");
    $('#vx').val("0");
    $('#vy').val("2");
});

$('#reset').click();

window.setInterval(function() {
    // input
    players[curplayer].gunangle = parseFloat($('#gunangle').val()) / 10;
    players[curplayer].firepower = parseFloat($('#power').val()) / 1000;

    // physics
    let degrees_per_tick = (rpm * 360 * tick_ms) / (60*1000);
    angle += degrees_per_tick;
    while (angle < 0)
        angle += 360;
    while (angle >= 360)
        angle -= 360;

    ballx += (vx * tick_ms) / 1000;
    bally += (vy * tick_ms) / 1000;

    // ball off screen?
    let size = 300 / px_per_metre;
    if (show_ball && ((ballx < -size || ballx > size || bally < -size || bally > size) || ball_collides_wall())) {
        next_player();
    }

    // collision detection against palyers
    if (show_ball) {
        for (let i = 0; i < players.length; i++) {
            if (ball_collides_player(i)) {
                // TODO: explosion animation
                // TODO: "Player N destroyed"
                if (i != curplayer)
                    players[curplayer].score++;
                players[i].alive = false;
                next_player();
            }
        }
    }
 
    // graphics
    var c = document.getElementById('canvas1');
    var ctx = c.getContext('2d');

    ctx.beginPath();
    ctx.rect(0,0,600,600);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    ctx.translate(300,300);
    ctx.rotate(angle * Math.PI/180);
    drawScene(ctx, '#000');
    ctx.rotate(-angle * Math.PI/180);
    ctx.translate(-300,-300);

    c = document.getElementById('canvas2');
    ctx = c.getContext('2d');

    ctx.beginPath();
    ctx.rect(0,0,600,600);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    ctx.translate(300,300);
    drawScene(ctx, '#000');
    ctx.translate(-300,-300);
}, tick_ms);

// draw the scene from the roundabout frame
// (0,0) is the centre of the roundabout
function drawScene(ctx, colour) {
    // background fixed in space
    for (let a = 0; a < 360; a += 18) {
        let x = Math.cos(a * Math.PI / 180) * 290;
        let y = Math.sin(a * Math.PI / 180) * 290;
        drawPost(ctx, x, y, '#940');
    }

    // roundabout
    ctx.beginPath();
    ctx.arc(0, 0, 280, 0, 2*Math.PI, false);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    for (let a = 22.5; a < 360; a += 45) {
        let x1 = Math.cos(a * Math.PI / 180) * 280;
        let y1 = Math.sin(a * Math.PI / 180) * 280;
        let x2 = Math.cos(a * Math.PI / 180) * 260;
        let y2 = Math.sin(a * Math.PI / 180) * 260;
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    ctx.beginPath();
    ctx.moveTo(0,-5);
    ctx.lineTo(0,5);
    ctx.moveTo(-5,0);
    ctx.lineTo(5,0);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // people
    for (let i = 0; i < players.length; i++) {
        if (!players[i].alive)
            continue;
        let x = Math.cos(players[i].angle * Math.PI / 180) * 265;
        let y = Math.sin(players[i].angle * Math.PI / 180) * 265;
        if (i == curplayer) {
            let xoff = Math.cos((180 + players[i].angle + players[i].gunangle) * Math.PI / 180) * 18;
            let yoff = Math.sin((180 + players[i].angle + players[i].gunangle) * Math.PI / 180) * 18;

            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(x+xoff, y+yoff);
            ctx.lineStyle = '#000';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        }
        drawPerson(ctx, x, y, players[i].colour);
    }

    // ball
    if (show_ball) {
        // convert (ballx, bally) from world coordinates to roundabout coordinates
        let ballpos = world_to_roundabout([ballx * px_per_metre, bally * px_per_metre]);
        ctx.beginPath();
        ctx.arc(ballpos[0], ballpos[1], 2, 0, 2*Math.PI, false);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.closePath();
    }
}

function drawPerson(ctx, x, y, colour) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2*Math.PI, false);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.closePath();
}

function drawPost(ctx, x, y, colour) {
    let pos = world_to_roundabout([x,y]);
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], 3, 0, 2*Math.PI, false);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.closePath();
}

// convert [x,y] from world coordinates to roundabout coordinates
function world_to_roundabout(pos) {
    // rotate backwards around origin by angle
    let x = pos[0] * Math.cos(-angle * Math.PI / 180) - pos[1] * Math.sin(-angle * Math.PI / 180);
    let y = pos[1] * Math.cos(-angle * Math.PI / 180) + pos[0] * Math.sin(-angle * Math.PI / 180);
    return [x, y];
}

// convert [x,y] from roundabout coordinates to world coordinates
function roundabout_to_world(pos) {
    // rotate forwards around origin by angle
    let x = pos[0] * Math.cos(angle * Math.PI / 180) - pos[1] * Math.sin(angle * Math.PI / 180);
    let y = pos[1] * Math.cos(angle * Math.PI / 180) + pos[0] * Math.sin(angle * Math.PI / 180);
    return [x, y];
}

function tangential_velocity() {
    // TODO: calculate the difference based on the radius to the tip of the gun of cur_player
    // velocity at (110/px_per_metre) metres out on a circle turning at rpm
    // speed = distance / time
    let distance = Math.PI * 2 * (110 / px_per_metre); // circumference
    let time = 60 / rpm;// time for one rotation
    return distance / time;
}

function make_player(colour) {
    return {
        colour: colour,
        angle: 0,
        score: 0,
        gunangle: 0,
        firepower: 2.5,
        alive: false,
    };
}

function position_players() {
    players[0].angle = Math.random() * 360;

    // at least 60 degrees away from each other
    players[1].angle = players[0].angle + 60 + Math.random() * 240;

    for (let i = 2; i< players.length; i++) {
        // TODO: uniformly distribute these players as well
        players[i].angle = Math.random() * 360;
    }
}

function next_level() {
    rpm *= -2;
    $('#rpm').text("Turning at " + Math.round(Math.abs(rpm) * 10) / 10 + " rpm");
    position_players();
    for (let i = 0; i < players.length; i++) {
        players[i].gunangle = 0;
        players[i].firepower = 2.5;
        players[i].alive = true;
    }
}

function next_player() {
    show_ball = false;

    let nalive = 0;
    for (let i = 0; i < players.length; i++) {
        if (players[i].alive)
            nalive++;
    }
    if (nalive <= 1)
        next_level();

    do {
        curplayer = (curplayer + 1) % players.length;
    } while (!players[curplayer].alive);

    $('#gunangle').val(players[curplayer].gunangle * 10);
    $('#power').val(players[curplayer].firepower * 1000);
    $('#shoot').attr('disabled', false);
    $('#toplay').css('color', players[curplayer].colour);
    $('#toplay').text("Player " + (curplayer+1) + "'s turn");
}

function ball_collides_player(i) {
    // player coordinates in roundabout space
    let px = Math.cos(players[i].angle * Math.PI / 180) * 265;
    let py = Math.sin(players[i].angle * Math.PI / 180) * 265;

    // ball coorindates in roundabout space
    let bpos = world_to_roundabout([ballx * px_per_metre, bally * px_per_metre]);
    let bx = bpos[0];
    let by = bpos[1];

    let ballradius = 2;
    let playerradius = 10;

    // if the distance between the centres is less than the sum of the radii, they are overlapping
    if (Math.sqrt((bx-px)*(bx-px) + (by-py)*(by-py)) < ballradius+playerradius)
        return true;
    else
        return false;
}

function ball_collides_wall() {
    // ball coorindates in roundabout space
    let bpos = world_to_roundabout([ballx * px_per_metre, bally * px_per_metre]);
    let bx = bpos[0];
    let by = bpos[1];

    // HACK: since we know the line segments are all radial & short, we can just calculate the angle & distance from
    // centre of the ball, and then work out if that would place it on one of the walls; no proper
    // "circle-to-line-segment" collision detection required
    let radius = Math.sqrt(bx*bx + by*by);
    let angle = Math.atan2(by,bx) * 180 / Math.PI;
    while (angle < 0)
        angle += 360;

    // outside the roundabout?
    if (angle > 280)
        return true;

    // walls
    for (let a = 22.5; a < 360; a += 45) {

        if (radius > 260 && radius < 280 && Math.abs(a - angle) < 0.5)
            return true;
    }

    return false;
}
