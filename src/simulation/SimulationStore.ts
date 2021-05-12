import {Vector3} from "@babylonjs/core";

export class SimPos {
    public x: number;
    public y: number;
    public z: number;


    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toVector3(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
}

export class SimRot {
    public x: number;
    public y: number;
    public z: number;


    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toVector3(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
}
