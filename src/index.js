import { ThreeScene } from './lib/ThreeScene';

const scene = new ThreeScene();

scene.start();

scene.addDebugGUI();
scene.addStats();
scene.addLight();

// scene.addComposer();
// scene.addReflector();
scene.addHDR();