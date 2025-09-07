/* Setup Shaders */
// see: https://webglfundamentals.org/webgl/lessons/webgl-shaders-and-glsl.html
// shaders are written in GLSL (OpenGL Shading Language)
const vertexShader = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  uniform mat4 u_mvp;
  uniform mat4 u_world;
  uniform mat4 u_worldInverseTranspose;

  varying vec3 v_normal;
  varying vec3 v_surfaceToLight;
  varying vec3 v_surfaceToView;

  uniform vec3 u_lightWorldPos;
  uniform mat4 u_viewInverse;

  void main() {
    // Multiply the position by the matrix.
    gl_Position = u_mvp * vec4(a_position, 1.0);

    // orient the normals and pass to the fragment shader
    v_normal = mat3(u_worldInverseTranspose) * a_normal;

    // compute the world position of the surface
    vec3 surfaceWorldPos = (u_world * vec4(a_position, 1.0)).xyz;

    // compute the vector of the surface to the light
    // and pass it to the fragment shader
    v_surfaceToLight = u_lightWorldPos - surfaceWorldPos;

    // compute the vector of the surface to the view/camera
    // and pass it to the fragment shader
    v_surfaceToView = (u_viewInverse[3].xyz) - surfaceWorldPos;
  }
`;

const fragmentShader = `
  precision mediump float;
  
  // Passed in from the vertex shader.
  varying vec3 v_normal;
  // ...
  varying vec3 v_surfaceToLight;
  varying vec3 v_surfaceToView;
  uniform vec4 u_color;
  uniform vec4 u_lightColor;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 surfaceToLight = normalize(v_surfaceToLight);

    // Flat diffuse, softened
    float diffuse = max(dot(normal, surfaceToLight), 0.0) * 0.8;
    // Ambient term for base color
    float ambient = 0.8;

    vec3 color = u_color.rgb * (ambient + diffuse) * u_lightColor.rgb;
    gl_FragColor = vec4(color, u_color.a);
  }
