import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as rp from 'request-promise';
import * as parser from 'xml2json';

export enum Currency {
    USD = 'usd',
    ILS = 'ils'
}

export interface ICurrency {
    id: string;
    name: string;
    lastUpdate: Date;
    unit: number;
    country: string;
    rate: number;
    change: number;
}

export class CurrencyExchange {
    private db: any;
    loginId: string;
    loginPassword: string;

    constructor(){
        this.db = admin.firestore();
        this.loginId = functions.config().comax ? functions.config().comax.loginid : 'GALE1234G';
        this.loginPassword = functions.config().comax ? functions.config().comax.loginpassword : 'G8585G';
    }

    async syncCurrencies(){
        const result = await this.getExchange();
        const resultJson: any = parser.toJson(result,{
            object: true
        });
        const lastUpdate = resultJson.CURRENCIES.LAST_UPDATE;
        const currencies: ICurrency[] = resultJson.CURRENCIES.CURRENCY.map((currency: any)=>{
            return {
                id: currency.CURRENCYCODE,
                name: currency.NAME,
                lastUpdate: lastUpdate,
                unit: currency.UNIT,
                country: currency.COUNTRY,
                rate: currency.RATE,
                change: currency.CHANGE
            }
        });

        const batch = this.db.batch();
        for(const currencyObj of currencies){
            const correncyRef = this.db.collection('currencies').doc(currencyObj.id);
            batch.set(correncyRef, currencyObj);
        }
        await batch.commit();
        return true;
    }

    getExchange(){
        const operation = "https://www.boi.org.il/currency.xml";
        return rp(operation);
    }

    async getCurrencies(){
        const query = this.db.collection('currencies');
        return await query.get().then((querySnapshot:any)=>{
            const list:any = [];
            querySnapshot.forEach((doc:any)=>{
                list.push(doc.data());
            });
            return list;
        });
    }
}