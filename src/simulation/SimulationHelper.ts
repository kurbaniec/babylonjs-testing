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
    private snapshotCount = 30;
    private snapshotThreshold = 1000 / this.snapshotCount;
    private lastDeltaTime = 0;
    // Used for example for sliders...
    private playbackChangeIndex = false;
    private playbackPlayedPercent = 0.0;
    public onPlaybackChangeObservable: Observable<number>;
    public onPlaybackEndObservable: Observable<void>;
    // *new* features
    // Rework animation
    private animationGroup: AnimationGroup;
    private animationFrame: number;
    private animStarted = false;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;
        this.animationGroup = new AnimationGroup("SimulationPlayback", this.scene);
        this.onPlaybackChangeObservable = new Observable<number>();
        this.onPlaybackEndObservable = new Observable<void>();
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
        } else if (this.isPlayback) {
            // Initialize animations on first playback
            //if (this.animationGroup.targetedAnimations.length == 0) {
            if (!this.animStarted) {
                for (const observer of this.observers) {
                    observer.update();
                }
                this.animationGroup.onAnimationEndObservable.add(() => {
                    console.log("Animation End");
                });

                //this.animationGroup.normalize(0, this.animationGroup.to);
                // this.animationGroup.start(false, undefined, 0, undefined, undefined);
                //this.scene.stopAllAnimations();
                //this.scene.animationGroups[0].start(false);
                this.animStarted = true;
            }
            // Get last frame
            //this.animationFrame = this.animationGroup.to;
            //console.log(this.animationFrame);
            /*
            // Get current animation index
            // Is a bit hacky and not idiomatic...
            if (this.observers[0] !== undefined) {
                // Note: SimulationMesh's currentIndex will always max out one before the full length count
                // This is because the animations always use an index i and an index i+1
                this.currentIndex = (this.observers[0] as SimulationMesh).currentIndex + 1;
                const playbackPlayed = +(this.currentIndex / this.indexCount).toFixed(2);
                if (this.playbackPlayedPercent !== playbackPlayed && !this.playbackChangeIndex) {
                    this.playbackPlayedPercent = playbackPlayed;
                    this.onPlaybackChangeObservable.notifyObservers(this.playbackPlayedPercent);
                    // Stop playback
                    if (this.playbackPlayedPercent === 1.0) {
                        this.playback = false;
                        this.currentIndex = 0;
                        this.playbackChangeIndex = true;
                        // Update SimulationMeshes to end their work...
                        for (const observer of this.observers) {
                            observer.update();
                        }
                        this.onPlaybackEndObservable.notifyObservers();
                    }
                }
            }
            // Flag that indicates that playback should be forwarded/rewind
            if (this.playbackChangeIndex) {
                this.playbackChangeIndex = false;
            }*/
        } else {
            // Reset position
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

    set playbackValue(playbackTime: number) {
        this.playbackChangeIndex = true;
        this.currentIndex = Math.round(playbackTime * this.indexCount);
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

    get playbackChange(): boolean {
        return this.playbackChangeIndex;
    }
}
