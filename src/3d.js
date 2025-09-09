// this will enable depth testing which has to do with z-fighting!!
gl.enable(gl.DEPTH_TEST);

// makes it so things in front obscure things in back
gl.depthFunc(gl.LEQUAL);

// resets the canvas color
gl.clearColor(179 / 255, 188 / 255, 243 / 255, 1); // blue

// pointer events!
gameUI.addEventListener('click', () => gameUI.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === gameUI;
  document.body.style.cursor = locked ? 'none' : 'auto';
});

let yaw = 0; // < >
let pitch = 0; // ^ v
const sensitivity = 0.0025; // 0.002 – 0.004?
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== gameUI) {
    return;
  };
  yaw -= e.movementX * sensitivity;
  pitch -= e.movementY * sensitivity;
  // clamp the pitch to prevent flipping around the y-axis
  const pitchLimit = Math.PI / 2 - 0.1; // 1.4707963267948965 radians to ~85 degrees
  pitch = Math.max(-pitchLimit, Math.min(pitch, pitchLimit));
}, { passive: true });

/* setup the camera UI */
const albumElement = document.getElementById('album');
let shouldCaptureImage = false;
let cameraMode = false;

let zoomAmount = 0;
addEventListener('keydown', e => {
  if (e.code === 'Space') {
    if (!cameraMode) {
      cameraMode = true;
      cameraUI.classList.remove('hidden');
      document.getElementById('text-messages').classList.add('hidden');
      instructions.classList.add('hidden');
    } else {
      cameraMode = false;
      cameraUI.classList.add('hidden');
      document.getElementById('text-messages').classList.remove('hidden');
      instructions.classList.remove('hidden');
    }
  } else if ((e.key === 'c' || e.key === 'C') && cameraMode) {
    shouldCaptureImage = true;
  } else if (e.key === 'z' || e.key === 'Z') {
    if (!cameraMode) return;
    // clamp zoomAmount
    zoomAmount = Math.max(-1, zoomAmount - 0.1);
  } else if (e.key === 'x' || e.key === 'X') {
    if (!cameraMode) return;
    // clamp at starting point
    if (zoomAmount > -0.1) return
    // zoom out
    zoomAmount += 0.1;
  }

  // WASD and arrow keys for yaw/pitch
  const movement = 10;
  switch (e.key.toLowerCase()) {
    case 'arrowleft':
    case 'a':
      yaw += movement * sensitivity;
      break;
    case 'arrowright':
    case 'd':
      yaw -= movement * sensitivity;
      break;
    case 'arrowup':
    case 'w':
      pitch += movement * sensitivity;
      break;
    case 'arrowdown':
    case 's':
      pitch -= movement * sensitivity;
      break;
  }
  // clamp pitch
  const pitchLimit = Math.PI / 2 - 0.1;
  pitch = Math.max(-pitchLimit, Math.min(pitch, pitchLimit));
});


function drawGround(view) {
  const s = 40;
  const positions = new Float32Array([
    -s, 0, -s,
    s, 0, -s,
    -s, 0, s,
    s, 0, s,
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);

  const groundBuffer = webglUtils.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: positions },
    normal: { numComponents: 3, data: normals },
  });

  webglUtils.setBuffersAndAttributes(gl, programInfo, groundBuffer);

  const world = m4.identity();
  const worldInverseTranspose = m4.transpose(m4.inverse(world));
  const mvp = m4.multiply(projection, m4.multiply(view, world));

  webglUtils.setUniforms(programInfo, {
    u_mvp: mvp,
    u_world: world,
    u_worldInverseTranspose: worldInverseTranspose,
    u_lightWorldPos: [-50, 30, 100],
    u_viewInverse: view,
    u_lightColor: [1, 1, 1, 1],
    u_color: colors.slime
  });

  webglUtils.drawBufferInfo(gl, groundBuffer, gl.TRIANGLE_STRIP);
}

