import { CallMediaType } from '../const/index';
import { IUserInfo } from '../interface/ICallService';
export declare function setDefaultUserInfo(userId: string, domId?: string): IUserInfo;
export declare function getMyProfile(myselfUserId: string, tim: any): Promise<IUserInfo>;
export declare function getRemoteUserProfile(userIdList: Array<string>, tim: any): Promise<any>;
export declare function generateText(key: string, prefix?: string, suffix?: string): string;
export declare function generateStatusChangeText(): string;
export declare function getGroupMemberList(groupID: string, tim: any, count: any, offset: any): Promise<any>;
export declare function getGroupProfile(groupID: string, tim: any): Promise<any>;
/**
 * update roomId and roomIdType
 * @param {number} roomId number roomId
 * @param {string} strRoomId string roomId
 */
export declare function updateRoomIdAndRoomIdType(roomId: any, strRoomId: any): void;
/**
 * web and miniProgram call engine throw event data structure are different
 * @param {any} event call engine throw out data
 * @returns {any} data
 */
export declare function analyzeEventData(event: any): any;
/**
 * delete user from remoteUserInfoList
 * @param {string[]} userIdList to be deleted userIdList
 * @param {ITUIStore} TUIStore TUIStore instance
 */
export declare function deleteRemoteUser(userIdList: string[]): void;
export declare function updateDeviceList(tuiCallEngine: any): void;
/**
 * update the no device permission toast
 * @param {any} error error
 * @param {CallMediaType} type call midia type
 * @param {any} tuiCallEngine TUICallEngine instance
 */
export declare function noDevicePermissionToast(error: any, type: CallMediaType, tuiCallEngine: any): void;
/**
 * set localUserInfo audio/video available
 * @param {boolean} isAvailable is available
 * @param {string} type callMediaType 'audio' | 'video'
 * @param {ITUIStore} TUIStore TUIStore instance
 */
export declare function setLocalUserInfoAudioVideoAvailable(isAvailable: boolean, type: string): void;
