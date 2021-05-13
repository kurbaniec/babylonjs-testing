/**
 * The Observer interface declares the update method, used by subjects.
 * Based on: https://refactoring.guru/design-patterns/observer/typescript/example
 */
import {Subject} from "./Subject";

export interface Observer {
    // Subject itself
    subject: Subject;

    // Receive update from subject.
    update(): void;
}