// generating grass here instead of in object because they have no purpose and aren't obstacles!
function generateGrassBlades() {
  const blades = [];
  for (let i = 0; i < 1500; i++) {
    // -40 to 40 should cover the ground
    const tX = Math.random() * 40 - 20;
    const tZ = Math.random() * 40 - 20;
    const tY = Math.random() * 0.15 + 0.1;
    blades.push({ tX, tZ, tY });
  }
  return blades;
}

const blades = generateGrassBlades();



/* Drawing objects... */

// this should really be an object...
const dogParts = [
  {
    name: 'torso',
    parent: null,
    offset: [0, 1, 0],
    scale: [1.8, 1.2, 3],
  },

  // Head block
  {
    name: 'head',
    parent: 'torso',
    offset: [0, 0.9, 1.7],
    scale: [1.0, 1.0, 1.0],
    anim: (time, part) => {
      part = m4.translate(part, 0, 0.05 * Math.sin(time * 6), 0);
      return m4.xRotate(part, 0.05 * Math.sin(time * 2));
    }
  },

  // Snout + nose + tongue
  {
    name: 'snout',
    parent: 'head',
    offset: [0, 0.0, 0.7],
    scale: [0.6, 0.6, 0.8],
  },
  {
    name: 'nose',
    parent: 'snout',
    offset: [0, 0.15, 0.5],
    scale: [0.2, 0.2, 0.2],
    color: [0, 0, 0, 1.0]
  },
  {
    name: 'tongue',
    parent: 'snout',
    offset: [0, -0.35, 0.35],
    scale: [0.18, 0.35, 0.05],
    color: [0.8, 0.2, 0.2, 1.0]
  },

  // Ears
  {
    name: 'earL',
    parent: 'head',
    offset: [-0.45, 0.6, -0.1],
    scale: [0.18, 0.5, 0.18],
  },
  {
    name: 'earR',
    parent: 'head',
    offset: [0.45, 0.6, -0.1],
    scale: [0.18, 0.5, 0.18],
  },

  // Legs (walk in place)
  {
    name: 'legLF',
    parent: 'torso',
    offset: [-0.5, -0.5, 1],
    scale: [0.5, 1, 0.5],
    anim: (time, part) => m4.xRotate(part, 0.6 * Math.sin(time * 6 + 0))
  },
  {
    name: 'legRF',
    parent: 'torso',
    offset: [0.5, -0.5, 1],
    scale: [0.5, 1, 0.5],
    anim: (time, part) => m4.xRotate(part, 0.6 * Math.sin(time * 6 + Math.PI))
  },
  {
    name: 'legLB',
    parent: 'torso',
    offset: [-0.5, -0.5, -1],
    scale: [0.5, 1, 0.5],
    anim: (time, part) => m4.xRotate(part, 0.6 * Math.sin(time * 6 + Math.PI))
  },
  {
    name: 'legRB',
    parent: 'torso',
    offset: [0.5, -0.5, -1],
    scale: [0.5, 1, 0.5],
    anim: (time, part) => m4.xRotate(part, 0.6 * Math.sin(time * 6 + 0))
  },

  // Tail (wag)
  {
    name: 'tail', parent: 'torso',
    offset: [0, 0, -2.2],
    scale: [0.28, 0.28, 1.4],
    // oscillatory motion
    anim: (time, part) => m4.yRotate(part, Math.sin(time * 8)),
  },
];


function updateDogStateFromCollision(obstacles, width, depth, dogState) {
  for (const obstacle of obstacles) {
    const dx = dogState.pos[0] - obstacle.tX;
    const dz = dogState.pos[2] - obstacle.tZ;
    if (Math.abs(dx) < width && Math.abs(dz) < depth) {
      dogState.direction += 100 * (Math.PI / 180); // rotate 100 degrees!
      // nudge dog outside the obstacle if they get stuck :\
      if (Math.abs(dx) < width) {
        dogState.pos[0] = obstacle.tX + Math.sign(dx) * (width + 0.1);
      }
      if (Math.abs(dz) < depth) {
        dogState.pos[2] = obstacle.tZ + Math.sign(dz) * (depth + 0.1);
      }
      break;
    }
  }
  return dogState;
}


