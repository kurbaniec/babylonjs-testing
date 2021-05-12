import {Observer} from "../utils/Observer";
import {Subject} from "../utils/Subject";
import {SimulationHelper} from "./SimulationHelper";
import {Mesh, PhysicsImpostor} from "@babylonjs/core";
import {SimPos, SimRot} from "./SimulationStore";

type CallbackFunc = (m: Mesh) => void;

export class SimulationMesh implements Observer {
    private readonly mesh: Mesh;
    private readonly physics: PhysicsImpostor;
    private readonly callback?: CallbackFunc;
    private readonly pos: SimPos[] = [];
    private readonly rot: SimRot[] = [];

    constructor(mesh: Mesh, physics: PhysicsImpostor, callback?: CallbackFunc) {
        this.mesh = mesh;
        this.physics = physics;
        this.callback = callback;
    }

    update(subject: Subject): void {
        //subject as SimulationHelper;
        this.pos.push(new SimPos(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z));
        this.rot.push(new SimRot(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z))
        // console.log(this.pos, this.rot)
    }

}
