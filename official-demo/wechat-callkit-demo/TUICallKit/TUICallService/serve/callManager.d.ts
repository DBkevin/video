export declare class CallManager {
    private _globalCallPagePath;
    init(params: any): Promise<void>;
    private _watchTUIStore;
    private _unwatchTUIStore;
    private _handleCallStatusChange;
    private _handleCallStatusToCalling;
    private _handleCallStatusToIdle;
    getRoute(): any;
    destroyed(): Promise<void>;
}
