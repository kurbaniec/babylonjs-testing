import {CannonJSPlugin, Engine, Scene, Vector3} from "@babylonjs/core";
import {Subject} from "../utils/Subject";
import {Observer} from "../utils/Observer";
import * as cannon from "cannon";

export class SimulationHelper implements Subject {
    private readonly scene: Scene;
    private readonly engine: Engine;
    private observers: Observer[] = [];
    private recording = false;
    private playback = false;
    private currentIndex = 0;
    private indexCount = 0;
    private snapshotCount = 30;
    private snapshotThreshold = 1000 / this.snapshotCount;
    private lastDeltaTime = 0;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;
    }

    attach(observer: Observer): void {
        if (!this.observers.includes(observer)) {
            observer.subject = this;
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
        if (this.isRecording) {
            // Trigger only every x times (determined by snapshotThreshold) in one second
            const currentTime = this.lastDeltaTime + this.engine.getDeltaTime();
            if (currentTime > this.snapshotThreshold) {
                this.lastDeltaTime = currentTime - this.snapshotThreshold;
                // console.log(this.lastDeltaTime);
                this.indexCount++;
                for (const observer of this.observers) {
                    observer.update();
                }
            } else {
                this.lastDeltaTime = currentTime;
            }
        } else {
            for (const observer of this.observers) {
                observer.update();
            }
        }
    }

    startSimulation() {
        this.recording = true;
        // Setup physics
        // See: https://doc.babylonjs.com/divingDeeper/physics/usingPhysicsEngine
        // And: https://forum.babylonjs.com/t/cannon-js-npm-cannon-is-not-defined-in-v4-0-0-alpha-21-but-works-in-v4-0-0-alpha-16/844
        const gravityVector = new Vector3(0, -9.81, 0);
        const physicsPlugin = new CannonJSPlugin(true, 10, cannon);
        this.scene.enablePhysics(gravityVector, physicsPlugin);
        console.log(this.scene.physicsEnabled);
        console.log("Hey!");
    }

    stopSimulation() {
        this.recording = false;
        this.scene.disablePhysicsEngine();
    }

    startPlayback() {
        this.playback = true;
    }

    stopPlayback() {
        this.playback = false;
    }

    restart() {
        this.recording = false;
        this.playback = false;
        this.currentIndex = 0;
        this.indexCount = 0;
        this.snapshotCount = 3;
        this.snapshotThreshold = 1000 / this.snapshotCount;
        this.lastDeltaTime = 0;
    }

    get isRecording(): boolean {
        return this.recording;
    }

    get isPlayback(): boolean {
        return this.playback;
    }

    get index(): number {
        return this.currentIndex;
    }

    get currentScene(): Scene {
        return this.scene;
    }

    get currentSnapshotCount(): number {
        return this.snapshotCount;
    }
}
