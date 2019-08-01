import * as http from 'http';

const agent = new http.Agent({keepAlive: true});
const WEBSERVICE_HOST = 'http://ws.comax.co.il';
const webServiceApp = 'Comax_WebServices/Customers_Service.asmx'

export enum CustomerOperations {
	customersDetails = 'Get_CustomerDetailsBySearch_Simple'
}

export enum Currency {
    USD = 'USD',
    ILS = 'ILS'
}

export class ComaxCustomer {
    public id: number;
    internalId: number;
    name: string;
    foreignName: string;
    isBlocked: boolean;
    street: string;
    streetNumber: number;
    floor: number;
    flat: number;
    city: string;
    foreignCity: string;
    phone: string;
    mobile: string;
    zip: string;
    email: string;
    obligo: number;
    balance: number;
    groupId: number;
    taxId: number;
    typeId: number;
    clubCustomer: boolean;
    exportCustomer: boolean;
    foreignCurrency: boolean;
    currency: Currency;
    taxExampt: boolean;
    contactMan: string;
    notSendEmail: boolean;
    notSendSMS: boolean;
    dateOfBirth: Date;
    familyStatus: string;
    sex: string;
    idCard: string;
    priceListId: number;
    discountPercent: number;
    remark: string;
    swInvoiceEmail: string;
    sochenNm: string;

    getList(){
        const listPromisse = new Promise((resolve, reject)=>{
            const operation = 'Get_CustomerDetailsBySearch_Simple?ID=&Name=&IDCard=&City=&Phone=&Mobile=&Email=&GroupID=32&LoginID=GALE1234G&LoginPassword=G8585G'
            req = http.request({
                host: WEBSERVICE_HOST,
                port: 80,
                path: webServiceApp + CustomerOperations.customersDetails,
                method: 'GET',
                agent: agent,
            }, res => {
                let rawData = '';
                res.setEncoding('utf8');
                res.on('data', chunk => { rawData += chunk; });
                res.on('end', () => {
                    resolve(rawData);
                });
            });
            req.on('error', e => {
                reject(e);
            });
            req.end();
        })
    }
}