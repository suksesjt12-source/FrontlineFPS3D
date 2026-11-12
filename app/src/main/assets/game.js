
import * as THREE from 'three';

const root = document.getElementById('game');
const $ = id => document.getElementById(id);

let scene, camera, renderer, weapon;
let enemies = [];
let started = false;
let hp = 100, score = 0, ammo = 12, wave = 1;
let kills = 0, firing = false, reloading = false;
let yaw = 0, pitch = 0;
let lastShot = 0, lastDamage = 0;
let moveX = 0, moveY = 0;
let keys = {};
let joystickPointer = null, lookPointer = null;
let lastLookX = 0, lastLookY = 0;
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({color, roughness:0.9});
}

function box(x,y,z,sx,sy,sz,color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx,sy,sz),
    makeMaterial(color)
  );
  mesh.position.set(x,y,z);
  scene.add(mesh);
  return mesh;
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91a5a6);
  scene.fog = new THREE.Fog(0x91a5a6, 25, 90);

  camera = new THREE.PerspectiveCamera(
    75, innerWidth/innerHeight, 0.1, 150
  );
  camera.position.set(0,1.7,8);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({
    antialias:true,
    powerPreference:'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xdceaff,0x536044,2));
  const sun = new THREE.DirectionalLight(0xffe0b2,2);
  sun.position.set(-10,20,8);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120,120),
    makeMaterial(0x59664b)
  );
  ground.rotation.x=-Math.PI/2;
  ground.position.y=-0.05;
  scene.add(ground);

  // Jalan dan area markas
  box(0,0.02,-12,15,0.08,45,0x77796b);
  box(0,0.5,-23,20,1,1,0x46514c);
  box(-10,1,-12,1,2,18,0x56605a);
  box(10,1,-12,1,2,18,0x56605a);

  // Bangunan markas
  box(-5,1.5,-20,5,3,5,0x69736d);
  box(-5,3.1,-20,5.4,0.3,5.4,0x3c4948);
  box(5,1.5,-25,5,3,5,0x74766a);
  box(5,3.1,-25,5.4,0.3,5.4,0x3c4948);

  // Pohon low-poly
  for(let i=0;i<22;i++){
    const x=(Math.random()<0.5?-1:1)*(13+Math.random()*20);
    const z=-Math.random()*55;
    const trunk=new THREE.Mesh(
      new THREE.CylinderGeometry(0.15,0.25,2,5),
      makeMaterial(0x57422d)
    );
    trunk.position.set(x,1,z);
    scene.add(trunk);

    const leaves=new THREE.Mesh(
      new THREE.ConeGeometry(1.5,4,6),
      makeMaterial(0x284d35)
    );
    leaves.position.set(x,3.4,z);
    scene.add(leaves);
  }

  // Senjata sederhana di depan kamera
  weapon=new THREE.Group();
  const body=new THREE.Mesh(
    new THREE.BoxGeometry(0.18,0.18,0.65),
    makeMaterial(0x252b2d)
  );
  body.position.set(0.32,-0.28,-0.55);
  weapon.add(body);

  const barrel=new THREE.Mesh(
    new THREE.CylinderGeometry(0.035,0.035,0.55,8),
    makeMaterial(0x111619)
  );
  barrel.rotation.x=Math.PI/2;
  barrel.position.set(0.32,-0.25,-0.98);
  weapon.add(barrel);

  const grip=new THREE.Mesh(
    new THREE.BoxGeometry(0.12,0.25,0.15),
    makeMaterial(0x443d32)
  );
  grip.position.set(0.32,-0.45,-0.45);
  weapon.add(grip);
  camera.add(weapon);

  window.addEventListener('resize',resize);
  window.addEventListener('keydown',e=>keys[e.code]=true);
  window.addEventListener('keyup',e=>keys[e.code]=false);

  setupControls();
  animate();
}

function resize(){
  if(!renderer)return;
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}

