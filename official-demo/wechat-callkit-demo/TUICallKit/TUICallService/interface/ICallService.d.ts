import { CallStatus, CallRole } from '../const/index';
type SDKAppID = {
    SDKAppID: number;
} | {
    sdkAppID: number;
};
export interface IInitParamsBase {
    userID: string;
    userSig: string;
    tim?: any;
    isFromChat?: boolean;
    component?: number;
}
export type IInitParams = IInitParamsBase & SDKAppID;
export interface ICallsParams {
    userIDList: Array<string>;
    type: number;
    chatGroupID?: string;
    roomID?: number;
    strRoomID?: string;
    userData?: string;
    timeout?: number;
    offlinePushInfo?: IOfflinePushInfo;
}
export interface IUserInfo {
    userId: string;
    nick?: string;
    avatar?: string;
    remark?: string;
    displayUserInfo?: string;
    isAudioAvailable?: boolean;
    isVideoAvailable?: boolean;
    volume?: number;
    isEnter?: boolean;
    domId?: string;
}
export interface IOfflinePushInfo {
    title?: string;
    description?: string;
    androidOPPOChannelID?: string;
    extension: String;
}
export interface ICallbackParam {
    beforeCalling?: (...args: any[]) => void;
    afterCalling?: (...args: any[]) => void;
    onMinimized?: (...args: any[]) => void;
    onMessageSentByMe?: (...args: any[]) => void;
    kickedOut?: (...args: any[]) => void;
    statusChanged?: (...args: any[]) => void;
}
export interface ISelfInfoParams {
    nickName: string;
    avatar: string;
}
export interface IBellParams {
    callRole?: CallRole;
    callStatus?: CallStatus;
    isMuteBell?: boolean;
    calleeBellFilePath?: string;
}
export interface IInviteUserParams {
    userIDList: string[];
    offlinePushInfo?: IOfflinePushInfo;
}
export interface INetWorkQuality {
    userId: string;
    quality: number;
}
export {};
