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
   
   export const setCustomer = functions.https.onCall((data, context)=>{
      const customer = data;
      const comaxCustomers = new ComaxCustomers();
      return comaxCustomers.setCustomer(customer);
    });

  export const syncOrder = functions.https.onRequest((request, response) => {
   const comaxOrders = new ComaxOrders();
   comaxOrders.setOrder({
      "id":"3eMPmR0yXwc6KLfINo4l",
      "comaxDocNumber": 6160142,
      "created":"2019-06-15T23:07:09.472Z",
      "discount":0,
      "discountedPrice":0,
      "shipping":30,
      "isShipping": true,
      "price":7628.4,
      "subtotal":7658.4,
      "customer":{
         "id": "3000027",
         "name":"Yehuda Tuvia",
         "address":"alonim 59",
         "city":"amirim",
         "state":"",
         "country":"usa",
         "phone":"0522362799",
         "email":"ytuvia@gmail.com",
         "zipcode":"2011500",
         "currency": "USD",
         "isExport":true
      },
      "items":[{
         "id":"10001",
         "name":"טלית יוסף פסטלים בינוני",
         "price":4223.7,
         "discount":0,
         "quantity":1,
         "details":{
            "atara":"kjghjghjghjghjgjgj",
            "corners":{
               "topLeft":null,
               "topRight":null,
               "bottomLeft":null,
               "bottomRight":null}
            }
         },{
            "id":"10000",
            "name":"טלית יוסף פסטלים קטנה",
            "price":3404.7,
            "discount":0,
            "quantity":1,
            "details":{
               "atara":"ffכגכגדכגדכ",
               "corners":{
                  "topLeft":"גכגדכגדכ",
                  "topRight":"גכגדכ",
                  "bottomLeft":"גדכגדכגד",
                  "bottomRight":"גדכגדשכ"
               }
            }
         }]
   }).then((result)=>{
      response.send(result);
   }).catch((err)=>{
      console.log(err);
      response.status(500).send(err.message);
   })
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

 