`;

/* Setup WebGL context and shaders */
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');


// add listener to resize the canvas to fit the window
function resize3d() {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas, Math.min(devicePixelRatio || 1, 2));
  // gl viewport will cover the entire canvas so things don't get stretched and what not
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

addEventListener('resize', resize3d);
// call resize initially
resize3d();

// this will enable depth testing which has to do with z-fighting!!
gl.enable(gl.DEPTH_TEST);

// makes it so things in front obscure things in back
gl.depthFunc(gl.LEQUAL);

// resets the canvas color
gl.clearColor(179 / 255, 188 / 255, 243 / 255, 1); // blue

// pointer events!
canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  document.body.style.cursor = locked ? 'none' : 'auto';
});

let yaw = 0; // < >
let pitch = 0; // ^ v
const sensitivity = 0.0025; // 0.002 – 0.004?
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) {
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
      document.getElementById('camera-ui').classList.remove('hidden');
      // albumElement.classList.add('hidden');
      document.getElementById('text-messages').classList.add('hidden');
      document.getElementById('instructions').classList.add('hidden');
    } else {
      cameraMode = false;
      document.getElementById('camera-ui').classList.add('hidden');
      document.getElementById('text-messages').classList.remove('hidden');
      document.getElementById('instructions').classList.remove('hidden');
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


/* Setup WebGL program */
const programInfo = webglUtils.createProgramInfo(gl, [vertexShader, fragmentShader]);
gl.useProgram(programInfo.program);


/* this is the frustum test */
// Obviously this could use a LOT of cleaning up!
let culpritIsMisbehaving = false;
function isObjectInCamera(mvps, obstacles, view, sunMvp) {
  console.log(mvps)
  let description = 'Nothing of interest';
  // use this to check for other-dog obstruction
  const badMvp = mvps.find(mvp => mvp.isBad);
  const centerOfObject = [0, 0, 0]; // center of the object
  const [bx, by, bz] = m4.transformPoint(badMvp.mvp, centerOfObject);

  // check which dog is closest in clip space (z-axis)
  let closestDog = null;
  let capturedZDistance = 0;
  let missReason = null;
  for (let culprit of mvps) {
    // check if the culprit is in the camera frustum
    // multiplies the matrix to get the clip space coordinates
    const [x, y, z] = m4.transformPoint(culprit.mvp, centerOfObject);
    const xPositionInBounds = x >= -1 && x <= 1;
    const yPositionInBounds = y >= -1 && y <= 1;
    const zPositionInBounds = z >= 0 && z <= 1;

    // initial check to make sure the dog is in clip-space view
    let inView = xPositionInBounds && yPositionInBounds && zPositionInBounds;
    if (!inView) {
      continue;
    }

    // make sure no obstacles are in front of the object
    for (let obstacle of obstacles) {
      const [ox, oy, oz] = m4.transformPoint(obstacle.mvp, centerOfObject);
      const obstacleInView = ox >= -1 && ox <= 1 && oy >= -1 && oy <= 1 && oz >= 0 && oz <= 1;
      // if the obstacles is in view, make sure it's not in front of the dog
      // also check x distance between obstacle and dog in clip space
      const xDist = Math.abs(ox - x);
      if (obstacleInView && oz < z && xDist < 0.3) {
        inView = false;
        if (culprit.isBad) {
          missReason = `that's the ${culprit.breedName}, but they're behind ${obstacle.name}`;
        } else {
          missReason = `that's ${culprit.dogName} the ${culprit.breedName} behind a ${obstacle.name}...`;
        }
        description = `A ${culprit.breedName} obstructed by ${obstacle.name}`;
        // }
      }
    }

    // make sure they aren't too far away
    const dogCam = m4.transformPoint(view, culprit.pos);
    const dogCamZ = -dogCam[2];
    const fovScale = 1 / Math.tan(fieldOfViewInRadians * 0.5);
    const maxDistance = fovScale / 0.2; // TODO: .2 seems good for now but keep testing
    const tooFar = dogCamZ > maxDistance;

    if (tooFar) {
      if (culprit.isBad) {
        missReason = `that's the ${culprit.breedName}, but they're too far away`;
        description = `${culprit.dogName} the ${culprit.breedName} in the distance`;
      } else {
        // TODO: this is just debugging, but maybe add a message like "zoom in"
        missReason = 'wow, this will look great in the "museum of stuff that\'s too far away"';
        description = 'Something in the distance...';
      }
      continue;
    }

    // check if non-culprit dog is obstructing
    if (inView) {
      if (!capturedZDistance || z < capturedZDistance) {
        // if a non-culprit dog is NOT obstructing the bad dog, then they should not be
        // considered the closest dog
        if (!culprit.isBad && badMvp) {
          // if the bad dog is in front of the non-culprit dog, then they are obstructing
          const xDist = Math.abs(bx - x);
          // dogs are thinner than trees
          if (bz < z && xDist < 0.1) {
            continue;
          }
        }

        // if you did all that, but the dog isn't engaging in the bad action, then they are not the suspect
        if (culprit.isBad && (!culpritIsMisbehaving && culprit.badAction !== 'hotdog')) { // TODO: have perspective style bad action
          missReason = `you got the right ${culprit.breedName} but they aren't doing anything bad!`;
          description = `${culprit.dogName} the ${culprit.breedName} being a good boy/girl`;
          continue;
        } else if (targetObject.mvp && culprit.isBad && culprit.badAction === 'hotdog') {
          // Ok so I tried a lot of things (hence why the hotdog is its own mvp...) but this seems to be working
          // first we need to figure out which way the dog based on how it is rotated on the xz plane
          const forward = [Math.sin(culprit.direction), 0, Math.cos(culprit.direction)];
          // then we need to figure out the vector from the dog's head to the camera
          const dogHead = [culprit.pos[0], culprit.pos[1] + 1.5 * culprit.scale, culprit.pos[2] + 2.75 * culprit.scale];
          // then get the position of the camera (this is translation xyz part of the view matrix)
          const camPos = [view[12], view[13], view[14]];
          // get vector from dog head to camera
          const toCamera = m4.subtractVectors(camPos, dogHead);
          // finally, get the dot product of the two normalized vectors to see if they are facing each other
          const fNorm = m4.normalize(forward);
          const tNorm = m4.normalize(toCamera);
          const dot = m4.dot(fNorm, tNorm);
          if (dot < 0 && Math.abs(dot) > 0.5) {
            missReason = `you got the right ${culprit.breedName}, but the hotdog isn't in the picture!`;
            description = `${culprit.dogName} the ${culprit.breedName} running off with my hotdog`;
            continue;
          }
        }
        closestDog = culprit;
        capturedZDistance = z;
      }
    }
  }

  // success if suspect dog is the captured dog!
  if (closestDog && closestDog.isBad) {
    description = `${closestDog.dogName}, a naughty ${closestDog.breedName}!`;
  } else if (closestDog) {
    missReason = `that's ${closestDog.dogName}, an innocent ${closestDog.breedName}!`;
    description = `${closestDog.dogName}, an innocent ${closestDog.breedName}`;
  }

  // see if they took a picture of an obstacle!
  if (!missReason && !closestDog) {
    for (let obstacle of obstacles) {
      const [ox, oy, oz] = m4.transformPoint(obstacle.mvp, centerOfObject);
      const obstacleInView = ox >= -1 && ox <= 1 && oy >= -1 && oy <= 1 && oz >= 0 && oz <= 1;
      if (obstacleInView) {
        missReason = `what am I supposed to do with this picture of ${obstacle.name}?`;
        description = obstacle.name
      }
    }
  }

  if (!missReason && !closestDog) {
    // if they took a pic of the sun, scold them.
    const [sx, sy, sz] = m4.transformPoint(sunMvp, centerOfObject);
    const sunInView = sx >= -1 && sx <= 1 && sy >= -1 && sy <= 1 && sz >= 0 && sz <= 1;
    if (sunInView) {
      missReason = `MY EYES!!!!`;
      description = 'The sun, a blinding light!';
    }
  }

  return { capturedDog: closestDog && closestDog.isBad ? closestDog : null, missReason, description };
}

