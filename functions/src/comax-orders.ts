import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as querystring from 'querystring';
import * as rp from 'request-promise';
import * as parser from 'xml2json';
import { ICustomer } from './comax-customers';

const STOREID = 2;
const BRANCHID = 3;
const PRICELISTID = 1;

export interface IOrder {
    id: string;
    comaxDocNumber?: number;
    comaxReciptDocNumber?: number;
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
    discountedPrice: number,
    quantity: number;
    details?: any;
    group: string;
}

export class ComaxOrders {
    private loginId: string;
    private loginPassword: string;
    private db =  admin.firestore();

    constructor(){
        this.loginId = functions.config().comax ? functions.config().comax.loginid : 'GALE1234G';
        this.loginPassword = functions.config().comax ? functions.config().comax.loginpassword : 'G8585G';
    }

    getOrderById(id: string) {
        return this.db.doc(`orders/${ id }`).get().then(result=>{
            return <IOrder>result.data();
        });
    }

    updateOrderRecipt(order: IOrder, comaxReciptDocNumber: number){
        return this.db.doc(`orders/${ order.id }`).update({
            comaxReciptDocNumber: comaxReciptDocNumber
        });
    }

    setOrder(order: IOrder){
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
            LoginID: this.loginId,
            LoginPassword: this.loginPassword
        }

        const list = this.buildComaxOrderItems(order);
        
        const operation = 'http://ws.comax.co.il/Comax_WebServices/CustomersOrders_Service.asmx/WriteCustomersOrderByParamsExtendedPlusPrice?' + querystring.stringify(params) + list.items + list.quantities + list.prices + list.discountPercents + list.totalSums + list.itemsRemarks + list.promoIDs + list.promoRanks;

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

    setRecipt(order: IOrder){
        const params = {
            CustomerID: order.customer.id,
            DateDoc: '',
            ReferenceDate: '',
            PaymentDate: '',
            StoreID: STOREID,
            SalesAccountID: '',
            PriceListID: PRICELISTID,
            AgentID: '',
            DocNumber: '',
            Reference: '',
            Remarks: '',
            Details: '',
            BranchID: BRANCHID,
            CustomerName: order.customer.name,
            CustomerAddress: this.buildComaxAddress(order),
            CustomerCity: order.customer.city,
            CustomerPhone: order.customer.phone,
            CustomerZip: order.customer.zipcode,
            CustomerDiscountPercent: '',
            DeliveryDate: '',
            DeliveryHourFrom: '',
            DeliveryHourTo: '',
            DeliveryAddress: this.buildComaxAddress(order),
            DeliveryAddressNumber: '',
            DeliveryCity: order.customer.city,
            DeliveryZip: order.customer.zipcode,
            DeliveryContactMan: order.customer.name,
            DeliveryRemark: '',
            DeliveryFloor: '',
            DeliveryFlat: '',
            DeliveryTelephone: order.customer.phone,
            DeliveryTelephone2: '',
            DeliveryEmail: order.customer.email,
            DeliveryType: 'Empty',
            OrderNumber: order.comaxDocNumber,
            OrderYear: '',
            SetItemPriceByOrder: false,
            LoginID: this.loginId,
            LoginPassword: this.loginPassword
        }
        
        const list = this.buildComaxOrderItems(order);
        
        const operation = 'http://ws.comax.co.il/Comax_WebServices/TaxInvoiceSales.asmx/WriteTaxInvoiceSalesByParams?' + querystring.stringify(params) + list.items + list.quantities + list.prices + list.discountPercents + list.totalSums + list.itemsRemarks + list.promoIDs + list.promoRanks;

        console.log(operation)
        return rp(operation).then((result)=>{
            const parsedResult: any = parser.toJson(result,{
                object: true
            });
            console.log(parsedResult);
            const docNumber = parsedResult.ClsTaxInvoiceSales.DocNumber;
            return this.db.doc(`orders/${ order.id }`).update({
                comaxReciptDocNumber: docNumber
            });
        });
    }

    buildComaxComment(order: IOrderItem){
        if(!order.details){
            return '';
        }
        const details = order.details;
        if(details.studio){
            return encodeURI(`
            Atara: ${details.studio.atara},
            Corner top left: ${details.studio.corners.topLeft},
            Corner top right: ${details.studio.corners.topRight},
            Corner bottom left: ${details.studio.corners.bottomLeft},
            Corner bottom right: ${details.studio.corners.bottomRight}
            `);
        }
        if(details.comment){
            return encodeURI(details.comment);
        }
        return '';
    }

    buildComaxAddress(order: IOrder){
        const parts = [
            order.customer.house,
            order.customer.street,
            order.customer.city
        ]
        if(order.customer.state){
            parts.push(order.customer.state)
        }

        parts.push(order.customer.country);
        if(order.customer.zipcode){
            parts.push(order.customer.zipcode);
        }
        return parts.join(', ');
    }

    buildComaxOrderItems(order: IOrder){
        const list = {
            items: '',
            quantities: '',
            prices: '',
            discountPercents: '',
            totalSums: '',
            itemsRemarks: '',
            promoIDs: '',
            promoRanks: ''
        }
        if(order.shipping > 0){
            list.items+='&items=1366';
            list.quantities+= '&Quantity=1';
            list.prices += `&Price=${order.shipping}`;
            list.discountPercents += `&DiscountPercent=`;
            list.totalSums += `&TotalSum=${order.shipping}`;
            list.itemsRemarks += `&ItemRemarks=`;
            list.promoIDs += `&PromoID=`;
            list.promoRanks += `&PromoRank=`;
        }
        for(const item of order.items){
            list.items+=`&items=${item.id}`;
            list.quantities+= `&Quantity=${item.quantity}`;
            list.prices += `&Price=${item.price}`;
            list.discountPercents += `&DiscountPercent=${item.discount}`;
            list.totalSums += `&TotalSum=${item.discountedPrice * item.quantity}`;
            list.itemsRemarks += `&ItemRemarks=${this.buildComaxComment(item)}`;
            list.promoIDs += `&PromoID=`;
            list.promoRanks += `&PromoRank=`;
        }
        return list;
    }
}