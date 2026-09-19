import type { KlipBridge } from '../../preload/index';

declare global {
  interface Window {
    klip: KlipBridge;
  }
}

export {};
