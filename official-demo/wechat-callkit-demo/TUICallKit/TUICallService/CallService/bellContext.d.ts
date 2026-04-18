import { IBellParams } from '../interface/index';
export declare class BellContext {
    private _bellContext;
    private _isMuteBell;
    private _calleeBellFilePath;
    private _callRole;
    private _callStatus;
    private _isPlaying;
    constructor();
    setBellSrc(): void;
    setBellProperties(bellParams: IBellParams): void;
    play(): Promise<void>;
    stop(): Promise<void>;
    setBellMute(enable: boolean): Promise<void>;
    destroy(): void;
    private _delay;
    private _delayCallback;
    private _handleAudioInterruptionBegin;
    private _handleAudioInterruptionEnd;
    private _addListenBellContextEvent;
    private _removeListenBellContextEvent;
}
