/**
 * The Observer interface declares the update method, used by subjects.
 * Based on: https://refactoring.guru/design-patterns/observer/typescript/example
 */
import {Subject} from "./Subject";

export interface Observer {
    // Receive update from subject.
    update(subject: Subject): void;
}
