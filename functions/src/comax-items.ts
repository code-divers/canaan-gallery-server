import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as rp from 'request-promise';
import * as parser from 'xml2json';
import { ComaxUtils } from './comax-utils';


export interface IProduct{
    id: string;
    name: string;
    price: number;
    group: string;
    supplier: string;
}

export interface IComaxItem {
    ID: number;
    Name: string;
    Price: number;
    Group: string;
    SupplierName: string;
}

export interface IProductGroup {
    id: string;
    count: number;
}

export class ComaxItems{
    private db: any;
    
    constructor(){
        this.db = admin.firestore();
    }

    async syncItems(){
        const itemsXml = await this.getItems();
        const itemsJson: any = parser.toJson(itemsXml,{
            object: true
        });
        const items =  itemsJson.ArrayOfClsItems.ClsItems;
        const groups: IProductGroup[] = this.discoverGroups(items);
        console.log(groups);
        let batch = this.db.batch();
        for(const groupObj of groups){
            const groupRef = this.db.collection('products-group').doc(groupObj.id);
            batch.set(groupRef, groupObj); 
        }
        await batch.commit();
        console.log('commited %s groups', groups.length);

        let i=0;
        const j=items.length;
        let temparray;
        const chunk = 300;
        for (; i<j; i+=chunk) {
            temparray = items.slice(i,i+chunk);
            const itemsBatch = temparray.map((comaxItem: IComaxItem)=>{
                const item: IProduct = {
                    id: comaxItem.ID.toString(),
                    name: ComaxUtils.formatComaxValue(comaxItem.Name),
                    price: Number(ComaxUtils.formatComaxValue(comaxItem.Price)),
                    group: ComaxUtils.formatComaxValue(comaxItem.Group),
                    supplier: ComaxUtils.formatComaxValue(comaxItem.SupplierName)
                };
                return item;   
            })
            batch = this.db.batch();
            for(const itemObj of itemsBatch){
                if(Number(itemObj.id) > 0){
                    const itemRef = this.db.collection('products').doc(itemObj.id);
                    batch.set(itemRef, itemObj);
                }
            }
            //await batch.commit();
            console.log('handled %s items out of %s', i+chunk, items.length);
        }

        return true;
    }

    getItems(){
        const loginId = functions.config().comax ? functions.config().comax.loginid : 'GALE1234G';
        const loginPassword = functions.config().comax ? functions.config().comax.loginpassword : 'G8585G';

        const operation = `https://ws.comax.co.il/Comax_WebServices/Items_Service.asmx/GetAllItemsDetailsPlusPriceListID?StoreID=3&PriceListID=1&LoginID=${loginId}&LoginPassword=${loginPassword}`;
        
        console.log(operation)

        return rp(operation);
    }

    async getShippingItem(){
        const itemRef = this.db.collection('products').doc('1366');
        const doc = await itemRef.get();
        return doc.data;
    }

    discoverGroups(items: IComaxItem[]){
        const groups: IProductGroup[] = [];
        for(const item of items){
            const idx = groups.findIndex((group)=>{
                return group.id === ComaxUtils.formatComaxValue(item.Group);
            });
            if(idx > -1){
                groups[idx].count = groups[idx].count+1;
            }else{
                groups.push({
                    id: ComaxUtils.formatComaxValue(item.Group),
                    count: 1
                });
            }
        }
        return groups.filter((group)=>{
            return group.id !== null && group.id !== '0';
        });
    }
}