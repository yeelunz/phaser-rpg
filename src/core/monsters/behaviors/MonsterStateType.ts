export enum MonsterStateType {
    IDLE = 'idle',
    WANDERING = 'wandering', // Renamed from PATROL to align with state name
    ALERT = 'alert',       // New state
    CHASE = 'chase',
    ATTACKING = 'attacking',
    CHARGING = 'charging',
    SUMMONING = 'summoning',
    HURT = 'hurt',
    DEAD = 'dead'
}
