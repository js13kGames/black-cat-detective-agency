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

  // I think this makes it so things in front obscure things in back? 
  // TODO: verify (just took from mdn example)
  gl.depthFunc(gl.LEQUAL);

  // resets the canvas color
  //   const lightPurple = "rgba(179, 188, 243, 1)";
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
      } else if (cameraMode && !shouldCaptureImage) {
        shouldCaptureImage = true;
      }
    } else if (e.key === 'z') {
      if (!cameraMode) return;
      // clamp zoomAmount
      zoomAmount = Math.max(-1, zoomAmount - 0.1);
    } else if (e.key === 'x') {
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
  function isObjectInCamera(mvps, centerOfObject) {
    // check which dog is closest in clip space (z-axis)
    let capturedDog = null;
    let capturedDistance = 0;
    for (let culprit of mvps) {
      // check if the culprit is in the camera frustum
      // multiplies the matrix to get the clip space coordinates
      const [x, y, z] = m4.transformPoint(culprit.mvp, centerOfObject);
      const xPositionInBounds = x >= -1 && x <= 1;
      const yPositionInBounds = y >= -1 && y <= 1;
      const zPositionInBounds = z >= 0 && z <= 1;

      // TODO: make sure they're not too far away
      let inView = xPositionInBounds && yPositionInBounds && zPositionInBounds;
      if (inView) {
        if (!capturedDistance || z < capturedDistance) {
          capturedDog = culprit;
          capturedDistance = z;
        }
      }
    }
    if (capturedDog) {
      console.log('caught', capturedDog.breedName);
    }
    return capturedDog;
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
      u_color: objectModule.colors.slime
    });

    webglUtils.drawBufferInfo(gl, groundBuffer, gl.TRIANGLE_STRIP);
  }

  function generateGrassBlades() {
    const blades = [];
    for (let i = 0; i < 1000; i++) {
      // -40 to 40 should cover the ground
      const tX = Math.random() * 40 - 20;
      const tZ = Math.random() * 40 - 20;
      const tY = Math.random() * 0.15 + 0.1;
      blades.push({ tX, tZ, tY });
    }
    return blades;
  }

  // hardcoding trees
  const trees = [
    {
      "tX": -33,
      "tZ": 2
    },
    {
      "tX": -14,
      "tZ": 37
    },
    {
      "tX": 29,
      "tZ": -10
    },
    {
      "tX": -18,
      "tZ": -25
    },
    {
      "tX": 37,
      "tZ": -31
    },
    {
      "tX": -25,
      "tZ": 8
    },
    {
      "tX": -1,
      "tZ": -29
    },
    {
      "tX": 5,
      "tZ": 20
    },
  ]
  const blades = generateGrassBlades();

  /* the render loop */
  function render(time = 0) {
    time = time * 0.0001 + 5;

    resize();

    // clear the canvas before we do anything (color buffer and depth buffer flags)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // every frame we want to update the view to reflect the current pitch and yaw
    // as dictated by the user input!
    let view = m4.identity();
    view = m4.xRotate(view, -pitch); // remember, these are inverse values because it's changing the rotation of the camera, not the object
    view = m4.yRotate(view, -yaw);
    view = m4.translate(view, 0, -1, 0);

    let fieldOfViewInRadians = 60 * Math.PI / 180; // how wide the camera's view is (1.0471975511965976 radians -> 60 degrees)

    // if in camera mode zoom in and out by changing the FOV
    if (cameraMode) {
      if (zoomAmount === 0) {
        // start slightly zoomed in
        zoomAmount = -0.1;
      }
      fieldOfViewInRadians = Math.min(Math.PI / 2, Math.max(0.1, fieldOfViewInRadians + zoomAmount));
    } else {
      zoomAmount = 0;
    }

    // This creates the projection matrix for the camera by mapping 3d coordinates into 2d clip space.
    // So, anything outside of the frustum will not be rendered!
    const viewportAspect = gl.canvas.width / gl.canvas.height;
    const nearPlane = 0.1; // the nearest distance we can see
    const farPlane = 100; // the farthest distance we can see
    const projection = m4.perspective(fieldOfViewInRadians, viewportAspect, nearPlane, farPlane);

    drawGround(gl, view, projection);

    // make the dogs!
    const culprits = [];
    objectModule.dogs.forEach(dog => {
      let dogMvp = objectModule.drawDog(gl, programInfo, projection, view, time, dog);
      culprits.push({mvp: dogMvp, ...dog});
    });

    // draw grass
    blades.forEach(blade => {
      objectModule.drawObject({ gl, projection, programInfo, view, world: null, tX: blade.tX, tY: 0, tZ: blade.tZ, sX: 0.01, sY: 0.3, sZ: 0.01, color: objectModule.colors.slime });
    });

    // draw trees
    trees.forEach(tree => {
      // draw trunk
      objectModule.drawObject({ gl, projection, programInfo, view, world: null, tX: tree.tX, tY: 0.5, tZ: tree.tZ, sX: 1, sY: 10, sZ: 1, color: objectModule.colors.brown });
      // draw leaves
      objectModule.drawObject({ gl, projection, programInfo, view, world: null, tX: tree.tX, tY: 7, tZ: tree.tZ, sX: 6, sY: 3, sZ: 6, color: objectModule.colors.slime });
    });

    // this will be true if the button is pressed...
    if (shouldCaptureImage) {
      // reset the flag
      shouldCaptureImage = false;

      // Validate place within frustum for each subject using its center (model translation)
      const centerOfObject = [0, 0, 0]; // center of the object
      const isCaptured = isObjectInCamera(culprits, centerOfObject);
    
      albumElement.textContent = isCaptured ? '✅ Got em!' : '❌ Missed! Try again?';

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