function drawGround(gl, view, projection) {
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

// the cube buffer we will use to create everything!
const positions = [
  // Front face
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

  // Back face
  -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

  // Top face
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,

  // Bottom face
  -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,

  // Right face
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,

  // Left face
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
];
const normal = [
  // Front face
  0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

  // Back face
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

  // Top face
  0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

  // Bottom face
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

  // Right face
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

  // Left face
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

]
const indices = [
  // front
  0, 1, 2, 0, 2, 3,
  // back
  4, 5, 6, 4, 6, 7,
  // top
  8, 9, 10, 8, 10, 11,
  // bottom
  12, 13, 14, 12, 14, 15,
  // right
  16, 17, 18, 16, 18, 19,
  // left
  20, 21, 22, 20, 22, 23,
];
const cube = webglUtils.createBufferInfoFromArrays(gl, {
  position: { numComponents: 3, data: positions },
  normal: { numComponents: 3, data: normal },
  indices: { numComponents: 3, data: indices },
});
// end of cube code

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
      // if (colDog.badAction === 'speed') {
      //   // make sure the colDog is not on the same path or they will push each other around forever
      //   nudgeSize = 0.5;
      // }
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

  // check for collisions with trees too (and other stuff too, soon!)
  for (const tree of trees) {
    // Important: adding the width and depth to the collision box!! I think this will work better than setting the dist.
    const treeWidth = 1;
    const treeDepth = 1;
    const dx = dogState.pos[0] - tree.tX;
    const dz = dogState.pos[2] - tree.tZ;
    if (Math.abs(dx) < treeWidth && Math.abs(dz) < treeDepth) {     
      dogState.direction += 100 * (Math.PI / 180); // rotate 90 degrees!
      // nudge dog outside the tree if they get stuck :\
      if (Math.abs(dx) < treeWidth) {
        dogState.pos[0] = tree.tX + Math.sign(dx) * (treeWidth + 0.1);
      }
      if (Math.abs(dz) < treeDepth) {
        dogState.pos[2] = tree.tZ + Math.sign(dz) * (treeDepth + 0.1);
      }
      break;
    }
  }

  // check for collisions with bushes too
  for (const bush of bushes) {
    // Important: adding the width and depth to the collision box!! I think this will work better than setting the dist.
    const bushWidth = 1;
    const bushDepth = 1;
    const dx = dogState.pos[0] - bush.tX;
    const dz = dogState.pos[2] - bush.tZ;
    if (Math.abs(dx) < bushWidth && Math.abs(dz) < bushDepth) {
      dogState.direction += 100 * (Math.PI / 180); // rotate 90 degrees!
      // nudge dog outside the bush if they get stuck :\
      if (Math.abs(dx) < bushWidth) {
        dogState.pos[0] = bush.tX + Math.sign(dx) * (bushWidth + 0.1);
      }
      if (Math.abs(dz) < bushDepth) {
        dogState.pos[2] = bush.tZ + Math.sign(dz) * (bushDepth + 0.1);
      }
      break;
    }
  }

  // check for collisions with benches too
  for (const bench of benches) {
    const benchWidth = 2;
    const benchDepth = .6;
    const dx = dogState.pos[0] - bench.tX;
    const dz = dogState.pos[2] - bench.tZ;
    if (Math.abs(dx) < benchWidth && Math.abs(dz) < benchDepth) {
      dogState.direction += 100 * (Math.PI / 180); // rotate 90 degrees!
      // nudge dog outside the bench if they get stuck :\
      if (Math.abs(dx) < benchWidth) {
        dogState.pos[0] = bench.tX + Math.sign(dx) * (benchWidth + 0.1);
      }
      if (Math.abs(dz) < benchDepth) {
        dogState.pos[2] = bench.tZ + Math.sign(dz) * (benchDepth + 0.1);
      }
      break;
    }
  }
}