function updatePosition(dogState, time, badAction) {
  // // debugging
  // return;
  // apply bad action effects
  if (badAction === 'tailChase') {
    dogState.direction += 5 * (Math.PI / 180);
  }
  if (badAction === 'speed') {
    dogState.speed = 80;
  }
  // dog will only move up and down!
  if (badAction === 'jump') {
    const maxJump = 0.5;
    // starting jump
    if (dogState.velocity === null || dogState.pos[1] <= 0) {
      dogState.velocity = 0.05;
      dogState.pos[1] = 0.05;
    }
    dogState.pos[1] += dogState.velocity;
    dogState.velocity -= 0.01;
    if (dogState.pos[1] > maxJump) {
      dogState.pos[1] = maxJump;
    } else if (dogState.pos[1] <= 0) {
      // no digging dogs
      dogState.pos[1] = 0;
    }
  } else {
    dogState.pos[1] = 0;
    dogState.velocity = null;
  }

  const timeSinceStep = Math.max(0.001, time * 0.001 - dogState.timeWalking);
  dogState.timeWalking += timeSinceStep;
  const step = dogState.speed * timeSinceStep;
  if (badAction !== 'jump') {
    // update x position
    dogState.pos[0] += Math.sin(dogState.direction) * step;
    // update z position
    dogState.pos[2] += Math.cos(dogState.direction) * step;
  }

  // if the dog has hit the bounds, then turn them around and make them go in another direction!
  if (dogState.pos[0] < dogState.bounds.x[0] || dogState.pos[0] > dogState.bounds.x[1] ||
    dogState.pos[2] < dogState.bounds.z[0] || dogState.pos[2] > dogState.bounds.z[1]) {
    dogState.direction += 45 * (Math.PI / 180); // degrees in radians
    // make sure the dog is nudged back in bounds so they don't spin and go cuhrazy TODO: make like tree
    dogState.pos[0] = dogState.pos[0] < dogState.bounds.x[0] ? dogState.bounds.x[0] + 0.1 : dogState.pos[0]; // dog is out of bounds on the left
    dogState.pos[0] = dogState.pos[0] > dogState.bounds.x[1] ? dogState.bounds.x[1] - 0.1 : dogState.pos[0]; // dog is out of bounds on the right
    dogState.pos[2] = dogState.pos[2] < dogState.bounds.z[0] ? dogState.bounds.z[0] + 0.1 : dogState.pos[2]; // dog is out of bounds on the top
    dogState.pos[2] = dogState.pos[2] > dogState.bounds.z[1] ? dogState.bounds.z[1] - 0.1 : dogState.pos[2]; // dog is out of bounds on the bottom
  }


  // check for collisions with other dogs by looping through state. 
  // if they hit another dog, turn them around!
  // TODO: maybe stop the other dog from moving until the dog is safely placed?
  for (const colDog of allDogs) {
    if (colDog.dogName === dogState.dogName) continue;
    // creating a collision box for the dogs using the base torso scale! + tail!
    const dogTailLengthA = dogState.scale * dogParts[1].scale[2];
    const dogWidthA = dogState.scale * dogParts[0].scale[0];
    const dogDepthA = dogState.scale * dogParts[0].scale[2] + dogTailLengthA;
    const dogTailLengthB = colDog.scale * dogParts[1].scale[2];
    const dogWidthB = colDog.scale * dogParts[0].scale[0];
    const dogDepthB = colDog.scale * dogParts[0].scale[2] + dogTailLengthB;
    const dx = Math.abs(dogState.pos[0] - colDog.pos[0]);
    const dz = Math.abs(dogState.pos[2] - colDog.pos[2]);
    let nudgeSize = 0.5;
    if (dx < (dogWidthA + dogWidthB) / 2 && dz < (dogDepthA + dogDepthB) / 2) {

      dogState.direction += 45 * (Math.PI / 180);
      const minDistX = (dogWidthA + dogWidthB) / 2;
      const minDistZ = (dogDepthA + dogDepthB) / 2;
      // nudge dog outside the collision dog if they get stuck :\ 
      if (dx < minDistX || colDog.badAction === 'speed') {
        dogState.pos[0] = colDog.pos[0] + Math.sign(dogState.pos[0] - colDog.pos[0]) * (minDistX + nudgeSize);
      }
      if (dz < minDistZ || colDog.badAction === 'speed') {
        dogState.pos[2] = colDog.pos[2] + Math.sign(dogState.pos[2] - colDog.pos[2]) * (minDistZ + nudgeSize);
      }
      break;
    }
  }

  dogState = updateDogStateFromCollision(trees, 1, 1, dogState);
  dogState = updateDogStateFromCollision(bushes, 1, 1, dogState);
  dogState = updateDogStateFromCollision(benches, 2, 0.6, dogState);

}

