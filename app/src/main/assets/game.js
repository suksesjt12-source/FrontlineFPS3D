import * as THREE from 'three';

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x8ba9bd);

scene.fog = new THREE.Fog(
    0x8ba9bd,
    25,
    100
);

const camera = new THREE.PerspectiveCamera(
    75,
    innerWidth / innerHeight,
    0.1,
    150
);

camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setSize(innerWidth, innerHeight);

renderer.setPixelRatio(
    Math.min(devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.2;

document.body.appendChild(renderer.domElement);

// LIGHTING

scene.add(
    new THREE.HemisphereLight(
        0xdceeff,
        0x344331,
        2
    )
);

const sunlight = new THREE.DirectionalLight(
    0xffe3bc,
    3
);

sunlight.position.set(-15, 25, 10);

sunlight.castShadow = true;

sunlight.shadow.mapSize.set(1024, 1024);

scene.add(sunlight);

// MATERIAL

function material(color, roughness = 0.8) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness
    });
}

// GROUND

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    material(0x64765b)
);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);

// BUILDING

function building(x, y, z, sx, sy, sz, color) {

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        material(color)
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    return mesh;
}

building(0, 1.5, -15, 12, 3, 2, 0x58666c);

building(-12, 1, -8, 5, 2, 6, 0x72736b);

building(12, 1, -10, 5, 2, 5, 0x555d62);

building(0, 1, 15, 15, 2, 2, 0x46545a);

// TREES

for (let i = 0; i < 45; i++) {

    const x = (Math.random() - 0.5) * 70;

    const z = (Math.random() - 0.5) * 70;

    if (Math.abs(x) < 8 && z > -18 && z < 10) {
        continue;
    }

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 2, 7),
        material(0x51402e)
    );

    trunk.position.set(x, 1, z);

    scene.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 3, 7),
        material(0x285239)
    );

    leaves.position.set(x, 3.2, z);

    leaves.castShadow = true;

    scene.add(leaves);
}

// WEAPON

const weapon = new THREE.Group();

camera.add(weapon);

scene.add(camera);

const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.2, 0.7),
    material(0x222c33)
);

gunBody.position.set(0.35, -0.3, -0.55);

weapon.add(gunBody);

const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12),
    material(0x111820)
);

barrel.rotation.x = Math.PI / 2;

barrel.position.set(0.35, -0.25, -1);

weapon.add(barrel);

// GAME VARIABLES

let enemies = [];

let hp = 100;

let ammo = 30;

let reserve = 120;

let score = 0;

let wave = 1;

let started = false;

let lastShot = 0;

// ENEMY

function spawnEnemies() {

    for (let i = 0; i < 3 + wave; i++) {

        const enemy = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
            material(0x943838)
        );

        body.position.y = 1.1;

        enemy.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.27, 12, 12),
            material(0xb88b70)
        );

        head.position.y = 1.85;

        enemy.add(head);

        const legs = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.65, 0.3),
            material(0x252e35)
        );

        legs.position.y = 0.35;

        enemy.add(legs);

        const angle = Math.random() * Math.PI * 2;

        const radius = 25 + Math.random() * 8;

        enemy.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );

        enemy.userData.hp = 100;

        scene.add(enemy);

        enemies.push(enemy);
    }

    document.getElementById('wave').textContent =
        'WAVE ' + wave;
}

// SHOOTING

function shoot() {

    if (!started || ammo <= 0) return;

    const now = performance.now();

    if (now - lastShot < 180) return;

    lastShot = now;

    ammo--;

    updateAmmo();

    const direction = new THREE.Vector3();

    camera.getWorldDirection(direction);

    const raycaster = new THREE.Raycaster(
        camera.position,
        direction,
        0,
        45
    );

    const objects = enemies.flatMap(e => e.children);

    const hits = raycaster.intersectObjects(objects);

    if (hits.length > 0) {

        const target = enemies.find(e =>
            e.children.includes(hits[0].object)
        );

        if (target) {

            target.userData.hp -= 50;

            if (target.userData.hp <= 0) {

                scene.remove(target);

                enemies = enemies.filter(
                    e => e !== target
                );

                score += 100;

                if (enemies.length === 0) {

                    wave++;

                    setTimeout(spawnEnemies, 1500);
                }
            }
        }
    }
}

