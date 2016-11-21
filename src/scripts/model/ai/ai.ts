import {Shape} from '../board/shape';
import {MAX_COLS} from '../board/board';
import {Cell} from '../../domain/cell';
import {Color} from '../../domain/color';
import {eventBus, EventType} from '../../event/event-bus';
import {PlayerMovement} from '../../domain/player-movement';
import {PlayerType} from '../../domain/player-type';
import {PlayerMovementEvent} from '../../event/player-movement-event';

const TIME_BETWEEN_MOVES = 250;
const TIME_MAX_DEVIATION = 100;

interface ZombieBoard {
    // Ways to interact with it.
    moveShapeLeft(): boolean;
    moveShapeRight(): boolean;
    moveShapeDown(): boolean;
    moveShapeDownAllTheWay(): void;
    moveToTop(): void;
    rotateShapeClockwise(): boolean;
    convertShapeToCells(): void;
    undoConvertShapeToCells(): void;

    // Ways to derive information from it.
    getCurrentShapeColIdx(): number;
    calculateAggregateHeight(): number;
    calculateCompleteLines(): number;
    calculateHoles(): number;
    calculateBumpiness(): number;
}

interface RealBoard extends ZombieBoard {
    cloneZombie(): ZombieBoard;
}

export class Ai {

    private realBoard: RealBoard;
    private timeUntilNextMove: number;

    // 0 = no rotation, 1 = one rotation, 2 = two rotations, 3 = three rotations.
    private targetRotation: number;
    private currentRotation: number;
    private targetColIdx: number;
    // Prevent AI from doing anything while the piece is waiting to "lock" into the matrix.
    private moveCompleted: boolean;

    constructor(realBoard: RealBoard) {
        this.realBoard = realBoard;
        this.timeUntilNextMove = TIME_BETWEEN_MOVES;

        this.targetRotation = 0;
        this.currentRotation = 0;
        this.targetColIdx = 0;
        this.moveCompleted = false;
    }

    start() {
        //
    }

    step(elapsed: number) {
        this.timeUntilNextMove -= elapsed;
        if (this.timeUntilNextMove <= 0) {
            this.timeUntilNextMove = TIME_BETWEEN_MOVES;
            this.advanceTowardsTarget();
        }
    }

    /**
     * This method provides a high-level view of the AI's thought process.
     */
    strategize() {
        let zombie = this.realBoard.cloneZombie();

        // Iterate through all possible rotations and columns
        let bestFitness = Number.MIN_SAFE_INTEGER;
        let bestRotation = 0;
        let bestColIdx = 0;
        for (let rotation = 0; rotation < 4; rotation++) {
            while(zombie.moveShapeLeft());

            for (let idx = 0; idx < MAX_COLS; idx++) {
                zombie.moveShapeDownAllTheWay();
                zombie.convertShapeToCells();

                let fitness = this.calculateFitness(zombie);
                // console.log('fitness: ' + fitness + ', rotation: ' + rotation + ', col: ' + colIdx);
                if (fitness > bestFitness) {
                    bestFitness = fitness;
                    bestRotation = rotation;
                    bestColIdx = zombie.getCurrentShapeColIdx(); // Use this rather than idx in case it was off because of whatever reason (obstruction, wall, etc...)
                }

                zombie.undoConvertShapeToCells();
                zombie.moveToTop();
                let canMoveRight = zombie.moveShapeRight();
                if (canMoveRight === false) {
                    break;
                }
            }
            zombie.rotateShapeClockwise();
        }
        // console.log('bestFitness: %f, %d, %d', bestFitness, bestRotation, bestColIdx);

        // Finally, set the values that will let the AI advance towards the target.
        this.targetRotation = bestRotation;
        this.currentRotation = 0;
        this.targetColIdx = bestColIdx;
        this.moveCompleted = false;
    }

    /**
     * Based on https://codemyroad.wordpress.com/2013/04/14/tetris-ai-the-near-perfect-player/
     */
    private calculateFitness(zombie: ZombieBoard) {
        let aggregateHeight = zombie.calculateAggregateHeight();
        let completeLines = zombie.calculateCompleteLines();
        let holes = zombie.calculateHoles();
        let bumpiness = zombie.calculateBumpiness();
        let fitness = (-0.510066 * aggregateHeight)
                    + ( 0.760666 * completeLines)
                    + (-0.35663  * holes)
                    + (-0.184483 * bumpiness);
        return fitness;
    }

    private advanceTowardsTarget() {
        if (this.moveCompleted === true) {
            return;
        }

        if (this.currentRotation === this.targetRotation && this.realBoard.getCurrentShapeColIdx() === this.targetColIdx) {
            // TODO: Drop shape should be on a timer or something.
            this.realBoard.moveShapeDownAllTheWay();
            this.currentRotation = 0;
            this.targetColIdx = 0;
            this.moveCompleted = true;
        } else {
            if (this.currentRotation < this.targetRotation) {
                this.realBoard.rotateShapeClockwise();
                this.currentRotation++;
            }

            if (this.realBoard.getCurrentShapeColIdx() < this.targetColIdx) {
                this.realBoard.moveShapeRight();
            } else if (this.realBoard.getCurrentShapeColIdx() > this.targetColIdx) {
                this.realBoard.moveShapeLeft();
            }
        }
    }

    // private performNewMovement() {
        // let matrix = this.visual.matrix;
        // let shape = this.visual.currentShape;

        // let rand = Math.floor(Math.random() * 5);

        // if (rand === 0) {
        //     eventBus.fire(new PlayerMovementEvent(PlayerMovement.RotateClockwise, PlayerType.Ai));
        // } else if (rand === 1) {
        //     eventBus.fire(new PlayerMovementEvent(PlayerMovement.Left, PlayerType.Ai));
        // } else if (rand === 2) {
        //     eventBus.fire(new PlayerMovementEvent(PlayerMovement.Right, PlayerType.Ai));
        // } else if (rand === 3) {
        //     eventBus.fire(new PlayerMovementEvent(PlayerMovement.Down, PlayerType.Ai));
        // } else if (rand === 4) {
        //     let dropChance = Math.floor(Math.random() * 100); // Is this called Monte-Carlo?
        //     if (dropChance < 10) {
        //         eventBus.fire(new PlayerMovementEvent(PlayerMovement.Drop, PlayerType.Ai));
        //     } else {
        //         // Do nothing this round; maybe considered a hesitation.
        //     }
        // } else {
        //     console.log('should not get here');
        // }
    // }

    private calculateTimeUntilNextMove() {
        return Math.floor(TIME_BETWEEN_MOVES + ((Math.random() * TIME_MAX_DEVIATION) - (TIME_MAX_DEVIATION / 2)));
    }
}