// for the photo album at the end! :) 
let allBlobs = [];
let timeSceneStarted = 0;

function drawRoseBush(view, pos, roseColor) {
  let bushWorld = m4.identity();
  bushWorld = m4.translate(bushWorld, pos[0], pos[1], pos[2]);
  bushWorld = m4.scale(bushWorld, 1, 1, 1);
  const bushMvp = drawObject({
    view,
    world: bushWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.ivyGreen
  });

  // drawRoses
  const rosePos = [
    // x, y, z
    [0, -0.1, .10], // x
    [.12, 0.1, 0], // z
    [0, -0.25, .25], // x
    [-.3, -0.3, 0], // z
    [0, 0.1, -.3], // x
    [.25, 0.4, 0], // z
    [0, 0.4, -.2], // x
    [-.1, 0.3, 0], // z
    [0, 0.3, .1], // x
    [-.15, 0.1, -0], // z
    [0, -0.4, -.4], // x
    [.4, -.4, -0], // z
  ];
  for (let i = 0; i < rosePos.length; i++) {
    let roseWorld = m4.copy(bushWorld);
    // alternate between x and z
    let scaleX = 0.1;
    let scaleZ = 0.1;
    if (i % 2 === 0) { // even
      scaleX = 1.1;
    } else { // odd
      scaleZ = 1.1;
    }
    roseWorld = m4.translate(roseWorld, rosePos[i][0], rosePos[i][1], rosePos[i][2]);
    roseWorld = m4.scale(roseWorld, scaleX, 0.1, scaleZ);

    drawObject({
      view,
      world: roseWorld,
      tX: 0,
      tY: 0,
      tZ: 0,
      sX: 1,
      sY: 1,
      sZ: 1,
      color: roseColor
    });
  }
  return bushMvp;
};

// Draws a bench with 4 legs, a seat (surface, MVP), and a backrest
function drawBench(view, pos, rotation) {
  // Bench dimensions
  // Compute seat world matrix (translation + rotation)
  let seatWorld = m4.identity();
  seatWorld = m4.translate(seatWorld, pos[0], pos[1] + 0.25 + 0.1, pos[2]);
  seatWorld = m4.yRotate(seatWorld, rotation);
  seatWorld = m4.scale(seatWorld, 2, 0.2, 0.6);

  // seat (mvp!)
  const seatMvp = drawObject({
    view,
    world: seatWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.woodBrown
  });

  // draw the legs positions
  const legPos = [
    [-0.9, -0.225, -0.3], // front left
    [0.9, -0.225, -0.3], // front right
    [-0.9, -0.225, 0.3], // back left
    [0.9, -0.225, 0.3], // back right
  ];
  legPos.forEach(pos => {
    let legWorld = m4.copy(seatWorld);
    legWorld = m4.translate(legWorld, pos[0] / 2, pos[1] / 0.2, pos[2] / 0.6);
    legWorld = m4.scale(legWorld, 0.1, 1.25, 0.3333);
    drawObject({
      view,
      world: legWorld,
      tX: 0,
      tY: 0,
      tZ: 0,
      sX: 1,
      sY: 1,
      sZ: 1,
      color: colors.woodBrown
    });
  });

  // back rest
  let backWorld = m4.copy(seatWorld);
  backWorld = m4.translate(backWorld, 0, (0.1 + 0.3) / 0.2, (-0.3 + 0.075) / 0.6);
  backWorld = m4.scale(backWorld, 1, 3, 0.25);
  drawObject({
    view,
    world: backWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    // backrest color (slightly darker)
    color: [colors.woodBrown[0] - 5 / 255, colors.woodBrown[1] - 5 / 255, colors.woodBrown[2] - 5 / 255, 1.0]
  });
  return seatMvp;
};


