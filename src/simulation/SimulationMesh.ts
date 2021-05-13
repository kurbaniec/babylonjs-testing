import {Observer} from "../utils/Observer";
import {Subject} from "../utils/Subject";
import {SimulationHelper} from "./SimulationHelper";
import {Mesh, Animation, PhysicsImpostor, Scene, Vector3} from "@babylonjs/core";
import {SimPos, SimRot} from "./SimulationStore";

type InitFunc = (m: Mesh, s: Scene) => void;
type AfterInitFunc = (m: Mesh) => void;

export class SimulationMesh implements Observer {
    private readonly mesh: Mesh;
    private readonly physics: InitFunc;
    private readonly callback?: AfterInitFunc;
    private initialized = false;
    private animationRunning = false;

    // TODO get this from subject or update subject
    private animationIndex = 0;

    private pos: SimPos[] = [];
    private rot: SimRot[] = [];

    constructor(mesh: Mesh, physics: InitFunc, callback?: AfterInitFunc) {
        this.mesh = mesh;
        this.physics = physics;
        this.callback = callback;
    }

    update(subject: Subject): void {
        const subj = subject as SimulationHelper;
        if (subj.isRecording) {
            // Record simulation
            if (this.initialized == false) {
                console.log("Hey2");
                this.pos = [];
                this.rot = [];
                this.physics(this.mesh, subj.currentScene);
                if (this.callback !== undefined) {
                    this.callback(this.mesh);
                }
                this.initialized = true;
            }
            this.pos.push(new SimPos(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z));
            this.rot.push(new SimRot(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z));
            // console.log(this.pos, this.rot);
        } else {
            // Reset mesh on scene
            if (this.initialized == true) {
                // Return to first position
                if (this.pos[0] !== undefined && this.rot[0] !== undefined) {
                    this.mesh.position = this.pos[0].toVector3();
                    this.mesh.rotation = this.rot[0].toVector3();
                }
                this.initialized = false;
            }
            // Playback simulation
            if (subj.isPlayback) {
                if (!this.animationRunning &&
                    this.pos[this.animationIndex] !== undefined && this.rot[this.animationIndex] !== undefined &&
                    this.pos[this.animationIndex + 1] !== undefined && this.rot[this.animationIndex + 1] !== undefined) {

                    const currentPos = this.pos[this.animationIndex].toVector3();
                    const currentRot = this.rot[this.animationIndex].toVector3();

                    const newPos = this.pos[this.animationIndex + 1].toVector3();
                    const newRot = this.rot[this.animationIndex + 1].toVector3();

                    const frameRate = 100;
                    const endFrame = 100 / subj.currentSnapshotCount;

                    // Translate all axes
                    // See: https://stackoverflow.com/a/39081427
                    const translation = new Animation("translation", "position", frameRate,
                        Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                    const keyFramesPos = [];
                    keyFramesPos.push({
                        frame: 0,
                        value: currentPos,
                    });
                    keyFramesPos.push({
                        frame: endFrame,
                        value: newPos,
                    });
                    translation.setKeys(keyFramesPos);

                    // Rotate also all axes
                    const rotation = new Animation("rotation", "rotation", frameRate,
                        Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                    const keyFramesRot = [];
                    keyFramesRot.push({
                        frame: 0,
                        value: currentRot,
                    });
                    keyFramesRot.push({
                        frame: endFrame,
                        value: newRot,
                    });
                    rotation.setKeys(keyFramesRot);

                    // Combine animations
                    // See: https://doc.babylonjs.com/divingDeeper/animation/combineAnimations
                    // And: https://playground.babylonjs.com/#9WUJN#14
                    this.animationRunning = true;
                    subj.currentScene.beginDirectAnimation(this.mesh, [translation, rotation], 0, endFrame, false, undefined, () => {
                        this.animationRunning = false;
                    });

                    this.animationIndex++;
                }
            }
        }

    }

}
