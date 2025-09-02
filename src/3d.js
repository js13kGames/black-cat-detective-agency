(() => {
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

  let webglUtils = window.webglUtils;
  let m4 = window.m4;
  let objectModule = window.objectModule;

  /* Setup WebGL context and shaders */
  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl');

  // add listener to resize the canvas to fit the window
  function resize() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas, Math.min(devicePixelRatio || 1, 2));
    // gl viewport will cover the entire canvas so things don't get stretched and what not
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  addEventListener('resize', resize);
  // call resize initially
  resize();

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
        albumElement.classList.add('hidden');
      } else {
        cameraMode = false;
        document.getElementById('camera-ui').classList.add('hidden');
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
  });


  /* Setup WebGL program */
  const programInfo = webglUtils.createProgramInfo(gl, [vertexShader, fragmentShader]);
  gl.useProgram(programInfo.program);
  

  /* this is the frustum test */
  // Obviously this could use a LOT of cleaning up!
  function isObjectInCamera(mvps, obstacles, view) {
    console.log(mvps)
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
            missReason = `${culprit.breedName} is obstructed by ${obstacle.name}`;
          }
        }
      }

      // make sure they aren't too far away
      const dogCam = m4.transformPoint(view, culprit.pos);
      const dogCamY = -dogCam[2];
      const fovScale = 1 / Math.tan(fieldOfViewInRadians * 0.5);
      const maxDistance = fovScale / 0.2; // TODO: .2 seems good for now but keep testing
      const tooFar = dogCamY > maxDistance;

      if (tooFar) {
        if (culprit.isBad) {
          missReason = `${culprit.breedName} is too far away`;
        } else {
          // TODO: this is just debugging, but maybe add a message like "zoom in"
          missReason = 'anything is too far away';
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
          closestDog = culprit;
          capturedZDistance = z;
        }
      }
    }

    // success if suspect dog is the captured dog!
    if (closestDog && closestDog.isBad) {
      console.log('caught the suspect:', closestDog.breedName);
    } else if (closestDog) {
      missReason = `You captured ${closestDog.dogName}, an innocent ${closestDog.breedName}!`;
    }

    return { capturedDog: closestDog && closestDog.isBad ? closestDog : null, missReason };
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
    const timeSinceStep = Math.max(0.001, time * 0.001 - dogState.timeWalking);
    dogState.timeWalking += timeSinceStep;
    const step = dogState.speed * timeSinceStep;
    // update x position
    dogState.pos[0] += Math.sin(dogState.direction) * step;
    // update z position
    dogState.pos[2] += Math.cos(dogState.direction) * step;

    // if the dog has hit the bounds, then turn them around and make them go in another direction!
    if (dogState.pos[0] < dogState.bounds.x[0] || dogState.pos[0] > dogState.bounds.x[1] ||
      dogState.pos[2] < dogState.bounds.z[0] || dogState.pos[2] > dogState.bounds.z[1]) {
      dogState.direction += 45 * (Math.PI / 180); // degrees in radians
    }

    // check for collisions with other dogs by looping through state. 
    // if they hit another dog, turn them around!
    for (const colDog of allDogs) {
      if (colDog === dogState) continue;
      const dx = dogState.pos[0] - colDog.pos[0];
      const dz = dogState.pos[2] - colDog.pos[2];
      // euclidean distance! :) 
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < .1) {
        dogState.direction += 45 * (Math.PI / 180); // degrees in radians
        break;
      }
    }

    // check for collisions with trees too (and other stuff too, soon!)
    for (const tree of trees) {
      const dx = dogState.pos[0] - tree.tX;
      const dz = dogState.pos[2] - tree.tZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < .5) { // TODO: trees are a little thicker but upping the number makes them spin, so I'm testing with .5 and 180
        // turn 180 degrees to avoid getting stuck spinning
        dogState.direction += Math.PI;
        break;
      }
    }
  }

  function drawDog(gl, programInfo, projection, view, dogState, badAction) {
    const time = performance.now() / 1000;

    let badActionInProgress = null;
    if (badAction && time % 10 < 5) {
      badActionInProgress = badAction;
    }

    updatePosition(dogState, time, badActionInProgress);
    const world = dogParts.map(() => m4.identity());
    const idx = Object.fromEntries(dogParts.map((p, i) => [p.name, i]));
    let mvp;

    for (let i = 0; i < dogParts.length; i++) {
      const part = dogParts[i];
      let partMatrix = part.parent ? m4.copy(world[idx[part.parent]]) : m4.identity();
      let offset = part.offset || [0, 0, 0];

      // global scaling/transforming that everything will inherit
      if (part.name === 'torso') {
        partMatrix = m4.translate(partMatrix, dogState.pos[0], dogState.pos[1], dogState.pos[2]);
        partMatrix = m4.yRotate(partMatrix, dogState.direction);
        partMatrix = m4.scale(partMatrix, dogState.scale, dogState.scale, dogState.scale);
      }

      if (dogState.floppy && (part.name === 'earL' || part.name === 'earR')) {
        const earX = part.name === 'earL' ? -0.69 : 0.69;
        offset = [earX, 0.5 * dogState.scale, -0.4 * dogState.scale];
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

      // add part-specific animation if needed
      if (part.anim && !badActionInProgress) {
        partMatrix = part.anim(time, partMatrix);
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
      const partColor = dogState.partColors[part.name] ? dogState.partColors[part.name] :
        part.name !== 'tongue' && part.name !== 'nose' ? dogState.wholeColor || part.color || colors.default : part.color || colors.default;
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
        color: partColor
      });

      if (part.name === 'torso') {
        mvp = obj;
      }
    }
    return mvp;
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
    golden: [245 / 255, 204 / 255, 127 / 255, 1],
    blue: [68 / 255, 100 / 255, 159 / 255, 1],
    redBrown: [132 / 255, 41 / 255, 17 / 255, 1],
    tawny: [119 / 255, 68 / 255, 42 / 255, 1]
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
    // how far they can go
    bounds: { x: [-8, 8], z: [-18, -2] },
    floppy: false,
    partColors: {},
  };

  // TODO: floppy dogs should have slightly darker ears
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
      wholeColor: [colors.golden, colors.tawny, colors.darkGray],
    },
    chihuahua: {
      ...dogState,
      breedName: "Chihuahua",
      wholeColor: colors.lightBrown,
      scale: 0.15
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
      wholeColor: [colors.tawny, colors.redBrown],
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

  function generateBaseDog(inputBreedName, inputX, inputZ) {
    const breedName = inputBreedName || Object.keys(breeds)[Math.floor(Math.random() * Object.keys(breeds).length)];
    const breed = breeds[breedName];
    if (breed.wholeColor && Array.isArray(breed.wholeColor[0])) {
      breed.wholeColor = breed.wholeColor[Math.floor(Math.random() * breed.wholeColor.length)];
    }
    const x = inputX || Math.random() * 40 - 20;
    const z = inputZ || Math.random() * 40 - 20;
    const pos = [x, 0, z];
    const direction = Math.random() * Math.PI * 2;
    const bounds = { x: [x - 10, x + 10], z: [z - 10, z + 10] };
    return { ...breed, breed: breedName, pos, direction, bounds };
  }

  // add optional breed
  function generateDogs(numDogs, breedNames) {
    let dogs = [];
    for (let i = 0; i < numDogs; i++) {
      const baseDog = generateBaseDog(breedNames ? breedNames[i] : null);
      dogs.push({ ...baseDog });
    }
    return dogs;
  }

  // honestly this is the perfect tree placement, i don't care!!! i'm hardcoding the trees.
  const trees = [{ "tX": 36.142694635357486, "tZ": -3.545476247494409 }, { "tX": 21.856144769778417, "tZ": 8.298783160206147 }, { "tX": 35.72049816591068, "tZ": 22.75820088691891 }, { "tX": 8.619242878374369, "tZ": 25.25120024719197 }, { "tX": 1.9124314996793903, "tZ": 15.909405556107927 }, { "tX": -7.482670261388316, "tZ": 8.40875699368847 }, { "tX": -23.11830527007823, "tZ": 21.333714555520423 }, { "tX": -13.75073633147762, "tZ": -0.3246181792727388 }, { "tX": -12.926507929017301, "tZ": -8.615623261375035 }, { "tX": -21.865522647638176, "tZ": -3.9129049431434475 }, { "tX": -17.57745271439918, "tZ": -39.96293997352651 }, { "tX": -7.188055319468841, "tZ": -41.156059282588856 }, { "tX": 1.3824453543403066, "tZ": -32.105617385257716 }, { "tX": 23.710262253179298, "tZ": -17.971856046316784 }, { "tX": 17.52771565399987, "tZ": -7.436125847176054 }]

  // rendered dogs
  let allDogs = []; // go to heaven
  // the big red herrings
  let otherDogs = null;
  let badDog = null;
  let fieldOfViewInRadians = 60 * Math.PI / 180; // how wide the camera's view is (1.0471975511965976 radians -> 60 degrees)



  /* game logic! */
  const dogNames = ['Fig', 'Sriracha', 'Bagel', 'Barkus', 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Thermy', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivy', 'Matthew', 'Boomer', 'Tallulah', 'Cholula']
  let missionIndex = 0;
  const missions = [
    {
      targetBreed: 'lab', // I want a dog with a thick tail
      badAction: 'tailChase',
      otherDogBreeds: ['german', 'lab', 'chow', 'dachshund', 'pug', 'westie'],
      otherDogCount: 6,
      text: 'Please take a picture of the dog chasing its own tail. It is very distracting!',
      allDogNames: dogNames.slice().sort(() => Math.random() - 0.5)
    }
  ]

  /* the render loop */
  function render(time = 0) {
    time = time * 0.0001 + 5;
    allDogs = [];
    const currentMission = missions[missionIndex];

    resize();

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

    drawGround(gl, view, projection);

    // make the bad dog >:) 
    badDog = badDog ?? generateBaseDog(currentMission.targetBreed);
    const badDogMvp = drawDog(gl, programInfo, projection, view, badDog, currentMission.badAction);
    allDogs.push({ mvp: badDogMvp, ...badDog, dogName: currentMission.allDogNames[0], isBad: true });

    // make the other dogs!
    otherDogs = otherDogs ?? generateDogs(currentMission.otherDogCount, currentMission.otherDogBreeds);
    otherDogs.forEach((dog, i) => {
      let dogMvp = drawDog(gl, programInfo, projection, view, dog);
      allDogs.push({ mvp: dogMvp, ...dog, dogName: currentMission.allDogNames[i + 1], isBad: false });
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

    // this will be true if the button is pressed...
    if (shouldCaptureImage) {
      albumElement.classList.remove('hidden');

      // reset the flag
      shouldCaptureImage = false;

      // Validate place within frustum for each subject using its center (model translation)
      const { capturedDog, missReason } = isObjectInCamera(allDogs, obstacles, view);

      albumElement.textContent = capturedDog ? `You got the culprit: ${capturedDog.dogName} the ${capturedDog.breedName}!` : `❌ ${missReason || 'you took a picture of nothing'}`;
      // gl.finish() will block javascript execution until all webgl commands are finished by the gpu.
      gl.finish();

      // https://webglfundamentals.org/webgl/lessons/webgl-tips.html#screenshot
      canvas.toBlob(blob => {
        const screenshot = document.createElement('img');
        screenshot.className = 'screenshot';
        screenshot.src = URL.createObjectURL(blob);
        // append image to "album"
        albumElement.appendChild(document.createTextNode(' '));
        albumElement.appendChild(screenshot);
      });

      // get out of camera mode
      cameraMode = false;
      document.getElementById('camera-ui').classList.add('hidden');
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
