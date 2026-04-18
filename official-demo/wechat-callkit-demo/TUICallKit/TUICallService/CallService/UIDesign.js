"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIDesign = void 0;
const index_1 = require("../const/index");
const index_2 = require("../utils/index");
const is_empty_1 = __importDefault(require("../utils/is-empty"));
const DEFAULT_LOCAL_USER_ID = '_local_user_id';
class UIDesign {
    constructor() {
        this._viewConfig = {
            viewBackground: {
                local: {},
                remote: {},
            }
        };
        this._isSetViewBackgroundConfig = { remote: false, local: false };
        this._tuiCallEngine = null;
        this._tuiStore = null;
    }
    static getInstance() {
        if (!UIDesign.instance) {
            UIDesign.instance = new UIDesign();
        }
        return UIDesign.instance;
    }
    _updateViewBackground() {
        var _a, _b, _c;
        const customUIConfig = (_a = this._tuiStore) === null || _a === void 0 ? void 0 : _a.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG);
        const { userId } = (_b = this._tuiStore) === null || _b === void 0 ? void 0 : _b.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
        if (Object.keys(this._viewConfig.viewBackground.remote).includes(userId)) {
            delete this._viewConfig.viewBackground.remote[userId];
        }
        (_c = this._tuiStore) === null || _c === void 0 ? void 0 : _c.update(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG, Object.assign(Object.assign({}, customUIConfig), { viewBackground: Object.assign(Object.assign({}, this._viewConfig.viewBackground.remote), this._viewConfig.viewBackground.local) }));
    }
    setEngineInstance(engineInstance) {
        this._tuiCallEngine = engineInstance;
    }
    setTUIStore(tuiStore) {
        this._tuiStore = tuiStore;
    }
    updateViewBackgroundUserId(name) {
        var _a, _b;
        if (name === 'local') {
            const { userId } = (_a = this._tuiStore) === null || _a === void 0 ? void 0 : _a.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
            if (Object.keys(this._viewConfig.viewBackground.remote).includes(userId)) {
                delete this._viewConfig.viewBackground.remote[userId];
                this._updateViewBackground();
            }
            if (!this._isSetViewBackgroundConfig.local) {
                return;
            }
            const localViewBackgroundConfig = this._viewConfig.viewBackground.local;
            const url = localViewBackgroundConfig[userId] || localViewBackgroundConfig[DEFAULT_LOCAL_USER_ID];
            localViewBackgroundConfig[userId] = localViewBackgroundConfig[DEFAULT_LOCAL_USER_ID];
            this._viewConfig.viewBackground.local = { [userId]: url };
            this._updateViewBackground();
        }
        else {
            let remoteViewBackgroundConfig = this._viewConfig.viewBackground.remote;
            if (this._isSetViewBackgroundConfig.remote && Object.keys(remoteViewBackgroundConfig).includes('*')) {
                const remoteUserInfoList = (_b = this._tuiStore) === null || _b === void 0 ? void 0 : _b.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
                const remoteUserIdList = remoteUserInfoList.map((item) => item.userId);
                remoteUserIdList.forEach((userId) => {
                    if (!Object.keys(remoteViewBackgroundConfig).includes(userId)) {
                        remoteViewBackgroundConfig[userId] = remoteViewBackgroundConfig['*'];
                    }
                });
                this._viewConfig.viewBackground.remote = remoteViewBackgroundConfig;
                this._updateViewBackground();
            }
        }
    }
    hideFeatureButton(buttonName) {
        var _a, _b, _c, _d, _e;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
            name: 'TUICallKit.hideFeatureButton.start',
            data: { buttonName },
        });
        const customUIConfig = (_c = this._tuiStore) === null || _c === void 0 ? void 0 : _c.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG);
        (_d = this._tuiStore) === null || _d === void 0 ? void 0 : _d.update(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG, Object.assign(Object.assign({}, customUIConfig), { button: Object.assign(Object.assign({}, customUIConfig.button), { [buttonName]: Object.assign(Object.assign({}, (((_e = customUIConfig.button) === null || _e === void 0 ? void 0 : _e[buttonName]) || {})), { show: false }) }) }));
    }
    setLocalViewBackgroundImage(url) {
        var _a, _b, _c;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
            name: 'TUICallKit.setLocalViewBackgroundImage.start',
            data: { url },
        });
        this._isSetViewBackgroundConfig.local = true;
        let { userId } = (_c = this._tuiStore) === null || _c === void 0 ? void 0 : _c.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
        if ((0, is_empty_1.default)(userId)) {
            userId = DEFAULT_LOCAL_USER_ID;
        }
        this._viewConfig.viewBackground.local = { [userId]: url };
        this._updateViewBackground();
    }
    setRemoteViewBackgroundImage(userId, url) {
        var _a, _b;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
            name: 'TUICallKit.setRemoteViewBackgroundImage.start',
            data: { userId, url },
        });
        this._isSetViewBackgroundConfig.remote = true;
        if (userId === '*') {
            this._viewConfig.viewBackground.remote = {};
        }
        this._viewConfig.viewBackground.remote[userId] = url;
        this._updateViewBackground();
    }
    setLayoutMode(layoutMode) {
        var _a, _b;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
            name: 'TUICallKit.setLayoutMode.start',
            data: { layoutMode },
        });
        const customUIConfig = this._tuiStore.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG);
        this._tuiStore.update(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG, Object.assign(Object.assign({}, customUIConfig), { layoutMode }));
    }
    setCameraDefaultState(isOpen) {
        var _a, _b;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
            name: 'TUICallKit.setCameraDefaultState.start',
            data: { isOpen },
        });
        const customUIConfig = (0, index_2.deepClone)(this._tuiStore.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG));
        if (!Object.keys(customUIConfig.button).includes(index_1.FeatureButton.Camera)) {
            customUIConfig.button[index_1.FeatureButton.Camera] = {};
        }
        customUIConfig.button[index_1.FeatureButton.Camera].state = isOpen ? index_1.ButtonState.Open : index_1.ButtonState.Close;
        this._tuiStore.update(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG, customUIConfig);
    }
}
exports.UIDesign = UIDesign;
