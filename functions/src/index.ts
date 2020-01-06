import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ComaxCustomers } from './comax-customers';
import { ComaxItems } from './comax-items';
import { ComaxOrders } from './comax-orders';
import { CurrencyExchange } from './currency-exchange';

admin.initializeApp();


 // On sign up.
exports.processSignUp = functions.auth.user().onCreate((user) => {
   // Check if user meets role criteria.
   const whitelist = ['ytuvia@gmail.com', 'sefadtalit@gmail.com', 'gallerycanaan@gmail.com', 'feldmano@gmail.com'];
   if (user.email &&
       user.emailVerified &&
       whitelist.includes(user.email)) {
     const customClaims = {
       whitelist: true
     };
     // Set custom user claims on this newly created user.
     return admin.auth().setCustomUserClaims(user.uid, customClaims)
       .then(() => {
         // Update real-time database to notify client to force refresh.
         const metadataRef = admin.database().ref("metadata/" + user.uid);
         // Set the refresh time to the current UTC timestamp.
         // This will be captured on the client to force a token refresh.
         return metadataRef.set({refreshTime: new Date().getTime()});
       })
       .catch(error => {
         console.log(error);
       });
   }else {
      return false;
   }
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
    return comaxItems.syncItems().then((result)=>{
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
      return comaxOrders.setRecipt(order).then((result)=>{
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
      return comaxOrders.getOrderById(orderId).then(order=>{
         order.id = orderId;
         const result = comaxOrders.setRecipt(order);
         console.log(result);
         return result;
      }).catch(err => {
         console.log(err);
         return err;
      });
    });

 
