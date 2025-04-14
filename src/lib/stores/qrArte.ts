import { writable } from 'svelte/store';

type QRArteStore = {
    url: string;
    size: number;
    colorDark: string;
    colorLight: string;
    backgroundImage: string | null;
    margin: number;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    autoColor: boolean;
};

const defaultState: QRArteStore = {
    url: '',
    size: 500,
    colorDark: '#000000',
    colorLight: '#ffffff',
    backgroundImage: null,
    margin: 10,
    errorCorrectionLevel: 'H',
    autoColor: true
};

function createQRArteStore() {
    const { subscribe, set, update } = writable<QRArteStore>(defaultState);

    return {
        subscribe,
        setUrl: (url: string) => update(state => ({ ...state, url })),
        setSize: (size: number) => update(state => ({ ...state, size })),
        setColorDark: (colorDark: string) => update(state => ({ ...state, colorDark })),
        setColorLight: (colorLight: string) => update(state => ({ ...state, colorLight })),
        setBackgroundImage: (backgroundImage: string | null) => update(state => ({ ...state, backgroundImage })),
        setMargin: (margin: number) => update(state => ({ ...state, margin })),
        setErrorCorrectionLevel: (level: QRArteStore['errorCorrectionLevel']) => 
            update(state => ({ ...state, errorCorrectionLevel: level })),
        setAutoColor: (autoColor: boolean) => update(state => ({ ...state, autoColor })),
        reset: () => set(defaultState)
    };
}

export const qrArteStore = createQRArteStore();