import { CallStatus, CallRole, CallMediaType, VideoDisplayMode, VideoResolution, TDeviceList, CameraPosition, ICustomUIConfig } from '../const/index';
import { IUserInfo, INetWorkQuality } from './index';
export interface IToastInfo {
    text: string;
    type?: string;
}
export interface ICallStore {
    callStatus: CallStatus;
    callRole: CallRole;
    callMediaType: CallMediaType;
    localUserInfo: IUserInfo;
    localUserInfoExcludeVolume: IUserInfo;
    remoteUserInfoList: Array<IUserInfo>;
    remoteUserInfoExcludeVolumeList: Array<IUserInfo>;
    callerUserInfo: IUserInfo;
    isGroup: boolean;
    callDuration: string;
    callTips: string;
    toastInfo: IToastInfo;
    isMinimized: boolean;
    enableFloatWindow: boolean;
    bigScreenUserId: string;
    language: string;
    isClickable: boolean;
    showPermissionTip: boolean;
    netWorkQualityList: Array<INetWorkQuality>;
    deviceList: TDeviceList;
    callID: string;
    groupID: string;
    roomID: number | string;
    roomIdType: number;
    cameraPosition: CameraPosition;
    isMuteSpeaker: boolean;
    groupCallMembers: IUserInfo[];
    displayMode: VideoDisplayMode;
    videoResolution: VideoResolution;
    pusher: any;
    player: any[];
    isEarPhone: boolean;
    showSelectUser: boolean;
    isShowEnableVirtualBackground: boolean;
    enableVirtualBackground: boolean;
    customUIConfig: ICustomUIConfig;
    pusherId: string;
    translate: Function;
    isForceUseV2API: boolean;
}