function drawHotdog(world, view, pos) {
  const dHeight = 0.25;
  const dDepth = 0.5;
  const dWidth = 1.25;

  // Bun (parent)
  let bunWorld = m4.copy(world);
  bunWorld = m4.translate(bunWorld, pos[0], pos[1], pos[2]);
  bunWorld = m4.scale(bunWorld, dWidth, dHeight, dDepth);
  const bunMvp = drawObject({
    view,
    world: bunWorld,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.doughBrown
  });

  // hot dog  (child of bun)
  let hotdogWorld = m4.copy(bunWorld);
  hotdogWorld = m4.translate(hotdogWorld, 0, .1, 0);
  hotdogWorld = m4.scale(hotdogWorld, 1.25, 1, .5);

  // mustard (child of bun too)
  let mustardWorld = m4.copy(bunWorld);
  mustardWorld = m4.translate(mustardWorld, 0, .6, 0);
  mustardWorld = m4.scale(mustardWorld, 1.1, .1, .1);

  drawHierarchicalObjects([{
    world: hotdogWorld,
    color: colors.redBrown
  },
  {
    world: mustardWorld,
    color: colors.yellow
  }], {
    view,
  });

  return bunMvp;
}

// the base dog state
const dogState = {
  // keeping track of time spent walking used to 
  timeWalking: 0,
  // original position in world space (randomized to be a little far away from camera)
  pos: [0, 0, -6],
  // direction facing
  direction: 1,
  // size of dog
  scale: 0.5,
  // how fast per second
  speed: 15, // 5 seems to be pragmatic
  // for jumping!
  velocity: null,
  // how far they can go
  bounds: { x: [-8, 8], z: [-18, -2] },
  floppy: false,
  partColors: {},
};

const breeds = {
  german: { breedName: "German Shepherd", partColors: { snout: colors.tawny, earL: colors.tawny, earR: colors.tawny, tail: colors.tawny } },
  westie: { breedName: "West Highland White Terrier", scale: 0.3, wholeColor: colors.white, modifications: { tail: 0.4 } },
  lab: { breedName: "Labrador Retriever", scale: 0.45, floppy: true, wholeColor: [colors.lightTan, colors.tawny, colors.darkGray] },
  golden: { breedName: "Golden Retriever", scale: 0.42, floppy: true, wholeColor: colors.golden },
  chihuahua: { breedName: "Chihuahua", wholeColor: colors.lightBrown, scale: 0.15, modifications: { tail: 0.6 } },
  chow: { breedName: "Chow Chow", wholeColor: colors.redBrown, scale: 0.4, partColors: { tongue: colors.blue }, modifications: { tail: 0.2 } },
  jack: { breedName: "Jack Russell Terrier", wholeColor: colors.white, scale: 0.2, partColors: { body: colors.tawny, earL: colors.tawny, earR: colors.tawny, tail: colors.tawny, snout: colors.tawny }, modifications: { tail: 0.5 } },
  dachshund: { breedName: "Dachshund", wholeColor: [colors.darkGray, colors.redBrown], scale: 0.2, floppy: true, modifications: { torso: 1.5 } },
  pug: { breedName: "Pug", wholeColor: colors.lightBrown, scale: 0.2, partColors: { earL: colors.black, earR: colors.black, snout: colors.black }, modifications: { snout: 0.3, tail: 0.5 } }
};

