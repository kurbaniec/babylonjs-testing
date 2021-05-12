import {Engine, Scene} from "@babylonjs/core";
import {Subject} from "../utils/Subject";
import {Observer} from "../utils/Observer";

export class SimulationHelper implements Subject {
    private readonly scene: Scene;
    private readonly engine: Engine;
    private observers: Observer[] = [];
    private recording = true;
    private time = 0.0;
    private indexCount = 0;
    private snapshotCount = 3;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;
    }

    attach(observer: Observer): void {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    detach(observer: Observer): void {
        // Personal comment: JS / TS is just weird...
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1)
        }
    }

    notify(): void {
        const delta = this.engine.getDeltaTime();
        for (const observer of this.observers) {
            observer.update(this);
        }
    }
}
