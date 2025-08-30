/**
 * Create-a-Dog
 *
 * @module create-a-dog
 */
(function (root, factory) {  // eslint-disable-line
    // TODO: fix my spacing lol
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        root.objectModule = factory();
    }
}(this, function () {
    "use strict";

    const dogNames = ['Sriracha', 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Thermy', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivy', 'Matthew']
    // dog types: german shepherd, mutt, golden retriever, westie, pug
    // bad dog activities: eating garbage, running too fast, barking at nothing, silly color, chasing their own tail

    webglUtils = webglUtils || this.webglUtils;
    m4 = m4 || this.m4 || math3d;


    // randomize for tiny dogs
    const scale = .95;
    const dogParts = [
        {
            name: 'torso',
            parent: null,
            // x, y, z movement
            offset: [0 * scale, 1 * scale, 0 * scale],
            // x, y, z size
            scale: [1.8 * scale, 1.2 * scale, 3 * scale],
            anim: (t, M) => M
        },

        // Head block
        {
            name: 'head', parent: 'torso', 
            offset: [0 * scale, 0.9 * scale, 1.7 * scale], 
            scale: [1.0 * scale, 1.0 * scale, 1.0 * scale],
            anim: (t, M) => {
                M = m4.translate(M, 0, 0.05 * Math.sin(t * 6), 0); // tiny bob
                return m4.xRotate(M, 0.05 * Math.sin(t * 2));
            }
        },

        // Snout + nose + tongue
        {
            name: 'snout', parent: 'head', 
            offset: [0 * scale, 0.0 * scale, 0.7 * scale], 
            scale: [0.6 * scale, 0.6 * scale, 0.8 * scale],
            anim: (t, M) => M,
            // brown color
            color: [0.4, 0.2, 0.1, 1.0]
        },
        {
            name: 'nose', parent: 'snout', 
            offset: [0 * scale, 0.15 * scale, 0.5 * scale], 
            scale: [0.2 * scale, 0.2 * scale, 0.2 * scale],
            anim: (t, M) => M,
            color: [0.3, 0.1, 0.1, 1.0]
        },
        {
            name: 'tongue', parent: 'snout', 
            offset: [0 * scale, -0.35 * scale, 0.35 * scale], 
            scale: [0.18 * scale, 0.35 * scale, 0.05 * scale],
             // like the tail, the tongue oscillates but at a consistent frequency!
            // anim: (t, M) => m4.yRotate(M, Math.sin(t * 5)),
            color: [0.8, 0.2, 0.2, 1.0]
        }, 

        // Ears
        {
            name: 'earL', parent: 'head', 
            offset: [-0.45 * scale, 0.6 * scale, -0.1 * scale], 
            scale: [0.18 * scale, 0.5 * scale, 0.18 * scale],
            // anim: (t, M) => m4.zRotate(M, 0.15 * Math.sin(t * 5))
        },
        {
            name: 'earR', parent: 'head', 
            offset: [0.45 * scale, 0.6 * scale, -0.1 * scale], 
            scale: [0.18 * scale, 0.5 * scale, 0.18 * scale],
            // anim: (t, M) => m4.zRotate(M, -0.15 * Math.sin(t * 5))
        },

        // Legs (walk in place)
        {
            name: 'legLF', parent: 'torso', 
            offset: [-0.5 * scale, -0.5 * scale, 1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + 0))
        },
        {
            name: 'legRF', parent: 'torso', 
            offset: [0.5 * scale, -0.5 * scale, 1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + Math.PI))
        },
        {
            name: 'legLB', parent: 'torso', 
            offset: [-0.5 * scale, -0.5 * scale, -1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + Math.PI))
        },
        {
            name: 'legRB', parent: 'torso', 
            offset: [0.5 * scale, -0.5 * scale, -1 * scale], 
            scale: [0.5 * scale, 1 * scale, 0.5 * scale],
            anim: (t, M) => m4.xRotate(M, 0.6 * Math.sin(t * 6 + 0))
        },

        // Tail (wag)
        {
            name: 'tail', parent: 'torso', 
            offset: [0, 0, -2.2 * scale], 
            scale: [0.28 * scale, 0.28 * scale, 1.4 * scale],
            // oscillatory motion
            anim: (t, M) => m4.yRotate(M, Math.sin(t * 8)),
            color: [0.4, 0.2, 0.1, 1.0]
        },
    ];


    // the cube buffer we will use to create everything!
    const canvas = document.getElementById('c');
    const gl = canvas.getContext('webgl');
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
        speed:  15, // 1.1,
        // how far they can go
        bounds: { x: [-8, 8], z: [-18, -2] },
    };

    // this is for random dogs wander. Bad dogs will have own custom animations!
    function updatePosition(dogState, time) {
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
            dogState.direction += Math.PI; // just move them 180 degrees in radians
        }
    }

    function drawDog(gl, programInfo, projection, view, time) {
        updatePosition(dogState, time);
        const world = dogParts.map(() => m4.identity());
        const idx = Object.fromEntries(dogParts.map((p, i) => [p.name, i]));

        // TODO: going to just do a different func for every body part to make things easy
        for (let i = 0; i < dogParts.length; i++) {
            const part = dogParts[i];
            let partMatrix = part.parent ? m4.copy(world[idx[part.parent]]) : m4.identity();

            // root/global dog transform ONCE on torso (ok for children to inherit)
            if (part.name === 'torso') {
                partMatrix = m4.translate(partMatrix, dogState.pos[0], dogState.pos[1], dogState.pos[2]);
                partMatrix = m4.yRotate(partMatrix, dogState.direction);
                partMatrix = m4.scale(partMatrix, dogState.scale, dogState.scale, dogState.scale); // global size
            }

            // local world offset + animation (no scale)
            partMatrix = m4.translate(partMatrix, part.offset[0], part.offset[1], part.offset[2]);

            // add part-specific animation if needed
            if (part.anim) {
                partMatrix = part.anim(time, partMatrix);
            }

            world[i] = partMatrix;
        }

        for (let i = 0; i < dogParts.length; i++) {
            const part = dogParts[i];
            drawObject({ gl, projection, programInfo, view, world: world[i], tX: part.offset[0], tY: part.offset[1], tZ: part.offset[2], sX: part.scale[0], sY: part.scale[1], sZ: part.scale[2], color: part.color || [0.8, 0.6, 0.3, 1.0] });
        }
    }

    function drawObject({gl, projection, programInfo, view, world, tX, tY, tZ, sX, sY, sZ, color}) {
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
        'slime': [99 / 255, 205 / 255, 134 / 255, 1],
        'brown': [139 / 255, 69 / 255, 19 / 255, 1],
        'purple': [128 / 255, 0, 128 / 255, 1],
    }

    // TODO: create a single drawObject function
    return {
        drawDog: drawDog,
        drawObject: drawObject,
        cube: cube,
        colors: colors,
    };

}));
