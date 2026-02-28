import EventEmitter from 'eventemitter3'
import type { EventMap } from './types'

const globalForEvents = globalThis as unknown as { eventBus: EventEmitter<EventMap> }

export const eventBus = globalForEvents.eventBus || new EventEmitter<EventMap>()

if (process.env.NODE_ENV !== 'production') globalForEvents.eventBus = eventBus