function generateBaseDog(inputBreedName, nameIndex, isBadDog) {
  const breedName = Array.isArray(inputBreedName) ? inputBreedName[Math.floor(Math.random() * inputBreedName.length)] : inputBreedName || Object.keys(breeds)[Math.floor(Math.random() * Object.keys(breeds).length)];
  const breed = { ...breeds[breedName] };
  if (breed.wholeColor && Array.isArray(breed.wholeColor[0])) {
    breed.wholeColor = breed.wholeColor[Math.floor(Math.random() * breed.wholeColor.length)];
  }
  const x = Math.random() * 40 - 20;
  // start the bad dog a little bit further away
  let z = isBadDog ? (Math.random() * 20 - 10) - 10 : Math.random() * 40 - 20;
  const pos = [x, 0, z];
  const direction = Math.random() * Math.PI * 2;
  const bounds = { x: [-36.5, 36.5], z: [-36.5, 36.5] };

  return { ...dogState, ...breed, breed: breedName, pos, direction, bounds, dogName: allDogNames[nameIndex] };
}

// add optional breed
function generateDogs(numDogs, startIndex) {
  let dogs = [];
  for (let i = 0; i < numDogs; i++) {
    // will loop through breeds so we have a good variety but not too much of one!
    const baseDog = generateBaseDog(null, startIndex + i);
    dogs.push({ ...baseDog });
  }
  return dogs;
}

// honestly this is the perfect tree placement, i don't care!!! i'm hardcoding the trees.
const trees = [
  { "tX": 34.1, "tZ": -3.5 },
  { "tX": 21.8, "tZ": 8.2 },
  { "tX": 34.7, "tZ": 22.7 },
  { "tX": 7, "tZ": 25.2 },
  { "tX": 1.9, "tZ": 15.9 },
  { "tX": -7, "tZ": 8.4 },
  { "tX": -23.1, "tZ": 21.3 },
  { "tX": -13.7, "tZ": -0.3 },
  { "tX": -12.9, "tZ": -8.6 },
  { "tX": -21.8, "tZ": -3.9 },
  { "tX": -17.5, "tZ": -32.9 },
  { "tX": -7.1, "tZ": -30.1 },
  { "tX": 1.3, "tZ": -29.1 },
  { "tX": 23.7, "tZ": -17.9 },
  { "tX": 17.5, "tZ": -7.4 }
]
const bushes = [
  { tX: -7.5, tZ: -17.5 },
  { tX: 6.8, tZ: -4.1 },
  { tX: 3, tZ: 8.2 },
  { tX: -3.9, tZ: 15.7 },
  { tX: 4.3, tZ: -10.8 },
  { tX: -7.5, tZ: -5.4 },
];
const benches = [
  { tX: 12, tZ: -13, rotation: -45 * Math.PI / 180 },
  { tX: -15, tZ: -15, rotation: 45 * Math.PI / 180 },
];

// rendered dogs
let allDogs = []; // go to heaven
// the big red herrings
let otherDogs = null;
let badDog = null;
let targetObject = {
  mvp: null,
  pos: null,
};


/* dialog Logic */
let photoDialog = '';
let caughtDogBlob = null;