function setupControls(){
  const zone=$('moveZone');
  const stick=$('stick');

  zone.addEventListener('pointerdown',e=>{
    joystickPointer=e.pointerId;
    zone.setPointerCapture(e.pointerId);
    updateJoystick(e);
  });
  zone.addEventListener('pointermove',e=>{
    if(e.pointerId===joystickPointer)updateJoystick(e);
  });
  function releaseJoy(e){
    if(e.pointerId!==joystickPointer)return;
    joystickPointer=null;
    moveX=moveY=0;
    stick.style.transform='translate(0px,0px)';
  }
  zone.addEventListener('pointerup',releaseJoy);
  zone.addEventListener('pointercancel',releaseJoy);

  function updateJoystick(e){
    const r=zone.getBoundingClientRect();
    let dx=e.clientX-(r.left+r.width/2);
    let dy=e.clientY-(r.top+r.height/2);
    const max=43;
    const len=Math.hypot(dx,dy);
    if(len>max){dx=dx/len*max;dy=dy/len*max;}
    moveX=dx/max;
    moveY=dy/max;
    stick.style.transform=`translate(${dx}px,${dy}px)`;
  }

  const look=$('lookZone');
  look.addEventListener('pointerdown',e=>{
    lookPointer=e.pointerId;
    lastLookX=e.clientX;
    lastLookY=e.clientY;
    look.setPointerCapture(e.pointerId);
  });
  look.addEventListener('pointermove',e=>{
    if(e.pointerId!==lookPointer)return;
    const dx=e.clientX-lastLookX;
    const dy=e.clientY-lastLookY;
    lastLookX=e.clientX;
    lastLookY=e.clientY;
    yaw-=dx*0.004;
    pitch-=dy*0.004;
    pitch=Math.max(-1.35,Math.min(1.35,pitch));
  });
  function releaseLook(e){
    if(e.pointerId===lookPointer)lookPointer=null;
  }
  look.addEventListener('pointerup',releaseLook);
  look.addEventListener('pointercancel',releaseLook);

  $('fire').addEventListener('pointerdown',e=>{
    e.preventDefault();
    firing=true;
    shoot();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>{
    $('fire').addEventListener(ev,()=>firing=false);
  });
  $('reload').addEventListener('click',reload);

  renderer.domElement.addEventListener('click',()=>{
    if(!started)return;
    if(innerWidth>700 && renderer.domElement.requestPointerLock){
      renderer.domElement.requestPointerLock();
    }
  });
  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement===renderer.domElement){
      yaw-=e.movementX*0.0025;
      pitch-=e.movementY*0.0025;
      pitch=Math.max(-1.35,Math.min(1.35,pitch));
    }
  });
  renderer.domElement.addEventListener('click',()=>{
    if(started && innerWidth>700)shoot();
  });
}

function spawnEnemy(){
  const group=new THREE.Group();
  const side=Math.random()<0.5?-1:1;
  const x=side*(5+Math.random()*8);
  const z=-20-Math.random()*24;

  const body=new THREE.Mesh(
    new THREE.BoxGeometry(0.8,1.2,0.45),
    makeMaterial(0x6b3c32)
  );
  body.position.y=1.1;
  group.add(body);

  const head=new THREE.Mesh(
    new THREE.SphereGeometry(0.3,8,6),
    makeMaterial(0xb58b70)
  );
  head.position.y=1.95;
  group.add(head);

  const legs=new THREE.Mesh(
    new THREE.BoxGeometry(0.65,0.55,0.4),
    makeMaterial(0x303a36)
  );
  legs.position.y=0.3;
  group.add(legs);

  group.position.set(x,0,z);
  group.userData.enemy=true;
  group.userData.hp=2;
  group.userData.attackTime=0;
  scene.add(group);
  enemies.push(group);
}

