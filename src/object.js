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

    const dogNames = ['Sriracha', 'Bagel', 'Barkus', 'Fizaac', 'Gwen', 'Soren', 'Ivan', 'Ugly Baby', 'Thermy', 'Dog Kevin', 'Taylina', 'Gwillex', 'Whivy', 'Matthew']
    // dog types: german shepherd, mutt, golden retriever, westie, pug
    // bad dog activities: eating garbage, running too fast, barking at nothing, silly color, chasing their own tail

    webglUtils = webglUtils || this.webglUtils;
    m4 = m4 || this.m4 || math3d;


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
            dogState.direction += 45 * (Math.PI / 180); // degrees in radians
        }

        // TODO: update distance for collision issues
        // check for collisions with other dogs by looping through state. 
        // if they hit another dog, turn them around!
        for (const colDog of dogs) {
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
    }

    function drawDog(gl, programInfo, projection, view, time, dogState) {
        updatePosition(dogState, time);
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
                const earX = part.name === 'earL' ? -0.69  : 0.69;
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
            }

            // local world offset + animation (no scale)
            partMatrix = m4.translate(partMatrix, offset[0], offset[1], offset[2]);

            // add part-specific animation if needed
            if (part.anim) {
                partMatrix = part.anim(time, partMatrix);
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
        yellow: [255 / 255, 255 / 255, 0, 1],
        white: [255 / 255, 255 / 255, 255 / 255, 1],
        lightBrown: [203 / 255, 167 / 255, 121 / 255, 1],
        golden: [245 / 255, 204 / 255, 127 / 255, 1],
        blue: [68 / 255, 100 / 255, 159 / 255, 1]
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
        // how far they can go
        bounds: { x: [-8, 8], z: [-18, -2] },
        floppy: false,
        partColors: {},
    };

    // TODO: floppy dogs should have darker ears
    const breeds = {
        // german: {
        //     ...dogState,
        //     breedName: "German Shepherd",
        //     color: colors.brown,
        //     scale: 0.5,
        //     partColors: {
        //         snout: colors.brown,
        //         earL: colors.brown,
        //         earR: colors.brown,
        //         tail: colors.brown,
        //     }
        // },
        westie: {
            ...dogState,
            breedName: "West Highland White Terrier",
            scale: 0.3,
            wholeColor: colors.white,
        },
        golden: {
            ...dogState,
            breedName: "Golden Retriever",
            scale: 0.45,
            floppy: true,
            wholeColor: colors.golden,
        },
        // chihuahua: {
        //     ...dogState,
        //     breedName: "Chihuahua",
        //     wholeColor: colors.lightBrown,
        //     scale: 0.2
        // },
        // chow: {
        //     ...dogState,
        //     breedName: "Chow Chow",
        //     wholeColor: colors.brown,
        //     scale: 0.4,
        //     partColors: {
        //         tongue: colors.blue,
        //     }
        // },
        // jack: {
        //     ...dogState,
        //     breedName: "Jack Russell Terrier",
        //     wholeColor: colors.white,
        //     scale: 0.2,
        //     partColors: {
        //         body: colors.brown,
        //         earL: colors.brown,
        //         earR: colors.brown,
        //         tail: colors.brown,
        //     }
        // },
        dachshund: {
            ...dogState,
            breedName: "Dachshund",
            wholeColor: colors.brown,
            scale: 0.2,
            floppy: true,
            modifications: {
                torso: 1.5,
            }
        },
        // pug: {
        //     ...dogState,
        //     breedName: "Pug",
        //     wholeColor: colors.black,
        //     scale: 0.2,
        // }
    };


    // yay let's generate some dogs
    const dogs = [];
    for (let i = 0; i < 15; i++) {
        const breedName = Object.keys(breeds)[Math.floor(Math.random() * Object.keys(breeds).length)];
        const breed = breeds[breedName];
        const x = Math.random() * 40 - 20;
        const z = Math.random() * 40 - 20;
        const position = [x, 0, z];
        const direction = Math.random() * Math.PI * 2;
        const bounds = { x: [x - 10, x + 10], z: [z - 10, z + 10] };
        // if the doggy is a mutt, change their colors
        dogs.push({ ...breed, breed: breedName, id: i, pos: position, direction, bounds });
    }

    console.log(dogs);

    // TODO: create a single drawObject function
    return {
        drawDog: drawDog,
        drawObject: drawObject,
        cube: cube,
        colors: colors,
        dogs: dogs,
    };

}));

let hex = {
    golden: 'rgba(245, 204, 127, 1)',
    lightBrown: 'rgba(203, 167, 121, 1)',
    blue: 'rgba(68, 100, 159, 1)'
};
