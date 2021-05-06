import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    Engine,
    FreeCamera,
    HemisphericLight,
    Mesh,
    Scene, StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

class App {
    constructor() {
        // Example code based on
        // https://www.davrous.com/2017/12/22/babylon-js-vrexperiencehelper-create-fully-interactive-webvr-apps-in-2-lines-of-code/
        // And https://playground.babylonjs.com/#PVM80T#1

        const canvas = document.createElement("canvas");
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        let engine = null;
        let scene = null;
        let sceneToRender = null;
        const createDefaultEngine = function () {
            return new Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false});
        };
        let textblock;

        const createScene = function () {
            const scene = new Scene(engine);

            const camera = new FreeCamera("Camera", new Vector3(0, 0, -20), scene);
            camera.attachControl(canvas, true);
            const sunLight = new HemisphericLight("sunLight", new Vector3(0, 1, 0), scene);

            // Plane Mesh used for GUI elements
            const planeForMainMenu = Mesh.CreatePlane("planeForMainMenu", 20, scene);
            planeForMainMenu.position.y = 5;

            const planeForColorPicker = Mesh.CreatePlane("planeForColorPicker", 20, scene);
            planeForColorPicker.position.y = 5;
            planeForColorPicker.position.x = 20;

            // GUI
            const textureForMainMenu = GUI.AdvancedDynamicTexture.CreateForMesh(planeForMainMenu);
            const textureForColorPicker = GUI.AdvancedDynamicTexture.CreateForMesh(planeForColorPicker);

            const stackPanel = new GUI.StackPanel();
            stackPanel.top = "100px";
            textureForMainMenu.addControl(stackPanel);

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
            stackPanel.addControl(clickMeButton);

            textblock = new GUI.TextBlock();
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
            picker.onValueChangedObservable.add(function (value) { // value is a color3
                sphereMat.diffuseColor = value;
            });
            textureForColorPicker.addControl(picker);

            // Sphere material color will be updated by the value of the Color Picker
            const sphere = Mesh.CreateSphere("sphere", 12, 2, scene);
            sphere.position.x = 10;
            var sphereMat = new StandardMaterial("sphereMat", scene);
            sphere.material = sphereMat;

            var VRHelper = scene.createDefaultVRExperience();
            VRHelper.enableInteractions();

            return scene;
        };

        var addRadio = function (text, parent) {
            const button = new GUI.RadioButton();
            button.width = "40px";
            button.height = "40px";
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
            scene = createScene();
        }

        initFunction().then(() => {
            sceneToRender = scene
            engine.runRenderLoop(function () {
                if (sceneToRender && sceneToRender.activeCamera) {
                    sceneToRender.render();
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
