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

  // // add an event listener to the button and the 'c'/space key to tell the render loop to capture!
  // cameraButton.onclick = () => {
  //   shouldCaptureImage = true;
  // };

let zoomAmount = 0;
  addEventListener('keydown', e => {
    if (e.key === 'c' || e.key === 'C') {
      cameraMode = !cameraMode;
      if (cameraMode) {
        document.getElementById('camera-ui').classList.remove('hidden');
      } else {
        document.getElementById('camera-ui').classList.add('hidden');
      }
    } else if (e.code === 'Space' && cameraMode) {
      shouldCaptureImage = true;
    } else if (e.key === 'z') {
      if (!cameraMode) return;
      // zoom in
      zoomAmount -= 0.1;
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


  /* WASD and arrow input! */
  let yaw = 0; // < >
  let pitch = 0; // ^ v

  function lerp(start, end, amount) {
    return start + (end - start) * amount
  }

  // make this "camera-mode-only"
  addEventListener('keydown', e => {
    let inputYaw = yaw;
    let inputPitch = pitch;
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      inputYaw += 0.12; // left
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
      inputYaw -= 0.12; // right
    } else if (e.key === 'w' || e.key === 'ArrowUp') {
      inputPitch += 0.12; // up
    } else if (e.key === 's' || e.key === 'ArrowDown') {
      inputPitch -= 0.12; // down
    }
    // clamp the pitch to prevent flipping around the y-axis
    const pitchLimit = Math.PI / 2 - 0.1; // 1.4707963267948965 radians to ~85 degrees
    pitch = Math.max(-pitchLimit, Math.min(inputPitch, pitchLimit));
    pitch = lerp(pitch, inputPitch, 0.1);
    yaw = lerp(yaw, inputYaw, 0.1);

    // will this conflict with pointer lock?
    e.preventDefault();
  });


  /* this is the frustum test */
  function isObjectInCamera(mvps, centerOfObject) {
    // TODO: make sure there is nothing in the way either....?
    const [mvp] = mvps; // we only care about the first object for now TESTING!
    // multiplies the matrix to get the clip space coordinates
    const [x, y, z] = m4.transformPoint(mvp, centerOfObject);
    const xPositionInBounds = x >= -1 && x <= 1;
    const yPositionInBounds = y >= -1 && y <= 1;
    const zPositionInBounds = z >= 0 && z <= 1;
    // check the clip space coords to see if they are within the frustum
    return xPositionInBounds && yPositionInBounds && zPositionInBounds;
  }


  // TODO: move this to own file
  // see example code: https://webglfundamentals.org/webgl/lessons/webgl-less-code-more-fun.html
  function rand(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return min + Math.random() * (max - min);
  }

  const uniformsThatAreComputedForEachObject = {
    u_worldViewProjection: m4.identity(),
    u_world: m4.identity(),
    u_worldInverseTranspose: m4.identity(),
  };

  const objects = [];
  const numObjects = 20;
  const baseColor = rand(240);
  for (let ii = 0; ii < numObjects; ++ii) {

    // // first push the golden object that we wanna capture!
    if (ii === 0) {
      objects.push({
        isCulprit: true,
        radius: 100,
        xRotation: 0,
        yRotation: 0,
        materialUniforms: {
          u_colorMult: [1, 0.8, 0.2, 1], // golden color
          u_specular: [1, 1, 1, 1],
          u_shininess: 50,
          u_specularFactor: 0.5,
        },
      });
      // push the rest of the objects
    } else {

      const gray = [218 / 255, 215 / 255, 215 / 255, 1];
      const clawGray = [201 / 255, 191 / 255, 191 / 255, 1];
      let color = ii % 2 === 0 ? gray : clawGray;
      objects.push({
        isCulprit: true,
        radius: rand(50, 150),
        xRotation: rand(Math.PI * 2),
        yRotation: rand(Math.PI),
        materialUniforms: {
          u_colorMult: color,
          u_specular: [1, 1, 1, 1],
          u_shininess: rand(10, 100),
          u_specularFactor: rand(0.2, 1),
        },
      });
    }
  }


  // Cube geometry: 8 vertices, 6 faces (12 triangles)

  // Cube geometry: scaled up to [-5, 5] for each axis
  const positions = [
    // Front face
    -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

    // Back face
    -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,

    // Top face
    -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,

    // Right face
    1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,

    // Left face
    -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
  ];

  const texcoord = [
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1
  ];

  const normal = [
    // Front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    // Back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    // Top
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    // Bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // Right
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
  ];

  const indices = [
    0, 1, 2, 0, 2, 3,    // front
    4, 5, 6, 4, 6, 7,    // back
    8, 9, 10, 8, 10, 11,   // top
    12, 13, 14, 12, 14, 15,   // bottom
    16, 17, 18, 16, 18, 19,   // right
    20, 21, 22, 20, 22, 23,   // left
  ];

  const objectBuffer = webglUtils.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: positions },
    texcoord: { numComponents: 2, data: texcoord },
    normal: { numComponents: 3, data: normal },
    indices: { numComponents: 3, data: indices },
  });

  const uniformSetters = webglUtils.createUniformSetters(gl, programInfo.program);

  function fundamentalExample(object, time, projection, view) {
    // Compute a position for this object based on the time.
    let worldMatrix = m4.xRotation(object.xRotation * time);
    worldMatrix = m4.yRotate(worldMatrix, object.yRotation * time);
    worldMatrix = m4.translate(worldMatrix, 0, 0, object.radius);
    uniformsThatAreComputedForEachObject.u_world = worldMatrix;

    // Setup all the needed buffers and attributes.
    webglUtils.setBuffersAndAttributes(gl, programInfo, objectBuffer);

    // so, unlike in the webgl fundamentals example, we want to move the camera around
    // so we need to compute the model-view-projection matrix!
    let viewWorld = m4.multiply(view, worldMatrix);
    // mvp is a 16 point matrix (don't forget about homogeneous coordinates!)
    let mvp = m4.multiply(projection, viewWorld);
    uniformsThatAreComputedForEachObject.u_worldViewProjection = mvp;

    // Multiply the matrices. (this is for lighting)
    m4.transpose(m4.inverse(worldMatrix), uniformsThatAreComputedForEachObject.u_worldInverseTranspose);

    // Set the uniforms that are specific to the this object.
    webglUtils.setUniforms(programInfo, {
      u_mvp: uniformsThatAreComputedForEachObject.u_worldViewProjection,
      u_color: object.materialUniforms.u_colorMult
    });

    // Set the uniforms we just computed
    webglUtils.setUniforms(uniformSetters, uniformsThatAreComputedForEachObject);

    // Set the uniforms that are specific to the this object.
    webglUtils.setUniforms(uniformSetters, object.materialUniforms);

    // Draw the geometry.
    gl.drawElements(gl.TRIANGLES, objectBuffer.numElements, gl.UNSIGNED_SHORT, 0);
    return mvp
  }


  // NOTE: I was using the code in here: https://webglfundamentals.org/webgl/lessons/webgl-less-code-more-fun.html
  // to emulate the random movement of the objects for the prototype! But I replaced the confetti with cubes from this tutorial: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
  function createObjects(time, projection, view) {
    // TODO: when creating objects, return important ones that we will need to do the frustum check on
    // TODO: possibly use drawObjectList?
    return objects.map(function (object) {

      const mvp = fundamentalExample(object, time, projection, view);

      if (object.isCulprit) {
        return mvp; // return the model-view-projection matrix for frustum culling
      } else {
        return null
      }
    }).filter(mvp => mvp !== null); // filter out the non-culprit objects (we don't need to return them)
  }

  function drawGround(gl, view, projection) {
    ;
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
      u_color: [99 / 255, 205 / 255, 134 / 255, 1], // green
    });

    webglUtils.drawBufferInfo(gl, groundBuffer, gl.TRIANGLE_STRIP);
  }

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
      console.log(zoomAmount)
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

    // this fixes an error that pops up sometimes in the linter?
    const viewInverse = m4.inverse(view);
    webglUtils.setUniforms(programInfo, {
      u_lightWorldPos: [-50, 30, 100],
      u_lightColor: [1, 1, 1, 1],
      u_viewInverse: viewInverse,
    });

    // okay, now that we got all that, we can draw our objects!
    const culprits = createObjects(time, projection, view); // createDogs

    drawGround(gl, view, projection);

    // gonna test by creating ONE dog
    dog.drawDog(gl, programInfo, projection, view, time);

    // this will be true if the button is pressed...
    if (shouldCaptureImage) {
      // reset the flag
      shouldCaptureImage = false;

      // TODO: validate place within frustum for each subject using its center (model translation)
      const centerOfObject = [0, 0, 0]; // center of the object
      const isCaptured = isObjectInCamera(culprits, centerOfObject);
      albumElement.textContent = isCaptured ? '✅ Got em!' : '❌ Missed! Try again?';

      // if (isCaptured) {
      // TODO: update UI elements when taking pic!

      // gl.finish() will block javascript execution until all webgl commands are finished by the gpu.
      // ensuring the canvas is fully rendered before we take a screenshot
      // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish
      // according to the fundamentals docs, it is the same as gl.flush() except it ALSO waits for the GPU to finish
      // hence why we use it here for the screenshot!
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
      // }

      // get out of camera mode
      cameraMode = false;
      document.getElementById('camera-ui').classList.add('hidden');
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
