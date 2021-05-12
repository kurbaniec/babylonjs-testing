/**
 * The Subject interface declares a set of methods for managing subscribers.
 * Based on: https://refactoring.guru/design-patterns/observer/typescript/example
 */
import {Observer} from "./Observer";

export interface Subject {
    // Attach an observer to the subject.
    attach(observer: Observer): void;

    // Detach an observer from the subject.
    detach(observer: Observer): void;

    // Notify all observers about an event.
    notify(): void;
}
