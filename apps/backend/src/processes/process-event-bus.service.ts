import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface ProcessCompletedPayload {
  instanceId: string;
  variables: Record<string, unknown>;
}

@Injectable()
export class ProcessEventBus {
  private readonly emitter = new EventEmitter();

  emitCompleted(payload: ProcessCompletedPayload): void {
    this.emitter.emit('process.completed', payload);
  }

  onCompleted(handler: (payload: ProcessCompletedPayload) => void): void {
    this.emitter.on('process.completed', handler);
  }

  offCompleted(handler: (payload: ProcessCompletedPayload) => void): void {
    this.emitter.off('process.completed', handler);
  }
}
