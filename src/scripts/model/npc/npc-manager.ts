/// <reference path='../../../../node_modules/typescript/lib/lib.es6.d.ts'/>

import {Npc} from './npc'
import {NpcLocation, FocusPoint} from './npc-location';
import {eventBus, EventType} from '../../event/event-bus';
import {StandeeMovementEndedEvent} from '../../event/standee-movement-ended-event';
import {NpcPlacedEvent} from '../../event/npc-placed-event';
import {TOTAL_NPCS, crowdTimer} from './crowd-timer';

class NpcManager {

    private npcs: Map<number, Npc>;

    private npcsOffscreen: Npc[];
    private npcsInPlay: Npc[];

    constructor() {
        this.npcs = new Map<number, Npc>();

        this.npcsOffscreen = [];
        this.npcsInPlay = [];
    }

    start() {
        eventBus.register(EventType.StandeeMovementEndedEventType, (event: StandeeMovementEndedEvent) => {
            this.handleStandeeMovementEndedEvent(event);
        });

        for (let npcIdx = 0; npcIdx < TOTAL_NPCS; npcIdx++) {
            let npc = new Npc(() => {
                this.determineNewCommand(npc);
            });
            // Place out of view.
            let x = -5
            let y = 15
            npc.start(x, y);

            this.npcs.set(npc.id, npc);
            this.npcsOffscreen.push(npc);
        }

        crowdTimer.start();
    }

    step(elapsed: number) {
        let expectedInPlay = crowdTimer.step(elapsed);
        this.ensureInPlayNpcCount(expectedInPlay);

        this.npcsInPlay.forEach((npc: Npc) => {
            npc.step(elapsed);
        });
    }

    private ensureInPlayNpcCount(expectedInPlay: number) {
        if (this.npcsInPlay.length < expectedInPlay) {
            let diff = expectedInPlay - this.npcsInPlay.length;
            for (let count = 0; count < diff; count++) {
                this.sendAnOffscreenNpcIntoPlay();
            }
        }
    }

    private sendAnOffscreenNpcIntoPlay() {
        let npc = this.npcsOffscreen.pop();
        if (npc != null) {
            this.npcsInPlay.push(npc);

            // Move it to one of the off screen locations.
            {
                let offscreen = Math.floor(Math.random() * 2);
                if (offscreen == 0) {
                    npc.teleportTo(NpcLocation.OffLeft);
                } else {
                    npc.teleportTo(NpcLocation.OffRight);
                }
            }

            // Set its target
            {
                npc.addWaypoint(NpcLocation.BuildingMiddle);
            }
        }
    }

    private handleStandeeMovementEndedEvent(event: StandeeMovementEndedEvent) {
        let npc = this.npcs.get(event.npcId);
        if (npc != null) {
            let x = event.x;
            let y = event.z;
            npc.updatePosition(x, y);
        }
    }

    private determineNewCommand(npc: Npc) {
        // TODO: Determine what the npc should do now.
        npc.standFacing(FocusPoint.BuildingLeft, 20000);
    }
}
export const npcManager = new NpcManager();