// for the photo album at the end! :) 
let allBlobs = [];
let timeSceneStarted = 0;
function drawDog(gl, programInfo, projection, view, dogState, badAction, isBadDog) {
  const time = performance.now() / 1000;

  // intermittent bad actions (TODO: make bad actions object with anim functions like dog parts!)
  let badActionInProgress = null;
  // TODO: add proper modTime
  const secondsBetween = badAction === 'tailChase' ? 7 : 10;
  if (time - timeSceneStarted > secondsBetween - 1 && badAction && time % secondsBetween < 5 && badAction !== 'speed') {
    badActionInProgress = badAction;
  } else if (badAction === 'speed' || badAction === 'hotdog') {
    // ongoing bad actions
    badActionInProgress = badAction;
  }

  if (badActionInProgress && isBadDog) {
    culpritIsMisbehaving = true;
  } else if (!badActionInProgress && isBadDog) {
    culpritIsMisbehaving = false;
  }

  updatePosition(dogState, time, badActionInProgress);
  const world = dogParts.map(() => m4.identity());
  const idx = Object.fromEntries(dogParts.map((p, i) => [p.name, i]));
  let mvp;

  for (let i = 0; i < dogParts.length; i++) {
    const part = dogParts[i];
    let partMatrix = part.parent ? m4.copy(world[idx[part.parent]]) : m4.identity();
    let offset = part.offset || [0, 0, 0];

    if (badActionInProgress === 'hotdog' && part.name === 'tongue') {
      continue; // tongue goes in mouth
    }

    const partColor = dogState.partColors[part.name] ? dogState.partColors[part.name] :
      part.name !== 'tongue' && part.name !== 'nose' ? dogState.wholeColor || part.color || colors.default : part.color || colors.default;

    // global scaling/transforming that everything will inherit
    if (part.name === 'torso') {
      partMatrix = m4.translate(partMatrix, dogState.pos[0], dogState.pos[1], dogState.pos[2]);
      partMatrix = m4.yRotate(partMatrix, dogState.direction);
      partMatrix = m4.scale(partMatrix, dogState.scale, dogState.scale, dogState.scale);
    }

    let floppyColorOverride = null;
    if (dogState.floppy && (part.name === 'earL' || part.name === 'earR')) {
      const earX = part.name === 'earL' ? -0.69 : 0.69;
      offset = [earX, 0.5 * dogState.scale, -0.4 * dogState.scale];
      // make floppy ears a little bit darker so they stand out
      floppyColorOverride = [partColor[0] - 15 / 255, partColor[1] - 15 / 255, partColor[2] - 15 / 255, 1.0];
    }

    // for any breed-specific modifications!
    let modifiedScale = [];
    if (dogState.modifications) {
      // Torso mods (update torso and children)
      if (dogState.modifications.torso > 0 && part.name === 'torso') {
        modifiedScale = [part.scale[0], part.scale[1], part.scale[2] * dogState.modifications.torso];
      }
      if (dogState.modifications.torso && part.parent === 'torso') {
        // some things will get pushed back on the z index
        let inverse = part.name === 'legLB' || part.name === 'legRB' || part.name === 'tail'
        offset = [offset[0], offset[1], offset[2] + dogState.modifications.torso * .6 * (inverse ? -1 : 1)];
      }
      // tail mod (no children)
      if (dogState.modifications.tail && part.name === 'tail') {
        modifiedScale = [part.scale[0], part.scale[1], dogState.modifications.tail];
        offset = [offset[0], offset[1], offset[2] + dogState.modifications.tail];
      }
      // snout mod (children are nose and tongue)
      if (dogState.modifications.snout && part.name === 'snout') {
        modifiedScale = [part.scale[0], part.scale[1], dogState.modifications.snout];
      }
      if (dogState.modifications.snout && part.parent === 'snout') {
        offset = [offset[0], offset[1], offset[2] - dogState.modifications.snout * .7];
      }
    }

    // local world offset + animation (no scale)
    partMatrix = m4.translate(partMatrix, offset[0], offset[1], offset[2]);

    // add part-specific animation if needed (speed has normal animation)
    if (part.anim && (!badActionInProgress || badActionInProgress === 'speed' || (badActionInProgress === 'jump' && !part.name.includes('leg')) || badAction === 'hotdog')) {
      if (badActionInProgress === 'speed' && part.name.includes('leg')) {
        // speed up the legs a little
        partMatrix = part.anim(time * 4, partMatrix);
      } else {
        partMatrix = part.anim(time, partMatrix);
      }
    }

    // add bad action mods
    if (badActionInProgress === 'tailChase') {
      if (part.name === 'tail') {
        partMatrix = m4.yRotate(partMatrix, 90 * Math.PI / 180);
        // move the tail a bit
        partMatrix = m4.translate(partMatrix, 0, 0, 0.5);
      }
      if (part.name === 'head' || part.parent === 'head' || part.parent === 'snout') {
        partMatrix = m4.yRotate(partMatrix, 90 * Math.PI / 180);
      }
    }

    // need to update worlds arr so the parent transforms are applied
    world[i] = partMatrix;
    let obj = drawObject({
      gl,
      projection,
      programInfo,
      view,
      world: world[i],
      tX: offset[0],
      tY: offset[1],
      tZ: offset[2],
      sX: modifiedScale[0] || part.scale[0],
      sY: modifiedScale[1] || part.scale[1],
      sZ: modifiedScale[2] || part.scale[2],
      color: floppyColorOverride || partColor
    });

    if (part.name === 'torso') {
      mvp = obj;
    }
  }
  return mvp;
}

