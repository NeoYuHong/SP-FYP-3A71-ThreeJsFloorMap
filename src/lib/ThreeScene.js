import * as dat from 'dat.gui';

import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MapControls } from 'three/addons/controls/MapControls.js';

import skyHDR from '../assets/kloofendal_48d_partly_cloudy_puresky_1k.hdr';
import storeData from '../assets/data.json';
import floor1 from '../assets/floor1.glb';

function ThreeScene() {

    this.baseBorderSize = 25;

    this.data = {
        hovering: 'none',
        storeName: 'nil',
        storeDesc: 'nil',
        clientX: 0,
        clientY: 0
    };

    this.settings = {
        is2D: false,
        showGrid: false,
        borderSize: this.baseBorderSize
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(1, 1);
    this.intersects = [];

    this.prevObj = null;
    this.prevColor = null;
    this.floorScene = null;
}

ThreeScene.prototype.start = function () {

    this.addScene();
    this.addCamera();
    this.startRenderer();
    this.addControls();
    this.onResize();
    this.loadModel();
    this.addBorder();
    this.trackMouse();
    this.animate();

};

ThreeScene.prototype.addReflector = function () {
    // Reflector
    const geometry = new THREE.PlaneGeometry(100, 100);
    const groundReflector = new Reflector(geometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x777777
    });
    groundReflector.rotation.x = -Math.PI / 2;
    this.scene.add(groundReflector);
};

ThreeScene.prototype.addHDR = function () {
    const hdrLoader = new RGBELoader();
    hdrLoader.load(skyHDR, texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture; // Set as the scene's environment
        this.scene.background = texture; // Optional: Set as background
    });
};

ThreeScene.prototype.addStats = function () {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
};

ThreeScene.prototype.addScene = function () {
    this.scene = new THREE.Scene();
};
ThreeScene.prototype.addCamera = function () {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(13, 5, 10);
    this.camera.rotation.set(-1.1, 0, 0);
};

ThreeScene.prototype.addControls = function () {
    this.controls = new MapControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = (Math.PI / 2) * 0.75;
    this.controls.minPolarAngle = (Math.PI / 2) * 0.4;

    this.controls.target.set(10, 0, 4);
    this.controls.maxDistance = 25;
    this.controls.minDistance = 5.5;
    this.controls.zoomSpeed = 1.6;
    this.controls.update();
};

ThreeScene.prototype.addBorder = function () {
    this.minPan = new THREE.Vector3(-this.baseBorderSize, 0, -this.baseBorderSize);
    this.maxPan = new THREE.Vector3(this.baseBorderSize, 0, this.baseBorderSize);
    this._v = new THREE.Vector3();
    let controls = this.controls;
    let camera = this.camera;
    controls.addEventListener('change', () => {
        this._v.copy(controls.target);
        controls.target.clamp(this.minPan, this.maxPan);
        this._v.sub(controls.target);
        camera.position.sub(this._v);
    });

    this.grid = new THREE.GridHelper(this.baseBorderSize * 2, 100, 'white', 'white');
    this.grid.position.y = 0.01;
    this.grid.visible = this.settings.showGrid;

    this.scene.add(this.grid);
};

