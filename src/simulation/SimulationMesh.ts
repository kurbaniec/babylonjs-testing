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
    private pos: SimPos[] = [];
    private rot: SimRot[] = [];

    public subject: Subject;

    private get subj(): SimulationHelper {
        return this.subject as SimulationHelper;
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
            // Initialize animations
            this.initAnimation()
        } else {
            // Render mesh at current position & rotation
            const currentIndex = this.subj.index;
            if (this.pos[currentIndex] !== undefined && this.rot[currentIndex] !== undefined) {
                this.mesh.position = this.pos[currentIndex].toVector3();
                this.mesh.rotationQuaternion = this.rot[currentIndex].toQuaternion();
            }
        }
    }

    initAnimation(): void {
        const frameRate = this.subj.currentFrameRate;

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
        this.subj.addAnimation(translation, this.mesh);
        this.subj.addAnimation(rotation, this.mesh);
    }
}