function drawRoseBush(gl, programInfo, projection, view, pos, roseColor) {
  let bushWorld = m4.identity();
  bushWorld = m4.translate(bushWorld, pos[0], pos[1], pos[2]);
  bushWorld = m4.scale(bushWorld, 1, 1, 1);
  const bushMvp = drawObject({
    gl,
    projection,
    programInfo,
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
      gl,
      projection,
      programInfo,
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
function drawBench(gl, programInfo, projection, view, pos, rotation) {
  // Bench dimensions
  // Compute seat world matrix (translation + rotation)
  let seatWorld = m4.identity();
  seatWorld = m4.translate(seatWorld, pos[0], pos[1] + 0.25 + 0.1, pos[2]);
  seatWorld = m4.yRotate(seatWorld, rotation);
  seatWorld = m4.scale(seatWorld, 2, 0.2, 0.6);

  // seat (mvp!)
  const seatMvp = drawObject({
    gl,
    projection,
    programInfo,
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
  [ 0.9, -0.225, -0.3], // front right
  [-0.9, -0.225,  0.3], // back left
  [ 0.9, -0.225,  0.3], // back right
  ];
  legPos.forEach(pos => {
  let legWorld = m4.copy(seatWorld);
  legWorld = m4.translate(legWorld, pos[0] / 2, pos[1] / 0.2, pos[2] / 0.6);
  legWorld = m4.scale(legWorld, 0.1, 1.25, 0.3333);
    drawObject({
      gl,
      projection,
      programInfo,
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
    gl,
    projection,
    programInfo,
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


function drawHotdog(gl, world, programInfo, projection, view, pos) {
  const dHeight = 0.25;
  const dDepth = 0.5;
  const dWidth = 1.25;

  // Bun (parent)
  let bunWorld = m4.copy(world);
  bunWorld = m4.translate(bunWorld, pos[0], pos[1], pos[2]);
  bunWorld = m4.scale(bunWorld, dWidth, dHeight, dDepth);
  const bunMvp = drawObject({
    gl,
    projection,
    programInfo,
    view,
    world: bunWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.doughBrown
  });

  // hot dog  (child of bun)
  let hotdogWorld = m4.copy(bunWorld);
  hotdogWorld = m4.translate(hotdogWorld, 0, .1, 0);
  hotdogWorld = m4.scale(hotdogWorld, 1.25, 1, .5);
  drawObject({
    gl,
    projection,
    programInfo,
    view,
    world: hotdogWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.redBrown
  });

  // mustard (child of bun too)
  let mustardWorld = m4.copy(bunWorld);
  mustardWorld = m4.translate(mustardWorld, 0, .6, 0);
  mustardWorld = m4.scale(mustardWorld, 1.1, .1, .1);
  drawObject({
    gl,
    projection,
    programInfo,
    view,
    world: mustardWorld,
    tX: 0,
    tY: 0,
    tZ: 0,
    sX: 1,
    sY: 1,
    sZ: 1,
    color: colors.yellow
  });

  return bunMvp;

  // was gonna do a dotted line but it looked bad but maybe something for roses? :)
  // for (let i = 0; i < 4; i++) {

  //   drawObject({
  //     gl,
  //     projection,
  //     programInfo,
  //     view,
  //     world: null,
  //     tX: pos[0],
  //     tY: pos[1] + 0.01,
  //     // start at the beginning of the hot dog then move along z axis a bit!
  //     tZ: pos[2] - dDepth / 2 + (i * (dDepth / 3)),
  //     sX: 0.005,
  //     sY: 0.0025,
  //     sZ: .001,
  //     color: colors.yellow,
  //   });
  // }
}



function drawObject({ gl, projection, programInfo, view, world, tX, tY, tZ, sX, sY, sZ, color }) {
  webglUtils.setBuffersAndAttributes(gl, programInfo, cube);

  // this is for stationary objects with no movement logic!
  if (!world) {
    world = m4.identity();
    // translate before scaling
    world = m4.translate(world, tX, tY, tZ);
  }
  // scale object
  world = m4.scale(world, sX, sY, sZ);

  const worldInverseTranspose = m4.transpose(m4.inverse(world));
  // this is the matrix that is returned by this function
  const mvp = m4.multiply(projection, m4.multiply(view, world));
  webglUtils.setUniforms(programInfo, {
    u_mvp: mvp,
    u_world: world,
    u_worldInverseTranspose: worldInverseTranspose,
    u_lightWorldPos: [-50, 30, 100],
    u_viewInverse: view,
    u_lightColor: [1, 1, 1, 1],
    u_color: color,
  });
  webglUtils.drawBufferInfo(gl, cube);
  return mvp;
}

const colors = {
  slime: [99 / 255, 205 / 255, 134 / 255, 1],
  brown: [139 / 255, 69 / 255, 19 / 255, 1],
  purple: [128 / 255, 0, 128 / 255, 1],
  default: [0.8, 0.6, 0.3, 1.0],
  black: [0, 0, 0, 1],
  darkGray: [69 / 255, 69 / 255, 69 / 255, 1],
  yellow: [255 / 255, 255 / 255, 0, 1],
  white: [255 / 255, 255 / 255, 255 / 255, 1],
  lightBrown: [203 / 255, 167 / 255, 121 / 255, 1],
  lightTan: [253 / 255, 233 / 245, 207 / 232, 1],
  golden: [245 / 255, 204 / 255, 127 / 255, 1],
  blue: [68 / 255, 100 / 255, 159 / 255, 1],
  redBrown: [132 / 255, 41 / 255, 17 / 255, 1],
  tawny: [119 / 255, 68 / 255, 42 / 255, 1],
  frostingPink: [255 / 255, 213 / 255, 213 / 255, 1],
  doughBrown: [242 / 255, 188 / 255, 118 / 255, 1],
  red: [1, 0, 0, 1],
  ivyGreen: [75 / 255, 96 / 255, 61 / 255, 1],
  roseRed: [190 / 255, 30 / 255, 45 / 255, 1],
  rosePink: [255 / 255, 105 / 255, 180 / 255, 1],
  woodBrown: [101 / 255, 67 / 255, 33 / 255, 1],
};


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

// TODO: floppy dogs should have slightly darker ears
// TODO: dogState shouldn't be part of breeds object
const breeds = {
  german: {
    ...dogState,
    breedName: "German Shepherd",
    scale: 0.5,
    partColors: {
      snout: colors.tawny,
      earL: colors.tawny,
      earR: colors.tawny,
      tail: colors.tawny,
    }
  },
  westie: {
    ...dogState,
    breedName: "West Highland White Terrier",
    scale: 0.3,
    wholeColor: colors.white,
    modifications: {
      tail: 0.4,
    }
  },
  lab: {
    ...dogState,
    breedName: "Labrador Retriever",
    scale: 0.45,
    floppy: true,
    wholeColor: [colors.lightTan, colors.tawny, colors.darkGray],
  },
  golden: {
    ...dogState,
    breedName: "Golden Retriever",
    scale: 0.42,
    floppy: true,
    wholeColor: colors.golden,
  },
  chihuahua: {
    ...dogState,
    breedName: "Chihuahua",
    wholeColor: colors.lightBrown,
    scale: 0.15,
    modifications: {
      tail: 0.6,
    }
  },
  chow: {
    ...dogState,
    breedName: "Chow Chow",
    wholeColor: colors.redBrown,
    scale: 0.4,
    partColors: {
      tongue: colors.blue,
    },
    modifications: {
      tail: 0.2,
    }
  },
  jack: {
    ...dogState,
    breedName: "Jack Russell Terrier",
    wholeColor: colors.white,
    scale: 0.2,
    partColors: {
      body: colors.tawny,
      earL: colors.tawny,
      earR: colors.tawny,
      tail: colors.tawny,
      snout: colors.tawny,
    },
    modifications: {
      tail: 0.5,
    }
  },
  dachshund: {
    ...dogState,
    breedName: "Dachshund",
    wholeColor: [colors.darkGray, colors.redBrown],
    scale: 0.2,
    floppy: true,
    modifications: {
      torso: 1.5,
    }
  },
  pug: {
    ...dogState,
    breedName: "Pug",
    wholeColor: colors.lightBrown,
    scale: 0.2,
    partColors: {
      earL: colors.black,
      earR: colors.black,
      snout: colors.black,
    },
    modifications: {
      snout: 0.3,
      tail: 0.5,
    }
  }
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

  return { ...breed, breed: breedName, pos, direction, bounds, dogName: allDogNames[nameIndex] };
}

// add optional breed
function generateDogs(numDogs, breedNames, startIndex) {
  let dogs = [];
  for (let i = 0; i < numDogs; i++) {
    // will loop through breeds so we have a good variety but not too much of one!
    const baseDog = generateBaseDog(breedNames ? breedNames[i % breedNames.length] : null, startIndex + i);
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

let fieldOfViewInRadians = 60 * Math.PI / 180; // how wide the camera's view is (1.0471975511965976 radians -> 60 degrees)


/* dialog Logic */
let photoDialog = '';
let caughtDogBlob = null;

/* game logic! */
const allDogNames = ['Fig', 'Sriracha', 'Bagel', 'Barkus', "Sneeze", "Bopsy", "Plankley", 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Thermy', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivy', 'Matthew', "Milky", 'Boomer', 'Tallulah', 'Cholula', 'Flopina', 'Goopy', 'Sugar Pop', 'Waffles', "Wilsen", "Rufuss", "Sargent", "Floss", "Deemo", "Cecil", "Janis", "Charley", "Norman", "Miss Beautiful", "Fiona", "Watson", "Dewy", "Beau", "Moop", "Nes", "Maple", "Finnegan", "Zilly", "Panini", "Will", "Anne", "Colleen", "Aristotle", "Fish", "Eleanor", "Beth", "Gingerbread", "Weasel", "Pickles", "Avril", "Chaise", "Cameo", "Darby", "Garry", "Mona", "Pascal", "Shirley", "Tony", "Thisbe", "Spaghetti", "Tosha", "Kyler", "Sonny", "Nancy", "Ocean", "Hazelnut", "Nil", "Shelby", "Jocinda", "Meadow", "Clark", "Claire", "Bambina", "McCleskey"].slice().sort(() => Math.random() - 0.5);
let missionIndex = 0;
const redHerringActions = ['tailChase', 'speed', 'jump']
const missions = [
  // {
  //   // test mission!!
  //   targetBreed: ['westie'],
  //   badAction: 'jump',
  //   otherDogBreeds: ['golden', 'dachshund', 'dachshund', 'dachshund', 'chihuahua', 'pug', 'jack', 'lab', 'german', 'chow'],
  //   otherDogCount: 5,
  //   text: 'Test Mission!',
  //   redHerringCount: 0,
  // },
  {
    targetBreed: ['german', 'pug', 'westie'],
    badAction: 'tailChase',
    otherDogBreeds: ['lab', 'westie', 'dachshund', 'pug', 'lab', 'chihuahua'],
    otherDogCount: 6,
    text: 'Please find the dog who is chasing its own tail. It is very distracting!',
    redHerringCount: 0,
  },
  {
    targetBreed: null,
    badAction: 'speed',
    otherDogBreeds: ['golden', 'german', 'lab', 'chow', 'dachshund', 'pug', 'westie', 'chihuahua', 'jack'],
    otherDogCount: 10,
    text: 'Please find the dog running at full speed. It\'s making me nervous!',
    redHerringCount: 1,
  },
  {
    targetBreed: ['golden', 'german', 'lab', 'chow', 'pug', 'westie', 'chihuahua', 'jack'],
    badAction: 'hotdog',
    otherDogBreeds: ['golden', 'dachshund', 'dachshund', 'dachshund', 'chihuahua', 'pug', 'jack', 'westie', 'lab', 'german', 'chow'],
    otherDogCount: 20,
    text: 'Please find the dog who STOLE my hot dog. And sure you get their face!',
    redHerringCount: 3,
  },
  {
    targetBreed: null,
    badAction: 'jump',
    otherDogBreeds: ['golden', 'german', 'lab', 'chow', 'dachshund', 'pug', 'westie', 'chihuahua', 'jack'],
    otherDogCount: 25,
    text: 'Please find the dog who is jumping every so often. I\'m afraid they\'ll take off flying!',
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

  // This creates the projection matrix for the camera by mapping 3d coordinates into 2d clip space.
  // So, anything outside of the frustum will not be rendered!
  const viewportAspect = gl.canvas.width / gl.canvas.height;
  const nearPlane = 0.1; // the nearest distance we can see
  const farPlane = 100; // the farthest distance we can see
  const projection = m4.perspective(fieldOfViewInRadians, viewportAspect, nearPlane, farPlane);


  // draw the ground
  drawGround(gl, view, projection);

  // draw the sun!
  let sunMvp = drawObject({
    gl,
    projection,
    programInfo,
    view,
    world: null,
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
  const badDogMvp = drawDog(gl, programInfo, projection, view, badDog, currentMission.badAction, true);
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
    let hotDogMvp = drawHotdog(gl, hotDogMatrix, programInfo, projection, view, [0, 0, 0]);
    if (!targetObject.mvp) {
      targetObject = {mvp: hotDogMvp, pos: [badDog.pos[0], badDog.pos[1] + 1.5 * badDog.scale, badDog.pos[2] + 2.75 * badDog.scale]};
    }
  }

  // make the other dogs!
  otherDogs = otherDogs ?? generateDogs(currentMission.otherDogCount, currentMission.otherDogBreeds, startIndex + 1);
  otherDogs.forEach((dog, i) => {
    // make a red herring if applicable
    let redHerringAction = null;
    if (currentMission.redHerringCount && i < currentMission.redHerringCount) {
      // give the dog a badAction!
      redHerringAction = redHerringActions[i % redHerringActions.length];
    }
    let dogMvp = drawDog(gl, programInfo, projection, view, dog, redHerringAction, false);
    allDogs.push({ mvp: dogMvp, ...dog, isBad: false });
  });

  // draw grass
  blades.forEach(blade => {
    drawObject({ gl, projection, programInfo, view, world: null, tX: blade.tX, tY: 0, tZ: blade.tZ, sX: 0.01, sY: 0.3, sZ: 0.01, color: colors.slime });
  });

  // draw obstacles!
  let obstacles = [];
  // draw trees
  trees.forEach(tree => {
    // draw trunk
    const treeMvp = drawObject({ gl, projection, programInfo, view, world: null, tX: tree.tX, tY: 0.5, tZ: tree.tZ, sX: 1, sY: 10, sZ: 1, color: colors.brown });
    // draw leaves
    drawObject({ gl, projection, programInfo, view, world: null, tX: tree.tX, tY: 7, tZ: tree.tZ, sX: 6, sY: 3, sZ: 6, color: colors.slime });
    obstacles.push({ mvp: treeMvp, name: 'a tree' });
  });

  // draw bushes
  bushes.forEach((bush, i) => {
    // draw bush
    // for testing, make the last bush pink
    const bushMvp = drawRoseBush(gl, programInfo, projection, view, [bush.tX, 0.5, bush.tZ], i % 2 === 0 ? colors.rosePink : colors.roseRed);
    obstacles.push({ mvp: bushMvp, name: 'a rose bush' });
  });

  // draw a few benches
  benches.forEach(bench => {
    const benchMvp = drawBench(gl, programInfo, projection, view, [bench.tX, 0, bench.tZ], bench.rotation);
    obstacles.push({ mvp: benchMvp, name: 'a bench' });
  });

  // this will be true if the button is pressed...
  if (shouldCaptureImage) {

    albumElement.classList.remove('hidden');

    // reset the flag
    shouldCaptureImage = false;

    // Validate place within frustum for each subject using its center (model translation)
    const { capturedDog, missReason, description } = isObjectInCamera(allDogs, obstacles, view, sunMvp);

    // if the player doesn't successfully catch the dog, they will get a text message
    if (!capturedDog) {
      // gl.finish() will block javascript execution until all webgl commands are finished by the gpu.
      gl.finish();

      // https://webglfundamentals.org/webgl/lessons/webgl-tips.html#screenshot
      document.getElementById('instructions').classList.remove('hidden');
      canvas.toBlob(blob => {
        document.getElementById('text-messages').classList.remove('hidden');
        // clear album element
        albumElement.innerHTML = '';
        allBlobs.push({blob, description });
        const leftDiv = document.createElement('div');
        leftDiv.classList.add('text');
        leftDiv.classList.add('right-text');
        const screenshot = new Image();
        screenshot.src = URL.createObjectURL(blob);
        screenshot.classList.add('screenshot');
        screenshot.onload = () => {
          // append image to "album"
          leftDiv.appendChild(screenshot);
          albumElement.appendChild(document.createTextNode(' '));
          albumElement.appendChild(leftDiv);
          // response message
          const textContent = `${missReason || 'great. you took a picture of nothing.'}`;
          rightDiv = document.createElement('div');
          rightDiv.classList.add('text');
          rightDiv.classList.add('left-text');
          rightDiv.textContent = textContent;
          albumElement.appendChild(rightDiv);
        }
      });
      // get out of camera mode
      cameraMode = false;
      document.getElementById('camera-ui').classList.add('hidden');

    } else {
      // gl.finish() will block javascript execution until all webgl commands are finished by the gpu.
      gl.finish();

      // https://webglfundamentals.org/webgl/lessons/webgl-tips.html#screenshot
      canvas.toBlob(blob => {
        canvas.classList.add('hidden');
        // clear album element
        albumElement.innerHTML = '';
        allBlobs.push({blob, description });
        setDialogImage(blob)
        document.exitPointerLock();
        gameState = 5;
        // caughtDogBlob = blob;
        photoDialog = `you caught the culprit: ${capturedDog.dogName} the ${capturedDog.breedName}!`;
        dialogOpen = true;
        cameraMode = false;
      });

    }


  }

  requestAnimationFrame(render3D);
}

requestAnimationFrame(render3D);
