import { ICallStore } from '../interface/ICallStore';
export default class CallStore {
    defaultStore: ICallStore;
    store: ICallStore;
    prevStore: ICallStore;
    update(key: keyof ICallStore, data: any): void;
    getPrevData(key: string | undefined): any;
    getData(key: string | undefined): any;
    reset(keyList?: Array<string>): void;
}