/* game logic! */
const allDogNames = ['Fig', 'Sriracha', 'Bagel', 'Barkus', "Sneeze", "Bopsy", "Plankley", 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Thermy', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivy', 'Matthew', "Milky", 'Boomer', 'Tallulah', 'Cholula', 'Flopina', 'Goopy', 'Sugar Pop', 'Waffles', "Wilsen", "Rufuss", "Sargent", "Floss", "Deemo", "Cecil", "Norman", "Miss Beautiful", "Fiona", "Watson", "Beau", "Moop", "Nes", "Maple", "Finnegan", "Zilly", "Panini", "Anne", "Colleen", "Aristotle", "Fish", "Eleanor", "Beth", "Gingerbread", "Weasel", "Pickles", "Avril", "Chaise", "Cameo", "Darby", "Garry", "Mona", "Pascal", "Shirley", "Tony", "Thisbe", "Spaghetti", "Tosha", "Sonny", "Nancy", "Ocean", "Hazelnut", "Shelby", "Jocinda", "Meadow", "Clark", "Claire", "Bambina", "McCleskey"].slice().sort(() => Math.random() - 0.5);
let missionIndex = 0;
const redHerringActions = ['tailChase', 'speed', 'jump']
const missions = [
  // {
  //   // test mission!!
  //   targetBreed: ['westie'],
  //   badAction: 'hotdog',
  //   otherDogCount: 10,
  //   text: 'Test Mission!',
  //   redHerringCount: 30,
  // },
  {
    badAction: 'tailChase',
    otherDogCount: 6,
    text: 'Find the dog who is chasing its own tail. It is very distracting!',
    redHerringCount: 0,
  },
  {
    targetBreed: null,
    badAction: 'speed',
    otherDogCount: 10,
    text: 'Find the dog running at full speed. It\'s making me nervous!',
    redHerringCount: 1,
  },
  {
    targetBreed: ['golden', 'german', 'lab', 'chow', 'pug', 'westie', 'chihuahua', 'jack'],
    badAction: 'hotdog',
    otherDogCount: 20,
    text: 'Find the dog who STOLE my hot dog. And sure you get their face!',
    redHerringCount: 3,
  },
  {
    targetBreed: null,    
    badAction: 'jump',
    otherDogCount: 25,
    text: 'Find the dog who is jumping every so often. I\'m afraid they\'ll take off flying!',
    redHerringCount: 2,
  },
]

// fill instructions with initial mission text
const missionText = document.getElementById('mission-text')
missionText.textContent = missions[missionIndex].text


