interface IStatusValidateParams {
    engineInstance?: boolean;
}
export declare function statusValidate(config: IStatusValidateParams): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export {};
