import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    CannonJSPlugin,
    Color3,
    Engine,
    FreeCamera,
    HemisphericLight,
    Mesh,
    MeshBuilder, PhysicsImpostor,
    Scene,
    StandardMaterial,
    Vector3,
    VideoTexture,
} from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as cannon from "cannon";
import {SimulationHelper} from "./simulation/SimulationHelper";
import {SimulationMesh} from "./simulation/SimulationMesh";

class App {
    constructor() {
        // Example code based on
        // https://www.davrous.com/2017/12/22/babylon-js-vrexperiencehelper-create-fully-interactive-webvr-apps-in-2-lines-of-code/
        // And https://playground.babylonjs.com/#PVM80T#1

        const canvas = document.createElement("canvas");
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        let engine: Engine = null;
        let scene: Scene = null;
        let simulationHelper: SimulationHelper = null;
        let sceneToRender = null;
        const createDefaultEngine = function () {
            return new Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false});
        };
        let textblock;

        const createScene = function () {
            const scene = new Scene(engine);
            const simulationHelper = new SimulationHelper(scene, engine);

            const camera = new FreeCamera("Camera", new Vector3(0, 5, -25), scene);
            camera.attachControl(canvas, true);
            const sunLight = new HemisphericLight("sunLight", new Vector3(0, 1, 0), scene);

            // Plane Mesh used for GUI elements
            const planeForMainMenu = Mesh.CreatePlane("planeForMainMenu", 20, scene);
            planeForMainMenu.position.y = 15;

            const planeForColorPicker = Mesh.CreatePlane("planeForColorPicker", 20, scene);
            planeForColorPicker.position.y = 5;
            planeForColorPicker.position.x = 20;

            // GUI
            const textureForMainMenu = GUI.AdvancedDynamicTexture.CreateForMesh(planeForMainMenu);
            const textureForColorPicker = GUI.AdvancedDynamicTexture.CreateForMesh(planeForColorPicker);

            const stackPanel = new GUI.StackPanel();
            stackPanel.top = "300px";
            textureForMainMenu.addControl(stackPanel);

            /*
            const clickMeButton = GUI.Button.CreateSimpleButton("clickMeButton", "Click Me");
            clickMeButton.width = 1;
            clickMeButton.height = "100px";
            clickMeButton.color = "white";
            clickMeButton.fontSize = 50;
            clickMeButton.background = "green";
            clickMeButton.onPointerUpObservable.add(function () {
                if (VRHelper) {
                    VRHelper.displayLaserPointer = !VRHelper.displayLaserPointer;
                }
            });
            stackPanel.addControl(clickMeButton);*/

            /*textblock = new GUI.TextBlock();
            textblock.height = "150px";
            textblock.fontSize = 100;
            textblock.text = "please pick an option:";
            stackPanel.addControl(textblock);

            addRadio("option 1", stackPanel);
            addRadio("option 2", stackPanel);
            addRadio("option 3", stackPanel);
            addRadio("option 4", stackPanel);
            addRadio("option 5", stackPanel);

            const picker = new GUI.ColorPicker();
            picker.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            picker.height = "450px";
            picker.width = "450px";
            const sphereMat = new StandardMaterial("sphereMat", scene);
            picker.onValueChangedObservable.add(function (value) { // value is a color3
                sphereMat.diffuseColor = value;
            });
            textureForColorPicker.addControl(picker);

            // Sphere material color will be updated by the value of the Color Picker
            const sphere = Mesh.CreateSphere("sphere", 12, 2, scene);
            sphere.position.x = 10;
            sphere.material = sphereMat;*/

            // Video
            const planeForVideo = MeshBuilder.CreatePlane("planeForVideo", {
                height: 1920 / 100,
                width: 1080 / 100,
                sideOrientation: Mesh.DOUBLESIDE
            }, scene);
            const videoMat = new StandardMaterial("videoMat", scene);
            const videoTexture = new VideoTexture("video", "textures/video.mp4", scene);
            videoTexture.video.autoplay = false;
            videoTexture.video.muted = true;
            videoMat.diffuseTexture = videoTexture;
            videoMat.emissiveColor = new Color3(1, 1, 1);

            planeForVideo.material = videoMat;
            planeForVideo.position.y = 0;
            planeForVideo.position.x = 0;
            planeForVideo.position.z = 5;

            // Play/Pause Button
            const videoButton = GUI.Button.CreateSimpleButton("videoButton", "Play");
            videoButton.width = 0.3;
            videoButton.height = "100px";
            videoButton.color = "white";
            videoButton.fontSize = 50;
            videoButton.background = "green";
            videoButton.paddingTop = "50px";
            // Play/Pause playback on click
            videoButton.onPointerUpObservable.add(function () {
                if (videoTexture.video.paused) {
                    videoTexture.video.play();
                    simulationHelper.startSimulation();
                    videoButton.textBlock.text = "Stop";
                } else {
                    videoTexture.video.pause();
                    simulationHelper.stopSimulation();
                    videoButton.textBlock.text = "Play";
                }

            });
            stackPanel.addControl(videoButton);

            // Slider
            const slider = new GUI.Slider();
            slider.width = "350px";
            slider.height = "20px";
            slider.minimum = 0.0;
            slider.maximum = 1.0;
            slider.value = 0.0;
            // Update video when slider is manually moved
            slider.onPointerUpObservable.add(() => {
                const duration = videoTexture.video.duration;
                let skipTo = slider.value * duration;
                if (!isNaN(skipTo)) videoTexture.video.currentTime = skipTo;
            });
            // Move slider when video time is updated
            videoTexture.video.addEventListener("timeupdate", function () {
                slider.value = videoTexture.video.currentTime / videoTexture.video.duration;
            });

            stackPanel.addControl(slider);

            const ball = Mesh.CreateSphere("ball", 10, 2, scene);
            ball.position.y = 2;
            const ground = Mesh.CreateGround("ground", 32, 32, 2, scene);

            /**
             // Setup physics
             // See: https://doc.babylonjs.com/divingDeeper/physics/usingPhysicsEngine
             // And: https://forum.babylonjs.com/t/cannon-js-npm-cannon-is-not-defined-in-v4-0-0-alpha-21-but-works-in-v4-0-0-alpha-16/844
             const gravityVector = new Vector3(0, -9.81, 0);
             const physicsPlugin = new CannonJSPlugin(true, 10, cannon);
             scene.enablePhysics(gravityVector, physicsPlugin);

             // To allow physics on an object it needs a physics imposter
             const ballPhysics = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, {
                mass: 1,
                restitution: 0.9
            }, scene);
             ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, {
                mass: 1,
                restitution: 0.9
            }, scene);
             ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
                mass: 0,
                restitution: 0.9
            }, scene);

             // Apply force/impulse on ball
             //ball.physicsImpostor.applyImpulse(new Vector3(1, 20, -1), new Vector3(1, 2, 0))

             scene.disablePhysicsEngine();*/

            // SimulationHelper
            // Add ball to track
            simulationHelper.attach(new SimulationMesh(ball, (m: Mesh, s: Scene) => {
                // Why this weird syntax?
                // Well, when the physics engine gets disabled, everything needs to be setup again like the imposters
                // (I tried storing the PhysicsImposter object and re-assigning it to the mesh,
                //  when the physics are restored but it did not work)
                m.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, {
                    mass: 1,
                    restitution: 0.9
                }, s);
            }, (m: Mesh) => {
                // Apply force/impulse on ball
                console.log("Hey3");
                m.physicsImpostor.applyImpulse(new Vector3(1, 20, -1), new Vector3(1, 2, 0));
            }));
            // Add ground to track
            simulationHelper.attach(new SimulationMesh(ground, (m: Mesh, s: Scene) => {
                m.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
                    mass: 0,
                    restitution: 0.9
                }, s);
            }));

            // VR config
            const VRHelper = scene.createDefaultVRExperience();
            VRHelper.enableInteractions();

            const retVal: [Scene, SimulationHelper] = [scene, simulationHelper];
            return retVal;
        };

        const addRadio = function (text, parent) {
            const button = new GUI.RadioButton();
            button.width = "10px";
            button.height = "10px";
            button.color = "white";
            button.background = "green";
            button.onIsCheckedChangedObservable.add(function (state) {
                if (state) {
                    textblock.text = "You selected " + text;
                }
            });
            const header = GUI.Control.AddHeader(button, text, "400px", {isHorizontal: true, controlFirst: true});
            header.height = "100px";
            header.children[1].fontSize = 80;
            header.children[1].onPointerUpObservable.add(function () {
                button.isChecked = !button.isChecked;
            });
            parent.addControl(header);
        }

        async function initFunction() {
            const asyncEngineCreation = async function () {
                try {
                    return createDefaultEngine();
                } catch (e) {
                    console.log("the available createEngine function failed. Creating the default engine instead");
                    return createDefaultEngine();
                }
            };

            engine = await asyncEngineCreation();
            if (!engine) throw 'engine should not be null.';
            [scene, simulationHelper] = createScene();
        }

        initFunction().then(() => {
            sceneToRender = scene
            engine.runRenderLoop(function () {
                if (sceneToRender && sceneToRender.activeCamera) {
                    sceneToRender.render();
                    simulationHelper.notify();
                }
            });
        });

        // Resize
        window.addEventListener("resize", function () {
            engine.resize();
        });
    }
}

new App();