function shoot(){
  if(!started || reloading)return;
  const now=performance.now();
  if(now-lastShot<260)return;
  lastShot=now;

  if(ammo<=0){
    reload();
    return;
  }
  ammo--;
  updateHUD();

  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(enemies,true);

  if(hits.length){
    let target=hits[0].object;
    while(target && !target.userData.enemy)target=target.parent;
    if(target){
      target.userData.hp--;
      if(target.userData.hp<=0){
        scene.remove(target);
        enemies=enemies.filter(e=>e!==target);
        score+=100;
        kills++;
        if(kills>=wave*5){
          wave++;
          kills=0;
          $('message').textContent='WAVE '+wave;
          setTimeout(()=>$('message').textContent='',1200);
        }
        updateHUD();
        spawnEnemy();
      }
    }
  }
}

function reload(){
  if(!started || reloading || ammo===12)return;
  reloading=true;
  $('message').textContent='MENGISI PELURU...';
  setTimeout(()=>{
    ammo=12;
    reloading=false;
    $('message').textContent='';
    updateHUD();
  },1100);
}

function updateHUD(){
  $('hp').textContent=Math.max(0,Math.ceil(hp));
  $('score').textContent=score;
  $('wave').textContent=wave;
  $('ammo').textContent=ammo+'/12';
}

function updatePlayer(dt){
  camera.rotation.order='YXZ';
  camera.rotation.y=yaw;
  camera.rotation.x=pitch;

  let forward=0,side=0;
  if(keys.KeyW||keys.ArrowUp)forward+=1;
  if(keys.KeyS||keys.ArrowDown)forward-=1;
  if(keys.KeyA||keys.ArrowLeft)side-=1;
  if(keys.KeyD||keys.ArrowRight)side+=1;

  forward-=moveY;
  side+=moveX;

  const length=Math.hypot(forward,side);
  if(length>1){forward/=length;side/=length;}

  const speed=5.2*dt;
  camera.position.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed;
  camera.position.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;

  camera.position.x=Math.max(-9,Math.min(9,camera.position.x));
  camera.position.z=Math.max(-38,Math.min(12,camera.position.z));

  if(firing)shoot();
}

function updateEnemies(dt){
  const player=new THREE.Vector3(
    camera.position.x,0,camera.position.z
  );
  const now=performance.now();

  for(const enemy of enemies){
    const pos=enemy.position;
    const dx=player.x-pos.x;
    const dz=player.z-pos.z;
    const distance=Math.hypot(dx,dz);

    if(distance>2.1){
      const speed=(1.15+wave*0.08)*dt;
      pos.x+=(dx/distance)*speed;
      pos.z+=(dz/distance)*speed;
    }else if(now-enemy.userData.attackTime>1100){
      enemy.userData.attackTime=now;
      if(now-lastDamage>450){
        hp-=8;
        lastDamage=now;
        updateHUD();
        if(hp<=0)gameOver();
      }
    }
    enemy.lookAt(camera.position.x,1,camera.position.z);
  }
}

function gameOver(){
  if(!started)return;
  started=false;
  firing=false;
  $('finalScore').textContent=score;
  $('end').style.display='flex';
  $('controls').style.display='none';
  $('hud').style.display='none';
  $('crosshair').style.display='none';
  if(document.pointerLockElement)document.exitPointerLock();
}

function startGame(){
  if(!renderer)init();
  enemies.forEach(e=>scene.remove(e));
  enemies=[];
  hp=100;score=0;ammo=12;wave=1;kills=0;
  yaw=0;pitch=0;
  camera.position.set(0,1.7,8);
  started=true;
  $('cover').style.display='none';
  $('end').style.display='none';
  $('hud').style.display='block';
  $('controls').style.display='block';
  $('crosshair').style.display='block';
  $('message').textContent='';
  updateHUD();
  for(let i=0;i<5;i++)spawnEnemy();
}

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  if(started){
    updatePlayer(dt);
    updateEnemies(dt);
  }
  renderer.render(scene,camera);
}

$('start').addEventListener('click',startGame);
$('retry').addEventListener('click',startGame);
