import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ComaxCustomers } from './comax-customers';
import { ComaxItems } from './comax-items';
import { ComaxOrders } from './comax-orders';
import { CurrencyExchange } from './currency-exchange';

admin.initializeApp();

 export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
 });

 export const syncCustomers = functions.https.onRequest((request, response) => {
     const comaxCustomers = new ComaxCustomers();
     comaxCustomers.syncCustomers().then((result)=>{
        response.send(result);
     }).catch((err)=>{
        console.log(err);
        response.status(500).send(err.message);
     })
   });

 export const syncItems = functions.https.onRequest((request, response) => {
    const comaxItems = new ComaxItems();
    comaxItems.syncItems().then((result)=>{
       response.send(result);
    }).catch((err)=>{
       console.log(err);
       response.status(500).send(err.message);
    })
  });

  export const createOrder = functions.firestore
    .document('orders/{orderId}')
    .onWrite((change: any, context) => {
      const order = change.after.exists ? change.after.data() : null;
      console.log(order.items.length);
      if(order && order.items.length > 0){
         const comaxOrders = new ComaxOrders();
         return comaxOrders.setOrder(order).then((result)=>{
            return change.after.ref.set({
               comaxDocNumber: result
            }, { merge: true })
         });
      }
      return 'order doesnot exist (deleted?)';
    });

    export const setOrderReceipt = functions.https.onCall((data, context) => {
      const order = data;
      const comaxOrders = new ComaxOrders();
      comaxOrders.setRecipt(order).then((result)=>{
         return result;
      });
   });

   
   export const setCustomer = functions.https.onCall((data, context)=>{
      const customer = data;
      const comaxCustomers = new ComaxCustomers();
      return comaxCustomers.setCustomer(customer);
    });

   export const syncCurrencies = functions.https.onRequest((request, response) => {
      const currencyExchange = new CurrencyExchange();
      currencyExchange.syncCurrencies().then((result)=>{
         response.send(result);
      }).catch((err)=>{
         console.log(err);
         response.status(500).send(err.message);
      })
   });

   export const testOrder = functions.https.onCall((data, context)=>{
      const orderId = data;
      const comaxOrders = new ComaxOrders();
      comaxOrders.getOrderById(orderId).then(order=>{
         order.id = orderId;
         const result = comaxOrders.setRecipt(order);
         console.log(result);
         return result;
      }).catch(err => {
         console.log(err);
         return err;
      });
    });

 
