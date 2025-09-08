
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

function drawHierarchicalObjects(objects, sharedParams) {
  objects.forEach((obj) => {
    return drawObject({
      ...obj,
      ...sharedParams,
      sX: 1,
      sY: 1,
      sZ: 1,
    });
  });
}

function drawObject({ view, world, tX, tY, tZ, sX, sY, sZ, color }) {
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
