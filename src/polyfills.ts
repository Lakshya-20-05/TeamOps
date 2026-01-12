import { Buffer } from 'buffer';

// @ts-ignore
window.global = window;
// @ts-ignore
window.process = {
    env: { DEBUG: undefined },
    version: '',
    nextTick: (cb: any) => setTimeout(cb, 0)
};
// @ts-ignore
window.Buffer = Buffer;
