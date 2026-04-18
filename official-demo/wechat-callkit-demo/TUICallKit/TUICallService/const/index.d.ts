export * from './call';
export * from './error';
export * from './log';
export declare const CALL_DATA_KEY: any;
export declare const CHAT_DATA_KEY: any;
export declare const PUSHER_ID: {
    INITIAL_PUSHER: string;
    NEW_PUSHER: string;
};
export declare const NAME: any;
export declare const AudioCallIcon = "https://web.sdk.qcloud.com/component/TUIKit/assets/call.png";
export declare const VideoCallIcon = "https://web.sdk.qcloud.com/component/TUIKit/assets/call-video-reverse.svg";
export declare const MAX_NUMBER_ROOM_ID = 2147483647;
export declare const DEFAULT_BLUR_LEVEL = 3;
export declare const NETWORK_QUALITY_THRESHOLD = 4;
export declare enum PLATFORM {
    MAC = "mac",
    WIN = "win"
}
export declare enum COMPONENT {
    TUI_CALL_KIT = 14,
    TIM_CALL_KIT = 15
}
export declare enum ROOM_ID_TYPE {
    NUMBER_ROOM_ID = 1,
    STRING_ROOM_ID = 2
}