ThreeScene.prototype.loadModel = function () {
    const loader = new GLTFLoader();
    loader.load(floor1, gltf => {

        let model = gltf.scene.children[0];
        // Set texture encoding and tone mapping to mimic Eevee
        model.traverse(child => {
            if (child.isMesh) {
                // child.material.map.encoding = THREE.sRGBEncoding;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.floorScene = gltf.scene;

        this.scene.add(gltf.scene);
    },
        undefined,
        function (error) {
            console.error(error);
        }
    );
};

ThreeScene.prototype.trackMouse = function () {
    document.onmousemove = e => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.data.clientX = event.clientX;
        this.data.clientY = event.clientY;
    };
};

ThreeScene.prototype.onResize = function () {
    window.addEventListener('resize', () => {
        // Update the renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update the camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    });
};

ThreeScene.prototype.onHover = function (item) {
    const popup = document.getElementById('popup');

    if (!item) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.intersects = this.raycaster.intersectObject(item);

    if (this.intersects.length !== 0) {
        if (this.prevObj && this.prevColor && this.intersects[0].object != this.prevObj) {
            this.prevObj.material.color.set(this.prevColor);
            this.prevColor = null;
            this.prevObj = null;
        }

        let obj = this.intersects.find(obj => obj.object.userData.parent)?.object;

        if (!obj) {
            if (this.intersects[0].object.userData.id) this.data.hovering = this.intersects[0].object.userData.id;
            else this.data.hovering = this.intersects[0].object.name;
            this.data.storeName = 'nil';
            popup.style.display = 'none';
            return;
        }

        this.data.hovering = obj.userData.name;

        let test = storeData.find(({ unit_number }) => unit_number == obj.userData.name);
        this.data.storeName = test?.stores[0].store_name || 'nil';
        this.data.storeDesc = test?.stores[0].store_description || 'nil';
        // Set popup content
        popup.innerText = `Unit: ${obj.userData.name}\nStore name: ${test?.stores[0].store_name || 'nil'}\nStore desc: ${test?.stores[0].store_description || 'nil'}`;

        // Set popup position and show it
        popup.style.display = 'block';
        popup.style.left = `${this.data.clientX + 10}px`;
        popup.style.top = `${this.data.clientY + 10}px`;
        popup.style.display = 'block';

        // let obj = intersects[0].object;

        if (!this.prevColor) this.prevColor = new THREE.Color(obj.material.color);

        if (!this.prevObj) this.prevObj = obj;

        let newMat = obj.material.clone();
        newMat.color.set(0xffff00);
        obj.material = newMat;
    } else {
        if (this.prevObj && this.prevColor) this.prevObj.material.color.set(this.prevColor.getHex());

        popup.style.display = 'none';
        this.data.hovering = 'none';
        this.data.storeName = 'nil';
        this.data.storeDesc = 'nil';

        this.prevObj = null;
        this.prevColor = null;
    }
};

ThreeScene.prototype.addDebugGUI = function () {
    // Create gui for debug
    this.gui = new dat.GUI();

    // DATA GUI
    const guiData = this.gui.addFolder('Data');

    const hoveringDataGUI = guiData.add(this.data, 'hovering', 0, 3).name('Hovering over:').listen();
    const storeNameGUI = guiData.add(this.data, 'storeName').name('Store name:').listen();
    const storeDescGUI = guiData.add(this.data, 'storeDesc').name('Store desc:').listen();

    hoveringDataGUI.domElement.querySelector('input').disabled = true;
    storeNameGUI.domElement.querySelector('input').disabled = true;
    storeDescGUI.domElement.querySelector('input').disabled = true;

    guiData.open();

    // Settings GUI

    const guiSettings = this.gui.addFolder('Settings');
    guiSettings
        .add(this.settings, 'is2D')
        .name('2D')
        .onChange(value => {
            if (value) {
                this.controls.maxPolarAngle = (Math.PI / 2) * 0;
                this.controls.minPolarAngle = (Math.PI / 2) * 0;
                this.controls.maxDistance = 50;
                this.controls.minDistance = 5.5;
                this.controls.update();
            } else {
                this.controls.maxPolarAngle = (Math.PI / 2) * 0.75;
                this.controls.minPolarAngle = (Math.PI / 2) * 0.4;
                this.controls.maxDistance = 25;
                this.controls.minDistance = 5.5;
                this.controls.update();
            }
        });
    guiSettings
        .add(this.settings, 'showGrid')
        .name('Show Grid')
        .onChange(value => {
            this.grid.visible = value;
        });
    guiSettings
        .add(this.settings, 'borderSize', 20, 100)
        .name('Border Size')
        .onChange(value => {
            this.minPan.set(-value, 0, -value);
            this.maxPan.set(value, 0, value);
            this._v.copy(this.controls.target);
            this.controls.target.clamp(this.minPan, this.maxPan);
            this._v.sub(this.controls.target);
            this.camera.position.sub(this._v);

            // properly scale grid to match size
            this.grid.position.set(0, 0, 0);
            this.grid.scale.set(value / this.baseBorderSize, 1, value / this.baseBorderSize);
        });
    guiSettings.open();

    this.gui.open();
};

ThreeScene.prototype.addComposer = function (bloom = false) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (bloom) this.composer.addPass(new UnrealBloomPass());
    // composer.addPass(new UnrealBloomPass({ strength: 1.5, radius: 0.4, threshold: 0.85 }));
};

ThreeScene.prototype.addLight = function () {
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);

    const light2 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    this.scene.add(light2);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    // Spotlights for specific areas
    const spotlight = new THREE.SpotLight(0xffffff, 0.8);
    spotlight.position.set(10, 20, 10);
    spotlight.castShadow = true; // Enable shadows
    this.scene.add(spotlight);
};

ThreeScene.prototype.startRenderer = function () {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.querySelector('#floormap').appendChild(this.renderer.domElement);
};

ThreeScene.prototype.animate = function () {

    if (this.stats) {
        this.stats.begin(); // Begin stats measurement
        this.stats.end(); // End stats measurement
    }

    if (this.composer) {
        this.composer.render();
    }

    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.onHover(this.floorScene);
};

export { ThreeScene };
