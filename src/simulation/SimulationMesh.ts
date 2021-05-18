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
    private animationIndex = 0;
    private pos: SimPos[] = [];
    private rot: SimRot[] = [];
    private animationInitialized = false;

    public subject: Subject;

    private get subj(): SimulationHelper {
        return this.subject as SimulationHelper;
    }

    public get currentIndex(): number {
        return this.animationIndex;
    }

    constructor(mesh: Mesh, physics: InitFunc, callback?: AfterInitFunc) {
        this.mesh = mesh;
        this.physics = physics;
        this.callback = callback;
    }

    update(): void {
        const subj = this.subj;
        if (subj.isRecording) {
            // Record simulation
            if (this.initialized == false) {
                this.pos = [];
                this.rot = [];
                this.physics(this.mesh, subj.currentScene);
                if (this.callback !== undefined) {
                    this.callback(this.mesh);
                }
                this.initialized = true;
            }
            this.pos.push(new SimPos(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z));
            this.rot.push(
                new SimRot(this.mesh.rotationQuaternion.x,
                    this.mesh.rotationQuaternion.y,
                    this.mesh.rotationQuaternion.z,
                    this.mesh.rotationQuaternion.w));
        } else if (subj.isPlayback) {
            /*
            // Used to rewind/forward playback
            if (this.subj.playbackChange) {
                this.animationIndex = this.subj.index;
            }
            // Reset mesh on scene
            if (this.initialized == true) {
                // Return to first position
                if (this.pos[0] !== undefined && this.rot[0] !== undefined) {
                    this.mesh.position = this.pos[0].toVector3();
                    this.mesh.rotationQuaternion = this.rot[0].toQuaternion();
                }
                this.initialized = false;
            }*/
            /*
            if (subj.isPlayback) {
                // Playback simulation
                if (!this.animationRunning) {
                    this.animationRunning = true;
                    this.runAnimation();
                }
            } else {
                // Stop simulation
                this.animationRunning = false;
            }*/
            if (subj.isPlayback && !this.animationInitialized) {
                this.initAnimation()
            }

        } else {
            if (this.pos[0] !== undefined && this.rot[0] !== undefined) {
                this.mesh.position = this.pos[0].toVector3();
                this.mesh.rotationQuaternion = this.rot[0].toQuaternion();
            }
        }
    }

    initAnimation(): void {
        const frameRate = 60;

        // Setup translation
        const translation = new Animation("translation", "position", frameRate,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const keyFramesPos = [];
        for (let i = 0; i < this.pos.length; i++) {
            keyFramesPos.push({
                frame: (frameRate / this.subj.currentSnapshotCount) * i,
                value: this.pos[i].toVector3()
            });
        }
        translation.setKeys(keyFramesPos);

        // Setup rotation
        const rotation = new Animation("rotation", "rotationQuaternion", frameRate,
            Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const keyFramesRot = [];
        for (let i = 0; i < this.rot.length; i++) {
            keyFramesRot.push({
                frame: (frameRate / this.subj.currentSnapshotCount) * i,
                value: this.rot[i].toQuaternion()
            });
        }
        rotation.setKeys(keyFramesRot);

        console.log(keyFramesPos);

        // Add animations to Animation Group of Simulation Helper
        //this.subj.addAnimation(translation, this.mesh);
        //this.subj.addAnimation(rotation, this.mesh);
        const endFrame = (frameRate / this.subj.currentSnapshotCount) * (this.pos.length - 1);
        this.subj.currentScene.beginDirectAnimation(this.mesh, [translation, rotation], 0, endFrame, false, undefined, () => {
            //this.animationIndex++;
            //this.runAnimation();
            console.log("Animation End");
        });

        this.animationInitialized = true;
    }

    runAnimation(): void {
        if (this.animationRunning) {
            if (this.pos[this.animationIndex] !== undefined && this.rot[this.animationIndex] !== undefined &&
                this.pos[this.animationIndex + 1] !== undefined && this.rot[this.animationIndex + 1] !== undefined) {

                const currentPos = this.pos[this.animationIndex].toVector3();
                const currentRot = this.rot[this.animationIndex].toQuaternion();

                const newPos = this.pos[this.animationIndex + 1].toVector3();
                const newRot = this.rot[this.animationIndex + 1].toQuaternion();

                // TODO this seems not exact
                // Animation is too slow...
                const frameRate = 60;
                const endFrame = frameRate / this.subj.currentSnapshotCount;

                // Translate all axes
                // See: https://stackoverflow.com/a/39081427
                const translation = new Animation("translation", "position", frameRate,
                    Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
                const keyFramesPos = [];
                keyFramesPos.push({
                    frame: 0,
                    value: currentPos,
                });
                // TODO Note: It seems that endFrame - 1 makes the animation go as fast as expected
                // Why? Maybe because it finishes before the end determined by endFrame in
                // beginDirectAnimation
                // Needs probably more investigation...
                keyFramesPos.push({
                    frame: endFrame - 1,
                    value: newPos,
                });
                translation.setKeys(keyFramesPos);

                // Rotate also all axes
                const rotation = new Animation("rotation", "rotationQuaternion", frameRate,
                    Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CONSTANT);
                const keyFramesRot = [];
                keyFramesRot.push({
                    frame: 0,
                    value: currentRot,
                });
                keyFramesRot.push({
                    frame: endFrame - 1,
                    value: newRot,
                });
                rotation.setKeys(keyFramesRot);

                // Combine animations
                // See: https://doc.babylonjs.com/divingDeeper/animation/combineAnimations
                // And: https://playground.babylonjs.com/#9WUJN#14
                this.subj.currentScene.beginDirectAnimation(this.mesh, [translation, rotation], 0, endFrame, false, undefined, () => {
                    this.animationIndex++;
                    this.runAnimation();
                });
            } else {
                this.animationRunning = false;
            }
        }
    }
}
