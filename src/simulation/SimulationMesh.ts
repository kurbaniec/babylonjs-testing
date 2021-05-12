import {Observer} from "../utils/Observer";
import {Subject} from "../utils/Subject";
import {SimulationHelper} from "./SimulationHelper";
import {Mesh, PhysicsImpostor, Scene} from "@babylonjs/core";
import {SimPos, SimRot} from "./SimulationStore";

type InitFunc = (m: Mesh, s: Scene) => void;
type AfterInitFunc = (m: Mesh) => void;

export class SimulationMesh implements Observer {
    private readonly mesh: Mesh;
    private readonly physics: InitFunc;
    private readonly callback?: AfterInitFunc;
    private initialized = false;
    private readonly pos: SimPos[] = [];
    private readonly rot: SimRot[] = [];

    constructor(mesh: Mesh, physics: InitFunc, callback?: AfterInitFunc) {
        this.mesh = mesh;
        this.physics = physics;
        this.callback = callback;
    }

    update(subject: Subject): void {
        const subj = subject as SimulationHelper;
        if (subj.isRecording) {
            if (this.initialized == false) {
                console.log("Hey2");
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
            if (this.initialized == true) {
                this.initialized = false;
            }
        }

    }

}
