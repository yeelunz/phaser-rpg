import { IMonsterEntity } from "../IMonsterEntity";
import { MonsterStateType } from "./MonsterStateType";
import { BaseState } from "./movement/BaseState";

export class MonsterStateMachine {
    private monster: IMonsterEntity;
    private states: Map<MonsterStateType, BaseState> = new Map();
    private currentState: BaseState | null = null;

    constructor(monster: IMonsterEntity) {
        this.monster = monster;
    }

    registerState(state: BaseState): void {
        this.states.set(state.type, state);
    }    setInitialState(stateType: MonsterStateType): void {
        if (this.states.has(stateType)) {
            this.currentState = this.states.get(stateType)!;
            this.currentState.enter();
            this.monster.setCurrentState(this.currentState.type); 
        } else {
            console.error(`Initial state ${stateType} not registered.`);
        }
    }

    changeState(newStateKey: MonsterStateType): void {
        if (this.currentState?.type === newStateKey) return;

        const newState = this.states.get(newStateKey);
        if (newState) {
            this.currentState?.exit();
            this.currentState = newState;
            this.currentState.enter();
            this.monster.setCurrentState(this.currentState.type);
        } else {
            console.warn(`State ${newStateKey} not registered.`);
        }
    }    update(delta: number, playerPosition: { x: number; y: number }): void {
        this.currentState?.update(delta, playerPosition);
    }

    handleDamaged(sourcePosition: { x: number; y: number }): void {
        if (this.currentState?.handleDamage) {
            this.currentState.handleDamage(sourcePosition);
        } else {
            // Default damage handling: switch to HURT state if available, then back to CHASE or ALERT
            if (this.states.has(MonsterStateType.HURT)) {
                this.changeState(MonsterStateType.HURT);
                // Potentially set a timer to switch back, or handle in HURT state's update
            } 
        }
    }

    getCurrentStateType(): MonsterStateType | undefined {
        return this.currentState?.type;
    }
}
