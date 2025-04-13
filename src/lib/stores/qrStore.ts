import { writable } from 'svelte/store';

type QRStore = {
    url: string;
    size: number;
    margin: number;
    color: string;
    backgroundColor: string;
    logo?: string;
    dotsStyle: 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';
    cornersStyle: 'square' | 'dot' | 'extra-rounded';
};

const defaultState: QRStore = {
    url: '',
    size: 300,
    margin: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
    dotsStyle: 'square',
    cornersStyle: 'square'
};

function createQRStore() {
    const { subscribe, set, update } = writable<QRStore>(defaultState);

    return {
        subscribe,
        setUrl: (url: string) => update(state => ({ ...state, url })),
        setSize: (size: number) => update(state => ({ ...state, size })),
        setMargin: (margin: number) => update(state => ({ ...state, margin })),
        setColor: (color: string) => update(state => ({ ...state, color })),
        setBackgroundColor: (backgroundColor: string) => update(state => ({ ...state, backgroundColor })),
        setLogo: (logo: string) => update(state => ({ ...state, logo })),
        setDotsStyle: (style: QRStore['dotsStyle']) => update(state => ({ ...state, dotsStyle: style })),
        setCornersStyle: (style: QRStore['cornersStyle']) => update(state => ({ ...state, cornersStyle: style })),
        reset: () => set(defaultState)
    };
}

export const qrStore = createQRStore();