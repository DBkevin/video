"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepClone = exports.checkLocalMP3FileExists = void 0;
function checkLocalMP3FileExists(src) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!src)
            return false;
        try {
            const response = yield new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('HEAD', src, true);
                xhr.onload = () => resolve(xhr);
                xhr.onerror = () => reject(xhr);
                xhr.send();
            });
            return response.status === 200 && response.getResponseHeader('Content-Type') === 'audio/mpeg';
        }
        catch (error) {
            console.warn(error);
            return false;
        }
    });
}
exports.checkLocalMP3FileExists = checkLocalMP3FileExists;
function deepClone(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    let clone = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = deepClone(obj[key]);
        }
    }
    return clone;
}
exports.deepClone = deepClone;
