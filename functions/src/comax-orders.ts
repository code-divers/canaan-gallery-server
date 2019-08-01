import * as functions from 'firebase-functions';
import * as querystring from 'querystring';
import * as rp from 'request-promise';
import * as parser from 'xml2json';
import { ICustomer } from './comax-customers';

const STOREID = 2;
const PRICELISTID = 1;

export interface IOrder {
    id: string,
    comaxDocNumber?: number,
    created: string;
    price: number;
    discount: number;
    discountedPrice: number;
    shipping: number;
    isShipping: boolean;
    subtotal: number;
    customer: ICustomer;
    items: IOrderItem[];
}

export interface IOrderItem {
    id: string;
    name: string;
    price: number;
    discount: number;
    quantity: number;
    details?: any;
}

export class ComaxOrders {

    setOrder(order: IOrder){
        const loginId = functions.config().comax ? functions.config().comax.loginid : '';
        const loginPassword = functions.config().comax ? functions.config().comax.loginpassword : '';

        const params = {
            CustomerID: order.customer.id,
            StoreID: STOREID,
            PriceListID: PRICELISTID,
            DoJ5: '',
            Remarks: '',
            Details: '',
            Reference: '',
            Mode: order.comaxDocNumber ? 'Update' : 'Add',
            DocNumber: order.comaxDocNumber,
            ManualDocNumber: '',
            ClubCustomer: '',
            CustomerName: order.customer.name,
            CustomerAddress: order.customer.address,
            CustomerCity: order.customer.city,
            CustomerPhone: order.customer.phone,
            CustomerZip: order.customer.zipcode,
            Status: '',
            AgentID: '',
            DeliveryDate: '',
            DeliveryHourFrom: '',
            DeliveryHourTo: '',
            DeliveryAddress: '',
            DeliveryAddressNumber: '',
            DeliveryCity: '',
            DeliveryZip: '',
            DeliveryContactMan: '',
            DeliveryRemark: '',
            DeliveryFloor: '',
            DeliveryFlat: '',
            DeliveryTelephone: '',
            DeliveryTelephone2: '',
            DeliveryEmail: order.customer.email,
            DeliveryType: '',
            PayType: '',
            CreditPaysNumber: '',
            CreditCompany: '',
            CreditTransactionType: '',
            CreditExpireDate: '',
            CreditCardNumber: '',
            CreditTokenNumber: '',
            CreditCVV: '',
            CreditTZ: '',
            Bank: '',
            BankBranch: '',
            BankAccount: '',
            CheckNumber: '',
            CheckDate: '',
            PriceFromPriceList: '',
            LoginID: loginId,
            LoginPassword: loginPassword
        }

        let items = '';
        let quantities = '';
        let prices = '';
        let discountPercents = '';
        let totalSums = '';
        let itemsRemarks = '';
        let promoIDs = '';
        let promoRanks = '';
        if(order.shipping > 0){
            items+='&items=1366';
            quantities+= '&Quantity=1';
            prices += `&Price=${order.shipping}`;
            discountPercents += `&DiscountPercent=`;
            totalSums += `&TotalSum=`;
            itemsRemarks += `&ItemRemarks=`;
            promoIDs += `&PromoID=`;
            promoRanks += `&PromoRank=`;
        }
        for(const item of order.items){
            items+=`&items=${item.id}`;
            quantities+= `&Quantity=${item.quantity}`;
            prices += `&Price=${item.price}`;
            discountPercents += `&DiscountPercent=${item.discount}`;
            totalSums += `&TotalSum=`;
            itemsRemarks += `&ItemRemarks=${this.buildComaxComment(item)}`;
            promoIDs += `&PromoID=`;
            promoRanks += `&PromoRank=`;
        }

        const operation = 'http://ws.comax.co.il/Comax_WebServices/CustomersOrders_Service.asmx/WriteCustomersOrderByParamsExtendedPlusPrice?' + querystring.stringify(params) + items + quantities + prices + discountPercents + totalSums + itemsRemarks + promoIDs + promoRanks;

        console.log(operation)
        return rp(operation).then((result)=>{
            console.log(result);
            const parsedResult: any = parser.toJson(result,{
                object: true
            });
            console.log(parsedResult);
            return parsedResult.ClsCustomersOrders.DocNumber;
        });
    }

    buildComaxComment(order: IOrderItem){
        if(!order.details){
            return '';
        }
        const details = order.details;
        if(details.studio){
            return JSON.stringify(details.studio);
        }
        if(details.comment){
            return JSON.stringify(details.comment);
        }
        return '';
    }
}