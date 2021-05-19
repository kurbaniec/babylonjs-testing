import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    AbstractMesh,
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
    VideoTexture, WebXRAbstractMotionController, WebXRDefaultExperience, WebXRExperienceHelper, WebXRInputSource,
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
        let xrHelper: WebXRDefaultExperience = null;
        let leftControllerMesh: AbstractMesh = null;
        let rightControllerMesh: AbstractMesh = null;
        let sceneToRender = null;
        const createDefaultEngine = function () {
            return new Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false});
        };

        const createScene = async function () {
            const scene = new Scene(engine);
            const simulationHelper = new SimulationHelper(scene, engine);

            const camera = new FreeCamera("Camera", new Vector3(0, 5, -35), scene);
            camera.attachControl(canvas, true);
            const sunLight = new HemisphericLight("sunLight", new Vector3(0, 1, 0), scene);

            // Plane Mesh used for GUI elements
            const planeForMainMenu = Mesh.CreatePlane("planeForMainMenu", 20, scene);
            planeForMainMenu.position.y = 15;

            // GUI
            const textureForMainMenu = GUI.AdvancedDynamicTexture.CreateForMesh(planeForMainMenu);
            const stackPanel = new GUI.StackPanel();
            stackPanel.top = "300px";
            textureForMainMenu.addControl(stackPanel);

            // Plan Button
            const planButton = GUI.Button.CreateSimpleButton("planButton", "Plan");
            planButton.width = 0.3;
            planButton.height = "100px";
            planButton.color = "white";
            planButton.fontSize = 50;
            planButton.background = "green";
            planButton.paddingTop = "50px";
            planButton.onPointerUpObservable.add(function () {
                if (!simulationHelper.isRecording) {
                    simulationHelper.startSimulation();
                    planButton.textBlock.text = "Stop";
                } else {
                    simulationHelper.stopSimulation();
                    //planButton.textBlock.text = "Plan";
                    planButton.background = "gray";
                    planButton.isEnabled = false;
                }
            });
            stackPanel.addControl(planButton);

            // Play/Pause Button
            const playButton = GUI.Button.CreateSimpleButton("playButton", "Play");
            playButton.width = 0.3;
            playButton.height = "100px";
            playButton.color = "white";
            playButton.fontSize = 50;
            playButton.background = "green";
            playButton.paddingTop = "50px";
            // Play/Pause playback on click
            playButton.onPointerUpObservable.add(function () {
                if (!simulationHelper.isPlayback) {
                    simulationHelper.startPlayback();
                    playButton.textBlock.text = "Stop";
                } else {
                    simulationHelper.stopPlayback();
                    playButton.textBlock.text = "Play";
                }
            });
            stackPanel.addControl(playButton);

            // Slider
            const slider = new GUI.Slider();
            slider.width = "350px";
            slider.height = "20px";
            slider.minimum = 0.0;
            slider.maximum = 1.0;
            slider.value = 0.0;

            // Update video when slider is manually moved
            let sliderUpdate = true;
            slider.onPointerDownObservable.add(() => {
                sliderUpdate = false;
            });
            // TODO use other event?
            // Is triggered when only hovering about the slider
            slider.onPointerOutObservable.add(() => {
                simulationHelper.playbackValue = slider.value;
                sliderUpdate = true;
            });
            // Move slider when playback time is updated
            simulationHelper.onPlaybackChangeObservable.add((value) => {
                if (sliderUpdate)
                    slider.value = value;
            });
            // Update button & SimulationHelper on playback end
            simulationHelper.onPlaybackEndObservable.add(() => {
                playButton.textBlock.text = "Play";
            });

            stackPanel.addControl(slider);

            const ball = Mesh.CreateSphere("ball", 5, 2, scene);
            ball.position.y = 2;
            const ball2 = Mesh.CreateSphere("ball2", 5, 2, scene);
            ball2.position.y = 1;
            ball2.position.x = 2;
            const ground = Mesh.CreateGround("ground", 32, 32, 2, scene);

            // SimulationHelper
            // Setup physics
            // Add ball to track
            simulationHelper.attach(new SimulationMesh(ball, (m: Mesh, s: Scene) => {
                // Why this weird syntax?
                // Well, when the physics engine gets disabled, everything needs to be setup again like the imposters
                // (I tried storing the PhysicsImposter object and re-assigning it to the mesh
                //  when the physics are restored but it did not work)
                m.physicsImpostor = new PhysicsImpostor(m, PhysicsImpostor.SphereImpostor, {
                    mass: 1,
                    restitution: 0.9
                }, s);
            }, (m: Mesh) => {
                // Apply force/impulse on ball
                m.physicsImpostor.applyImpulse(new Vector3(1, 20, -1), new Vector3(1, 2, 0));
            }));
            // Add ball2 to track
            simulationHelper.attach(new SimulationMesh(ball2, (m: Mesh, s: Scene) => {
                m.physicsImpostor = new PhysicsImpostor(m, PhysicsImpostor.SphereImpostor, {
                    mass: 1,
                    restitution: 0.9
                }, s);
            }, (m: Mesh) => {
                // Apply force/impulse on ball
                m.physicsImpostor.applyImpulse(new Vector3(1, 10, -1), new Vector3(1, 3, 0));
            }));
            // Add ground to track
            simulationHelper.attach(new SimulationMesh(ground, (m: Mesh, s: Scene) => {
                m.physicsImpostor = new PhysicsImpostor(m, PhysicsImpostor.BoxImpostor, {
                    mass: 0,
                    restitution: 0.9
                }, s);
            }));

            // VR config
            // @ts-ignore
            //xrHelper = await scene.createDefaultXRExperienceAsync();
            xrHelper = await WebXRDefaultExperience.CreateAsync(scene, undefined).then((defaultExperience) => {  //
                defaultExperience.input.onControllerAddedObservable.add((controller: WebXRInputSource) => {
                    // Get position
                    // See: https://forum.babylonjs.com/t/xr-experience-helper-and-camera-controller-positions/9628/12
                    if (controller.inputSource.handedness === "left") {
                        // TODO bind GUI to left controller
                        // TODO checkout this later on
                        // https://forum.babylonjs.com/t/how-to-get-the-position-and-rotation-of-xr-controllers/19576/3
                        // console.log(xrHelper.input.controllers);
                        leftControllerMesh = controller.grip;
                    } else if (controller.inputSource.handedness === "right") {
                        rightControllerMesh = controller.grip;
                    }
                    /*
                    // hands are controllers to; do not want to go do this code; when it is a hand
                    const isHand = controller.inputSource.hand;
                    if (isHand) return;*/

                    /*
                    controller.onMotionControllerInitObservable.add((motionController: WebXRAbstractMotionController) => {

                        console.log(motionController.rootMesh.position);
                        const isLeft = motionController.handedness === 'left';
                        if (isLeft) {
                            controller.onMeshLoadedObservable.add((mesh: AbstractMesh) => {
                                leftControllerMesh = mesh;
                            });
                        }

                    });*/
                });
            });


            const retVal: [Scene, SimulationHelper] = [scene, simulationHelper];
            return retVal;
        };

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
            [scene, simulationHelper] = await createScene();
        }

        initFunction().then(() => {
            sceneToRender = scene
            engine.runRenderLoop(function () {
                if (sceneToRender && sceneToRender.activeCamera) {
                    if (leftControllerMesh !== null) {
                        //console.log("Left controller: ", leftControllerMesh.position, leftControllerMesh.rotationQuaternion);
                    }
                    if (rightControllerMesh !== null) {
                        //console.log("Right controller position: ", rightControllerMesh.position);
                        //console.log("Right controller rotation: ", rightControllerMesh.rotationQuaternion);
                    }
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
