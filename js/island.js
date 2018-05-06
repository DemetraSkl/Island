// var keyboard = new THREEx.KeyboardState();

var screenWidth = window.innerWidth,
    screenHeight = window.innerHeight,
    screenWidthHalf = window.innerWidth / 2,
    screenHeightHalf = window.innerHeight / 2,
    mouseX = 0,
    mouseY = 0,
    rotationAngle = 0,
    cameraAngle = 75,
    aspectRatio = window.innerWidth / window.innerHeight,
    near = 1,
    far = 300000;

var camera, scene, renderer, container, controls;

var worldGround, terrainScene, sand, decoScene;
var heightmapImage;


var waterParameters = {
    oceanSide: 2000,
    size: 1.0,
    distortionScale: 3.7,
    alpha: 1.0
};

var waterNormals;


setupWorld();
animate();

function setupWorld() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(cameraAngle, aspectRatio, near, far);
    //camera.position.set(0, 150, 400);
    camera.position.set(450, 350, 450);
    //camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(screenWidth, screenHeight);

    container = document.getElementById('container');
    container.appendChild(renderer.domElement);

    // canvas = document.querySelector("canvas");
    // context = canvas.getContext('2d');

    // Set orbit controls
    controls = new THREE.OrbitControls(camera);
    // How far you can dolly in ( PerspectiveCamera only ).
    controls.minDistance = 0;
    controls.maxDistance = 2000.0;
    // How far you can orbit vertically, lower limit. Range is 0 to Math.PI radians, and default is 0.
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.495;

    // Set light
    setLighting();

    // Set terrain w/ trees
    heightmapImage = new Image();
    heightmapImage.addEventListener('load', function() {
        setTerrain();
    });
    heightmapImage.src = 'images/heightmap.png';
    // Set ocean
    setWater();
    // Set sky
    setSkybox();
    // Set single tree
    // setTree();


    window.addEventListener('resize', onWindowResize, false);

    var axes = new THREE.AxesHelper(100);
    scene.add(axes);
}

/***************************************************************************************
 *    Ocean and skybox reference 
 *    Title: webgl ocean
 *    Author: mrdoob 
 *    Last Update: 2018
 *    Availability: https://github.com/mrdoob/three.js/blob/master/examples/webgl_shaders_ocean.html
 *
 ***************************************************************************************/
