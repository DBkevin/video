import TUICallService, { TUIGlobal, TUIStore, uiDesign } from './CallService/index';
import { StoreName, NAME, CallRole, CallMediaType, CallStatus, StatusChange, VideoResolution, VideoDisplayMode, AudioPlayBackDevice, FeatureButton, LayoutMode } from './const/index';
import { t } from './locales/index';
declare const TUICallKitAPI: TUICallService;
export { TUIGlobal, TUIStore, StoreName, TUICallKitAPI, NAME, CallStatus, CallRole, CallMediaType, StatusChange, VideoResolution, VideoDisplayMode, AudioPlayBackDevice, t, uiDesign, FeatureButton, LayoutMode, };
