import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as rp from 'request-promise';
import * as parser from 'xml2json';
import * as querystring from 'querystring';
import { ComaxUtils } from './comax-utils';
import { ICurrency, CurrencyExchange } from './currency-exchange';
// import { Timestamp } from '@google-cloud/firestore';

export interface ICustomer{
    id: string;
    name: string;
    address: string;
    street: string,
    house: string,
    city: string | null;
    country: string | null;
    state?: string;
    zipcode: string;
    phone: string;
    email: string;
    currency: string;
    isExport: boolean;
    lastUpdate: admin.firestore.Timestamp;
}

export interface IComaxCustomer{
    ID: number;
    GroupID: number;
    Name: string;
    Street: string;
    City: string;
    ForeignCity: string;
    Zip: string;
    Phone: string;
    Mobile: string;
    Currency: string;
    Email: string;
    ExportCustomer: string;
}

export class ComaxCustomers{
    private db: any;
    loginId: string;
    loginPassword: string;
    constructor(){
        this.db = admin.firestore();
        this.loginId = functions.config().comax ? functions.config().comax.loginid : '';
        this.loginPassword = functions.config().comax ? functions.config().comax.loginpassword : '';
    }

    async syncCustomers(){
        const exchange = new CurrencyExchange();
        const currencies = await exchange.getCurrencies();
        const customersXml = await this.getCustomers();
        const customersJson: any = parser.toJson(customersXml,{
            object: true
        });
        const customers =  customersJson.ArrayOfClsCustomers.ClsCustomers;
        
        let i=0;
        const j = customers.length;
        let temparray;
        const chunk = 300;
        for (; i<j; i+=chunk) {
            temparray = customers.slice(i,i+chunk);
            const customersBatch = temparray.map((comaxCustomer: IComaxCustomer)=>{
                const customer: ICustomer = {
                    id: comaxCustomer.ID.toString(),
                    name: ComaxUtils.formatComaxValue(comaxCustomer.Name),
                    address: ComaxUtils.formatComaxValue(comaxCustomer.Street),
                    street: ComaxUtils.formatComaxValue(comaxCustomer.Street),
                    house: '',
                    city: this.interprateComaxCity(comaxCustomer),
                    country: this.interprateComaxCountry(comaxCustomer),
                    zipcode: ComaxUtils.formatComaxValue(comaxCustomer.Zip),
                    phone: this.interprateComaxPhone(comaxCustomer),
                    email: ComaxUtils.formatComaxValue(comaxCustomer.Email),
                    currency: this.interprateComaxCurrency(comaxCustomer, currencies),
                    isExport: ComaxUtils.interprateComaxBoolean(comaxCustomer.ExportCustomer),
                    lastUpdate: admin.firestore.Timestamp.fromDate(new Date())
                };
                return customer;   
            })
            const batch = this.db.batch();
            for(const customerObj of customersBatch){
                const customerRef = this.db.collection('customers').doc(customerObj.id);
                batch.set(customerRef, customerObj);
            }
            await batch.commit();

            console.log('handled %s customers out of %s', i+chunk, customers.length);
        }

        return true;
    }

    getCustomers(){
        
        const operation = `https://ws.comax.co.il/Comax_WebServices/Customers_Service.asmx/Get_CustomerDetailsBySearch_Simple?ID=&Name=&IDCard=&City=&Phone=&Mobile=&Email=&GroupID=&LoginID=${this.loginId}&LoginPassword=${this.loginPassword}`;
        console.log(operation)

        return rp(operation);
    }

    setCustomer(customer: ICustomer){
        const params = {
            Name: customer.name,
            ID: customer.id,
            BlockDate: '',
            Street: `${customer.street} ${customer.house}` ,
            Street_No: customer.house,
            City: customer.state || customer.city,
            Country: customer.country,
            Phone: customer.phone,
            Mobile: '',
            Zip: customer.zipcode,
            Fax: '',
            Email: customer.email,
            BornDate: '',
            GroupID: this.toComaxGroupId(customer),
            TaxID: '',
            TypeID: '',
            ClubCustomer: false,
            ExportCustomer: customer.isExport,
            ForeignCurrency: customer.isExport,
            TaxExempt: customer.isExport,
            NotSendEmail: '',
            NotSendSMS: '',
            Currency: this.toComaxCurrency(customer),
            ForeignName: customer.name,
            ForeignCity: customer.city,
            FamilyStatus: '',
            Sex: '',
            IDCard: '',
            PriceListID: '',
            Remark: 'Updated by web app',
            UserLoginID: '',
            UserLoginPassword: '',
            NewCustomer: customer.id === null,
            DeleteCustomer: false,
            CheckIDCardExist: false,
            LoginID: this.loginId,
            LoginPassword: this.loginPassword
        }

        const operation = 'https://ws.comax.co.il/Comax_WebServices/Customers_Service.asmx/Set_CustomerDetails_Simple?' + querystring.stringify(params);

        console.log(operation);

        return rp(operation).then((result)=>{
            const parsedResult: any = parser.toJson(result,{
                object: true
            });
            customer.id = parsedResult.ClsCustomers.ID;
            customer.lastUpdate = admin.firestore.Timestamp.fromDate(new Date())
            return this.db.collection('customers').doc(customer.id).set(customer).then(()=>{
                return customer;
            });
        });
    }

    discoverGroups(customers: IComaxCustomer[]){
        const groups = [];
        for(const customer of customers){
            const idx = groups.findIndex((group)=>{
                return group.id === customer.GroupID;
            });
            if(idx > -1){
                groups[idx].count = groups[idx].count+1;
            }else{
                groups.push({
                    id: customer.GroupID,
                    count: 0
                });
            }
        }
        console.log(groups);
        console.log(customers);
    }

    private interprateComaxCountry(comaxCustomer: IComaxCustomer){
        switch(Number(comaxCustomer.GroupID)){
            case 22:
                return 'united states'
            case 32:
                return 'israel'
        }
        return null;
    }

    private toComaxGroupId(customer: ICustomer){
        return customer.isExport ? 22 : 32;
    }

    private interprateComaxCity(comaxCustomer: IComaxCustomer){
        switch(Number(comaxCustomer.GroupID)){
            case 22:
                return ComaxUtils.formatComaxValue(comaxCustomer.ForeignCity);
            case 32:
                return ComaxUtils.formatComaxValue(comaxCustomer.City);
        }
        return null;
    }

    private interprateComaxPhone(comaxCustomer: IComaxCustomer){
        if(comaxCustomer.Phone.length > 0){
            return ComaxUtils.formatComaxValue(comaxCustomer.Phone);
        }else{
            return ComaxUtils.formatComaxValue(comaxCustomer.Mobile);
        }
    }

    private interprateComaxCurrency(comaxCustomer: IComaxCustomer, currencies: ICurrency[]): any {
        if(comaxCustomer.Currency === 'דולר אמריקאי'){
            return 'USD';
        }else{
            return 'ILS';
        }
    }

    private toComaxCurrency(customer: ICustomer){
        if(customer.currency){
            switch(customer.currency){
                case 'USD':
                    return 'דולר אמריקאי';
                default:
                    return 'שקל חדש';
            }
        }else{
            return 'שקל חדש';
        }
    }
}