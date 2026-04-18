import { TUICallKitAPI } from "../../../TUICallService/index";
const PATH = '../../../static';
Component({
  properties: {
    callRole: {
      type: String,
    },
    callStatus: {
      type: String,
    },
    callMediaType: {
      type: Number,
    },
    callDuration: {
      type: String,
    },
    pusher: {
      type: Object,
    },
    playerList: {
      type: Array,
    },
    localUserInfo: {
      type: Object,
    },
    callerUserInfo: {
      type: Object
    },
    remoteUserInfoList: {
      type: Array,
    },
    playerProcess: {
      type: Object,
    },
    isEarPhone: {
      type: Boolean,
    },
    enableVirtualBackground: {
      type: Boolean,
    },
    isVirtualBackground: {
      type: Boolean,
    },
    isClickable: {
      type: Boolean,
    },
  },
  data: {
    renderStreamList: [],
    IMG_DEFAULT_AVATAR: `${PATH}/default_avatar.png`,
    IMG_LOADING: `${PATH}/loading.png`,
    IMG_HANGUP: `${PATH}/hangup.png`,
    IMG_ACCEPT: `${PATH}/dialing.png`,
    IMG_SPEAKER_FALSE: `${PATH}/speaker-false.png`,
    IMG_SPEAKER_TRUE: `${PATH}/speaker-true.png`,
    IMG_AUDIO_TRUE: `${PATH}/audio-true.png`,
    IMG_AUDIO_FALSE: `${PATH}/audio-false.png`,
    IMG_CAMERA_TRUE: `${PATH}/camera-true.png`,
    IMG_CAMERA_FALSE: `${PATH}/camera-false.png`,
    IMG_TRANS: `${PATH}/trans.png`,
    IMG_SWITCH_CAMERA: `${PATH}/groupCall-switch_camera.svg`,
    IMG_VIRTUALBACKGROUND_MINI: `${PATH}/groupCall-virtualBackground.svg`,
  },
  observers: {
    "localUserInfo, remoteUserInfoList": function (
      localUserInfo,
      remoteUserInfoList
    ) {
      this.setData({
        renderStreamList: [localUserInfo, ...remoteUserInfoList],
      });
    },
  },
  methods: {
    async accept() {
      await TUICallKitAPI.accept();
    },
    async hangup() {
      if (!this.data.isClickable) {
        return;
      }
      await TUICallKitAPI.hangup();
    },
    async reject() {
      await TUICallKitAPI.reject();
    },
    async switchCamera() {
      await TUICallKitAPI.switchCamera();
    },
    async microPhoneHandler() {
      if (this.data.localUserInfo.isAudioAvailable) {
        await TUICallKitAPI.closeMicrophone();
      } else {
        await TUICallKitAPI.openMicrophone();
      }
    },
    async cameraHandler() {
      if (this.data.localUserInfo.isVideoAvailable) {
        await TUICallKitAPI.closeCamera();
      } else {
        await TUICallKitAPI.openCamera('localVideo');
      }
    },
    async toggleSoundMode() {
      await TUICallKitAPI.setSoundMode();
    },
    async setBlurBackground() {
      await TUICallKitAPI.setBlurBackground(!this.data.isVirtualBackground);
    },
  },
});
