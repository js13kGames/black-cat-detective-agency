
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

/* Setup WebGL */

const programInfo = webglUtils.createProgramInfo(gl, [vertexShader, fragmentShader]);
gl.useProgram(programInfo.program);

let fieldOfViewInRadians = 60 * Math.PI / 180;
let projection = null;

function updateProjection() {
  const viewportAspect = gl.canvas.width / gl.canvas.height;
  const nearPlane = 0.1;
  const farPlane = 100;
  projection = m4.perspective(fieldOfViewInRadians, viewportAspect, nearPlane, farPlane);
}

function resize3d() {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas, Math.min(devicePixelRatio || 1, 2));
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  updateProjection();
}

addEventListener('resize', resize3d);
resize3d();

function setZoom(amount) {
  fieldOfViewInRadians = Math.min(Math.PI / 2, Math.max(0.1, 60 * Math.PI / 180 + amount));
  updateProjection();
}