/* the render loop */
let dialogOpen = false;
function render3D(time = 0) {
  time = time * 0.0001 + 5;
  allDogs = [];
  // set up the next mission while they have the dialog open!
  const currentMission = missions[missionIndex];
  resize3d();

  // clear the canvas before we do anything (color buffer and depth buffer flags)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // every frame we want to update the view to reflect the current pitch and yaw
  // as dictated by the user input!
  let view = m4.identity();
  view = m4.xRotate(view, -pitch); // remember, these are inverse values because it's changing the rotation of the camera, not the object
  view = m4.yRotate(view, -yaw);
  view = m4.translate(view, 0, -1, 0);

  // if in camera mode zoom in and out by changing the FOV
  if (cameraMode) {
    // reset FOV
    fieldOfViewInRadians = 60 * Math.PI / 180;
    // TODO: just use FOV and now zoomAmount
    if (zoomAmount === 0) {
      // start slightly zoomed in
      zoomAmount = -0.1;
    }
    fieldOfViewInRadians = Math.min(Math.PI / 2, Math.max(0.1, fieldOfViewInRadians + zoomAmount));
  } else {
    fieldOfViewInRadians = 60 * Math.PI / 180;
    zoomAmount = 0;
  }


  // draw the ground
  drawGround(view);

  // draw the sun!
  let sunMvp = drawObject({
    view,
    tX: 0,
    tY: 20,
    tZ: 0,
    sX: 4,
    sY: 4,
    sZ: 4,
    color: colors.yellow
  });

  let prevMission = missions[missionIndex - 1];
  let startIndex = prevMission ? prevMission.otherDogCount + 1 : 0;
  // make the bad dog >:) 
  badDog = badDog ?? generateBaseDog(currentMission.targetBreed, startIndex, true);
  const badDogMvp = drawDog(view, badDog, currentMission.badAction, true);
  allDogs.push({ mvp: badDogMvp, ...badDog, isBad: true, badAction: currentMission.badAction });


  // adding a hot dog for the hot dog mission!
  if (currentMission.badAction === 'hotdog') {
    // same animation as head nod!
    let hotDogMatrix = m4.identity();
    hotDogMatrix = m4.translate(hotDogMatrix, badDog.pos[0], badDog.pos[1], badDog.pos[2]);
    hotDogMatrix = m4.yRotate(hotDogMatrix, badDog.direction);
    // put the hotdog where the tongue is
    hotDogMatrix = m4.translate(hotDogMatrix, 0, 1.5 * badDog.scale, 2.75 * badDog.scale);
    hotDogMatrix = m4.scale(hotDogMatrix, badDog.scale, badDog.scale, badDog.scale);
    // the anim
    hotDogMatrix = m4.translate(hotDogMatrix, 0, 0.05 * Math.sin(performance.now() / 1000 * 6), 0);
    hotDogMatrix = m4.xRotate(hotDogMatrix, 0.05 * Math.sin(performance.now() / 1000 * 2));
    // draw the parts and save the mvp for the frustum test
    let hotDogMvp = drawHotdog(hotDogMatrix, view, [0, 0, 0]);
    if (!targetObject.mvp) {
      targetObject = { mvp: hotDogMvp, pos: [badDog.pos[0], badDog.pos[1] + 1.5 * badDog.scale, badDog.pos[2] + 2.75 * badDog.scale] };
    }
  }

  // make the other dogs!
  otherDogs = otherDogs ?? generateDogs(currentMission.otherDogCount, startIndex + 1);
  otherDogs.forEach((dog, i) => {
    // make a red herring if applicable
    let redHerringAction = null;
    if (currentMission.redHerringCount && i < currentMission.redHerringCount) {
      // give the dog a badAction!
      redHerringAction = redHerringActions[i % redHerringActions.length];
    }
    let dogMvp = drawDog(view, dog, redHerringAction, false);
    allDogs.push({ mvp: dogMvp, ...dog, isBad: false });
  });

  // draw grass
  blades.forEach(blade => {
    drawObject({ view, tX: blade.tX, tY: 0, tZ: blade.tZ, sX: 0.01, sY: 0.3, sZ: 0.01, color: colors.slime });
  });

  // draw obstacles!
  let obstacles = [];
  // draw trees
  trees.forEach(tree => {
    // draw trunk
    const treeMvp = drawObject({ view, tX: tree.tX, tY: 0.5, tZ: tree.tZ, sX: 1, sY: 10, sZ: 1, color: colors.brown });
    // draw leaves
    drawObject({ view, tX: tree.tX, tY: 7, tZ: tree.tZ, sX: 6, sY: 3, sZ: 6, color: colors.slime });
    obstacles.push({ mvp: treeMvp, name: 'a tree' });
  });

  // draw bushes
  bushes.forEach((bush, i) => {
    // draw bush
    const bushMvp = drawRoseBush(view, [bush.tX, 0.5, bush.tZ], i % 2 === 0 ? colors.rosePink : colors.roseRed);
    obstacles.push({ mvp: bushMvp, name: 'a rose bush' });
  });

  // draw a few benches
  benches.forEach(bench => {
    const benchMvp = drawBench(view, [bench.tX, 0, bench.tZ], bench.rotation);
    obstacles.push({ mvp: benchMvp, name: 'a bench' });
  });

  // this will be true for a single frame if the user has clicked the button to take a picture
  if (shouldCaptureImage) {
    shouldCaptureImage = false;
    // Validate place within frustum for each subject using its center (model translation)
    const { capturedDog, missReason, description } = isObjectInCamera(allDogs, obstacles, view, sunMvp);
    takePicture(capturedDog, missReason, description);
  }

  requestAnimationFrame(render3D);
}

requestAnimationFrame(render3D);
