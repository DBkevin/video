export default class ChatCombine {
    static instance: ChatCombine;
    private _callService;
    constructor(options: any);
    static getInstance(options: any): ChatCombine;
    /**
     * message on screen
     * @param {Any} params Parameters for message up-screening
     */
    callTUIService(params: any): void;
    /**
     * tuicore getExtension
     * @param {String} extensionID extension id
     * @param {Any} params tuicore pass parameters
     * @returns {Any[]} return extension
     */
    onGetExtension(extensionID: string, params: any): any[];
    onCall(method: String, params: any): Promise<void>;
    /**
     * tuicore notify event manager
     * @param {String} eventName event name
     * @param {String} subKey sub key
     * @param {Any} options tuicore event parameters
     */
    onNotifyEvent(eventName: string, subKey: string, options?: any): Promise<void>;
    updateStoreBasedOnGroupAttributes(groupAttributes: any): Promise<void>;
    getGroupAttributes(tim: any, groupId: string): Promise<any>;
    isLineBusy(message: any): boolean;
    getCallKitMessage(message: any, tim: any): Promise<{
        messageCardContent?: undefined;
        callMediaType?: undefined;
        inviteeList?: undefined;
    } | {
        messageCardContent: string;
        callMediaType: any;
        inviteeList: any;
    }>;
    private _addListenChatEvent;
    private _removeListenChatEvent;
    /**
     * chat start audio/video call via click
     * @param {Any} options Parameters passed in when clicking on an audio/video call from chat
     * @param {CallMediaType} type call media type. 0 - audio; 1 - video.
     *
     * priority: isForceUseV2API > version
     */
    private _handleTUICoreOnClick;
    private _handleGroupAttributesUpdated;
}