function setWater() {
    water = new THREE.Water(
        waterParameters.oceanSide * 5,
        waterParameters.oceanSide * 5, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('images/waternormals.jpg', function(texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            alpha: waterParameters.alpha,
            sunDirection: light.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: waterParameters.distortionScale,
            fog: scene.fog != undefined
        }
    );

    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;

    scene.add(water);

}

function setSkybox() {

    cubeMap = new THREE.CubeTexture([]);
    cubeMap.format = THREE.RGBFormat;

    var loader = new THREE.ImageLoader();
    loader.load('images/skyboxsun25degtest.png', function(image) {

        var getSide = function(x, y) {

            var size = 1024;

            canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            context = canvas.getContext('2d');
            context.drawImage(image, -x * size, -y * size);

            return canvas;

        };

        cubeMap.images[0] = getSide(2, 1); // px
        cubeMap.images[1] = getSide(0, 1); // nx
        cubeMap.images[2] = getSide(1, 0); // py
        cubeMap.images[3] = getSide(1, 2); // ny
        cubeMap.images[4] = getSide(1, 1); // pz
        cubeMap.images[5] = getSide(3, 1); // nz
        cubeMap.needsUpdate = true;

    });

    var cubeShader = THREE.ShaderLib['cube'];
    cubeShader.uniforms['tCube'].value = cubeMap;

    var skyBoxMaterial = new THREE.ShaderMaterial({
        fragmentShader: cubeShader.fragmentShader,
        vertexShader: cubeShader.vertexShader,
        uniforms: cubeShader.uniforms,
        side: THREE.BackSide
    });

    var skyBox = new THREE.Mesh(
        new THREE.BoxGeometry(waterParameters.oceanSide * 5 + 100, waterParameters.oceanSide * 5 + 100, waterParameters.oceanSide * 5 + 100),
        skyBoxMaterial
    );

    scene.add(skyBox);
}

// Terrain generated following THREE.Terrain instructions
// Availability: https://github.com/IceCreamYou/THREE.Terrain
function setTerrain() {

    // var mat = new THREE.MeshBasicMaterial({ color: 0x5566aa, wireframe: true });
    // Load textures
    var t1 = new THREE.TextureLoader().load('images/sand.jpg');
    t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
    t1.repeat.set(10, 10);
    var t2 = new THREE.TextureLoader().load('images/grass.jpg');
    t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
    t2.repeat.set(15, 15);
    var t3 = new THREE.TextureLoader().load('images/stone.jpg');
    t3.wrapS = t3.wrapT = THREE.RepeatWrapping;
    t3.repeat.set(10, 10);
    var t4 = new THREE.TextureLoader().load('images/snow.jpg');
    t4.wrapS = t4.wrapT = THREE.RepeatWrapping;
    t4.repeat.set(10, 10);
    // The function takes an array specifying textures to blend together and how to do so.
    // The `levels` property indicates at what height to blend the texture in and out.
    // The `glsl` property allows specifying a GLSL expression for texture blending.
    var material = THREE.Terrain.generateBlendedMaterial([
        // The first texture is the base; other textures are blended in on top.
        { texture: t1 },
        // Start blending in at height -80; opaque between -35 and 20; blend out by 50
        { texture: t2, levels: [5, 10, 20, 60] },
        { texture: t3, levels: [50, 60, 70, 85] },
        // How quickly this texture is blended in depends on its x-position.
        { texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)' },
        // Use this texture if the slope is between 27 and 45 degrees
        { texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' },
    ]);
    // THREE.Terrain.DiamondSquare,
    // Generate a terrain
    var xS = 63,
        yS = 63;
    terrainScene = THREE.Terrain({
        easing: THREE.Terrain.Linear,
        frequency: 2.5,
        heightmap: heightmapImage,
        material: material,
        maxHeight: 200,
        minHeight: -3,
        steps: 1,
        stretch: true,
        useBufferGeometry: false,
        xSegments: xS,
        xSize: 1024,
        ySegments: yS,
        ySize: 1024,
    });
    // Add the terrain to global scene
    scene.add(terrainScene);


    // Returns a canvas with the heightmap drawn on it.
    // Append to your document body to view; right click to save as a PNG image.
    // Note: doesn't work if you generated the terrain with `useBufferGeometry` set to `true`.
    var terrainCanvas = THREE.Terrain.toHeightmap(
        // terrainScene.children[0] is the most detailed version of the terrain mesh
        terrainScene.children[0].geometry.vertices, { xSegments: 63, ySegments: 63 }
    );


    // Optional:
    // Get the geometry of the terrain across which you want to scatter meshes
    var geo = terrainScene.children[0].geometry;

    // Load palm tree json file exported from Blender
    var loader = new THREE.JSONLoader();
    var tree;
    loader.load(
        'js/palmTree.json',
        function(geometry, materials) {
            // Transparent segments do not overlap with other leaves
            materials[1].alphaTest = 0.5;
            var mats = [materials[0], materials[1]]
            tree = new THREE.Mesh(geometry, mats);
            tree.name = "tree";
            decoScene = THREE.Terrain.ScatterMeshes(geo, {
                mesh: tree,
                w: xS,
                h: yS,
                spread: function(v, k) { return v.z > 2 && v.z < 20 && !(k % 10); },
                maxSlope: 0.43,
                randomness: Math.random,
            });
            terrainScene.add(decoScene);


        });
}

function setTree() {
    var tree;
    var loader = new THREE.JSONLoader();

    loader.load(
        'js/palmTree.json',
        function(geometry, materials) {
            var tree;
            // Transparent segments do not overlap with other leaves
            materials[1].alphaTest = 0.5;
            var mats = [materials[0], materials[1]]
            tree = new THREE.Mesh(geometry, mats);
            tree.position.set(0, 0, 0);
            // tree.receiveShadow = true;
            tree.name = "tree";
            scene.add(tree);
        },
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');

        },
        function(error) {
            console.log('Error in loading palm tree');
        }
    );
}

function setLighting() {

    renderer.shadowMap.enabled = true;

    light = new THREE.DirectionalLight(0xffffbb, 1);
    light.position.set(-30, 30, -30);
    light.castShadow = true;
    light.shadow.camera.top = 45;
    light.shadow.camera.right = 40;
    light.shadow.camera.left = light.shadow.camera.bottom = -40;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 200;

    scene.add(light, new THREE.AmbientLight(0x888888));

}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}



function animate() {
    requestAnimationFrame(animate);

    render();
}

function render() {
    var time = performance.now() * 0.001;


    water.material.uniforms.time.value += 1.0 / 60.0;
    water.material.uniforms.size.value = waterParameters.size;
    water.material.uniforms.distortionScale.value = waterParameters.distortionScale;
    water.material.uniforms.alpha.value = waterParameters.alpha;

    renderer.render(scene, camera);
}
