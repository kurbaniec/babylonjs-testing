import {Animation, AnimationGroup, CannonJSPlugin, Engine, Mesh, Observable, Scene, Vector3} from "@babylonjs/core";
import {Subject} from "../utils/Subject";
import {Observer} from "../utils/Observer";
import * as cannon from "cannon";
import {SimulationMesh} from "./SimulationMesh";

export class SimulationHelper implements Subject {
    private readonly scene: Scene;
    private readonly engine: Engine;
    private observers: Observer[] = [];
    private recording = false;
    private playback = false;
    private currentIndex = 0;
    private indexCount = 0;
    private snapshotCount = 60;
    private snapshotThreshold = 1000 / this.snapshotCount;
    private lastDeltaTime = 0;
    // Events
    private playbackPlayedPercent = 0.0;
    public onPlaybackChangeObservable: Observable<number>;
    public onPlaybackEndObservable: Observable<void>;
    // Simulation properties
    private framerate: number = 60;
    private animationGroup: AnimationGroup;
    private animationFrame: number;
    private animationStarted = false;
    private animationPaused = false;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;
        this.animationGroup = new AnimationGroup("SimulationPlayback", this.scene);
        this.onPlaybackChangeObservable = new Observable<number>();
        this.onPlaybackEndObservable = new Observable<void>();
        if (this.snapshotCount > this.framerate) {
            throw new Error("Snapshot Count cannot be greater than framerate")
        }
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
                this.indexCount++;
                for (const observer of this.observers) {
                    observer.update();
                }
            } else {
                this.lastDeltaTime = currentTime;
            }
        } else if (this.isPlayback) {
            if (!this.animationStarted) {
                // Initialize animations in SimulationMesh
                for (const observer of this.observers) {
                    observer.update();
                }
                this.animationGroup.onAnimationEndObservable.add(() => {
                    this.playback = false;
                    this.animationStarted = false;
                    this.playbackPlayedPercent = 0.0;
                    this.onPlaybackChangeObservable.notifyObservers(1.0);
                    this.onPlaybackEndObservable.notifyObservers();
                });
                this.animationGroup.play();
                this.animationStarted = true;
            }
            if (this.animationPaused) {
                // Resume animation if paused
                this.animationGroup.play();
                this.animationGroup.goToFrame(this.animationFrame);
                this.animationPaused = false;
            }

            if (!this.animationPaused &&
                this.animationGroup.animatables[0].masterFrame !== undefined) {
                // Get last frame & Notify observers for onPlaybackChangeObservable
                // See: https://forum.babylonjs.com/t/get-current-frame-of-animationgroup/10108/2
                this.animationFrame = this.animationGroup.animatables[0].masterFrame;
                // this.animationGroup.to marks the endframe
                // Calculate playback percentage
                this.playbackPlayedPercent = +(this.animationFrame / this.animationGroup.to).toFixed(2)
                this.onPlaybackChangeObservable.notifyObservers(this.playbackPlayedPercent)
                // Calculate current index
                this.currentIndex = Math.round(this.indexCount * this.playbackPlayedPercent);
            }
        } else {
            // Render current position via currentIndex
            for (const observer of this.observers) {
                observer.update();
            }
        }
    }

    set playbackValue(playbackTime: number) {
        this.currentIndex = Math.round(playbackTime * this.indexCount);
        this.animationFrame = Math.round(this.animationGroup.to * playbackTime);
        if (this.playback) {
            this.animationPaused = true;
            this.animationGroup.pause();
            console.log("Hey!!!", this.animationFrame, playbackTime);
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
        this.scene.disablePhysicsEngine();
        this.currentIndex = 0;
        this.recording = false;
    }

    startPlayback() {
        this.playback = true;
    }

    stopPlayback() {
        this.playback = false;
        this.animationPaused = true;
        this.animationGroup.pause();
    }

    addAnimation(animation: Animation, mesh: Mesh) {
        this.animationGroup.addTargetedAnimation(animation, mesh);
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

    get currentFrameRate(): number {
        return this.framerate;
    }
}
