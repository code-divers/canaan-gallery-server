export class ComaxUtils {

    public static interprateComaxBoolean(value: string){
        return (/true/i).test(value);
    }

    public static formatComaxValue(value: any){
        return value === null || value === '' || ComaxUtils.isEmpty(value) ? null : value.toLowerCase();
    }

    private static isEmpty(obj: any) {
        for(const key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

}