// AMMO

function updateAmmo() {

    document.getElementById('ammo').textContent =
        ammo + ' / ' + reserve;
}

function reload() {

    if (ammo >= 30 || reserve <= 0) return;

    const amount = Math.min(30 - ammo, reserve);

    ammo += amount;

    reserve -= amount;

    updateAmmo();
}

document.getElementById('fire')
    .addEventListener('pointerdown', shoot);

document.getElementById('reload')
    .addEventListener('click', reload);

// TOUCH CONTROLS

let movement = { x: 0, y: 0 };

let looking = { x: 0, y: 0 };

function setupPad(id, data) {

    const element = document.getElementById(id);

    const stick = element.querySelector('.stick');

    let active = false;

    let start = { x: 0, y: 0 };

    element.addEventListener('pointerdown', e => {

        active = true;

        start = {
            x: e.clientX,
            y: e.clientY
        };

        element.setPointerCapture(e.pointerId);
    });

    element.addEventListener('pointermove', e => {

        if (!active) return;

        let dx = e.clientX - start.x;

        let dy = e.clientY - start.y;

        const distance = Math.min(42, Math.hypot(dx, dy));

        const angle = Math.atan2(dy, dx);

        dx = Math.cos(angle) * distance;

        dy = Math.sin(angle) * distance;

        stick.style.transform =
            `translate(${dx}px,${dy}px)`;

        data.x = dx / 42;

        data.y = dy / 42;
    });

    function release() {

        active = false;

        data.x = 0;

        data.y = 0;

        stick.style.transform = '';
    }

    element.addEventListener('pointerup', release);

    element.addEventListener('pointercancel', release);
}

setupPad('move', movement);

setupPad('look', looking);

// START

document.getElementById('play').onclick = () => {

    document.getElementById('start').style.display = 'none';

    started = true;

    spawnEnemies();
};

// GAME LOOP

let previous = performance.now();

function animate(time) {

    requestAnimationFrame(animate);

    const dt = Math.min((time - previous) / 1000, 0.04);

    previous = time;

    if (started) {

        camera.rotation.order = 'YXZ';

        camera.rotation.y -= looking.x * 0.05;

        camera.rotation.x -= looking.y * 0.04;

        camera.rotation.x = Math.max(
            -1.2,
            Math.min(1.2, camera.rotation.x)
        );

        const forward = new THREE.Vector3(
            -Math.sin(camera.rotation.y),
            0,
            -Math.cos(camera.rotation.y)
        );

        const right = new THREE.Vector3(
            Math.cos(camera.rotation.y),
            0,
            -Math.sin(camera.rotation.y)
        );

        camera.position.addScaledVector(
            forward,
            -movement.y * dt * 7
        );

        camera.position.addScaledVector(
            right,
            movement.x * dt * 7
        );

        camera.position.x = Math.max(
            -20,
            Math.min(20, camera.position.x)
        );

        camera.position.z = Math.max(
            -20,
            Math.min(20, camera.position.z)
        );

        // ENEMY AI

        for (const enemy of enemies) {

            const direction = new THREE.Vector3()
                .subVectors(camera.position, enemy.position);

            direction.y = 0;

            const distance = direction.length();

            if (distance > 1.5) {

                direction.normalize();

                enemy.position.addScaledVector(
                    direction,
                    dt * 1.2
                );
            }
        }
    }

    renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// RESIZE

window.addEventListener('resize', () => {

    camera.aspect = innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(innerWidth, innerHeight);
});
