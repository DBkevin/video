import { FeatureButton, LayoutMode } from "../const/index";
export interface IUIDesign {
    updateViewBackgroundUserId: (viewType: 'local' | 'remote') => void;
    hideFeatureButton: (buttonName: FeatureButton) => void;
    setLocalViewBackgroundImage: (url: string) => void;
    setRemoteViewBackgroundImage: (userId: string, url: string) => void;
    setLayoutMode: (layoutMode: LayoutMode) => void;
    setCameraDefaultState: (isOpen: boolean) => void;
    setEngineInstance: (engineInstance: any) => void;
    setTUIStore: (tuiStore: any) => void;
}
export declare class UIDesign implements IUIDesign {
    static instance: IUIDesign;
    static getInstance(): IUIDesign;
    private _viewConfig;
    private _isSetViewBackgroundConfig;
    private _tuiCallEngine;
    private _tuiStore;
    private _updateViewBackground;
    setEngineInstance(engineInstance: any): void;
    setTUIStore(tuiStore: any): void;
    updateViewBackgroundUserId(name: any): void;
    hideFeatureButton(buttonName: FeatureButton): void;
    setLocalViewBackgroundImage(url: string): void;
    setRemoteViewBackgroundImage(userId: string, url: string): void;
    setLayoutMode(layoutMode: LayoutMode): void;
    setCameraDefaultState(isOpen: boolean): void;
}
