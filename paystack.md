Subscriptions
In a nutshell
The Subscriptions API lets developers embed recurring billing functionality in their applications, without having to manage the billing cycle themselves. Merchants can easily create plans and charge customers automatically, on a recurring basis. We support Card and Direct Debit (Nigeria) only.

Here is how to set up a subscription:

Create a plan
Create a subscription
Listen for subscription events
Create a plan
Plans are the foundational building block for subscriptions. A plan represents what you're selling, how much you're selling it for, and how often you're charging for it.

You can create a plan via the Paystack Dashboard, or by calling the create planAPI endpoint, passing:

Param	Type	Description
name	string	The name of the plan
interval	string	The interval at which to charge subscriptions on this plan. Available options are hourly, daily, weekly, monthly, quarterly, biannually (every 6 months) and annually
amount	integer	The amount to charge

cURL
Show Response

curl https://api.paystack.co/plan
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "name": "Monthly Retainer", 
      "interval": "monthly", 
      "amount": 500000
    }'
-X POST
Monthly Subscription Billing
Billing for subscriptions with a monthly interval depends on the day of the month the subscription was created. If the subscription was created on or before the 28th of the month, it gets billed on the same day, every month, for the duration of the plan. Subscriptions created on or between the 29th - 31st, will get billed on the 28th of every subsequent month, for the duration of the plan

You can also pass invoice_limit, which lets you set how many times a customer can be charged on this plan. So if you set invoice_limit: 5 on a monthly plan, then the customer will be charged every month, for 5 months. If you don't pass invoice_limit, we'll continue to charge the customer until the plan is cancelled.

Create a subscription
Now that we have a plan, we can move on to the next step: subscribing a customer to that plan. There are a couple of ways we can go about creating a new subscription.

Adding Plan code to a transaction
Using the create subscriptionAPI endpoint
Adding plan code to a transaction
You can create a subscription for a customer using the initialize transactionAPI endpoint, by adding the plan_code of a plan you've created to the body of your request. This will override the transaction amount passed, and charge the customer the amount of the plan instead.

Once the customer pays, they'll automatically be subscribed to the plan, and will be billed according to the interval (and invoice limit) set on the plan.


cURL
Show Response

curl https://api.paystack.co/transaction/initialize
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "email": "customer@email.com", 
      "amount": "500000", 
      "plan": "PLN_xxxxxxxxxx" 
    }'
-X POST
Using the create subscription endpoint
You can also create a subscription by calling the create subscriptionAPI endpoint, passing a customer and plan. The customer must have already done a transaction on your Paystack integration. This is because the Subscriptions API uses card and direct debit authorizations to charge customers, so there needs to be an existing authorization to charge.

Note
If a customer has multiple authorizations, you can select which one to use for the subscription, by passing the authorization_code as authorization when creating the subscription. Otherwise, Paystack picks the most recent authorization to charge.


cURL
Show Response

curl https://api.paystack.co/subscription
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "customer": "CUS_xxxxxxxxxx", "plan": "PLN_xxxxxxxxxx" }'
-X POST
You can also pass a start_date parameter, which lets you set the date for the first debit. This makes this method useful for situations where you'd like to give a customer a free period before you start charging them, or when you want to switch a customer to a different plan.

Subscriptions aren't retried
If a subscription charge fails, we don't retry it. Subscriptions are ideal for situations where value is delivered after payment. For example Payment for internet service or a streaming service.

Listen for subscription events
Creating a subscription will result in Paystack sending the following events:

A subscription.create event is sent to indicate that a subscription was created for the customer who was charged.
If you created the subscription by adding a plan code to a transaction, a charge.success event is also sent to indicate that the transaction was successful.
The following steps will happen for each subsequent billing cycle:

An invoice.create event will be sent to indicate a charge attempt will be made on the subscription. This will be sent 3 days before the next payment date.
On the next payment date, a charge.success event will be sent, if the charge attempt was successful. If not, an invoice.payment_failed event will be sent instead.
An invoice.update event will be sent after the charge attempt. This will contain the final status of the invoice for this subscription payment, as well as information on the charge if it was successful
Cancelling a subscription will also trigger events:

A subscription.not_renew event will be sent to indicate that the subscription won't renew on the next payment date.
On the next payment date, a subscription.disable event will be sent to indicate that the subscription has been cancelled.
On completion of all billing cycles for a subscription, a final subscription.disable event will be sent, with status set to complete.

Invoice CreatedInvoice FailedInvoice UpdatedSubscription CreatedSubscription DisabledSubscription Not RenewingTransaction Successful
{
  "event": "invoice.create",
  "data": {
    "domain": "test",
    "invoice_code": "INV_thy2vkmirn2urwv",
    "amount": 50000,
    "period_start": "2018-12-20T15:00:00.000Z",
    "period_end": "2018-12-19T23:59:59.000Z",
    "status": "success",
    "paid": true,
    "paid_at": "2018-12-20T15:00:06.000Z",
    "description": null,
    "authorization": {
      "authorization_code": "AUTH_9246d0h9kl",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2020",
      "channel": "card",
      "card_type": "visa DEBIT",
      "bank": "Test Bank",
      "country_code": "NG",
      "brand": "visa",
      "reusable": true,
      "signature": "SIG_iCw3p0rsG7LUiQwlsR3t",
      "account_name": "BoJack Horseman"
    },
    "subscription": {
      "status": "active",
      "subscription_code": "SUB_fq7dbe8tju0i1v8",
      "email_token": "3a1h7bcu8zxhm8k",
      "amount": 50000,
      "cron_expression": "0 * * * *",
      "next_payment_date": "2018-12-20T00:00:00.000Z",
      "open_invoice": null
    },
    "customer": {
      "id": 46,
      "first_name": "Asample",
      "last_name": "Personpaying",
      "email": "asam@ple.com",
      "customer_code": "CUS_00w4ath3e2ukno4",
      "phone": "",
      "metadata": null,
      "risk_action": "default"
    },
    "transaction": {
      "reference": "9cfbae6e-bbf3-5b41-8aef-d72c1a17650g",
      "status": "success",
      "amount": 50000,
      "currency": "NGN"
    },
    "created_at": "2018-12-20T15:00:02.000Z"
  }
}
Managing subscriptions
So you've set up your plans, and you've started subscribing customers to them. In this section, we'll talk about how to manage those subscriptions, to make sure you don't miss payments, and your customers don't lose service.

Understanding subscription statuses
Subscription statuses are key to managing your subscriptions. Each status contains information about a subscription, that lets you know if you need to take action or not, to keep that customer. There are currently 5 possible statuses a subscription can have.

Status	Description
active	The subscription is currently active, and will be charged on the next payment date.
non-renewing	The subscription is currently active, but we won't be charging it on the next payment date. This occurs when a subscription is about to be complete, or has been cancelled (but we haven't reached the next payment date yet).
attention	The subscription is still active, but there was an issue while trying to charge the customer's card. The issue can be an expired card, insufficient funds, etc. We'll attempt charging the card again on the next payment date.
completed	The subscription is complete, and will no longer be charged.
cancelled	The subscription has been cancelled, and we'll no longer attempt to charge the card on the subscription.
Handling subscription payment issues
As mentioned in the previous section, if a subscription's status is attention, then it means that there was a problem with trying to charge the customer's card, and we were unable to successfully debit them.

To fix the issue, you can take a look at the most_recent_invoice object returned in the body of the fetch subscriptionAPI response. This object contains information about the most recent attempt to charge the card on the subscription. If the subscription's status is attention, then the most_recent_invoice object will have a status field set to failed, and a description field, with more information about what went wrong when attempting to charge the card.

{  

  "data": {  

    "most_recent_invoice": {
      "subscription": 326005,
      "integration": 530700,
      "domain": "test",
      "invoice_code": "INV_fjtns483x9c2fyw",
      "customer": 92740135,
      "transaction": 1430031421,
      "amount": 50000,
      "period_start": "2021-11-10T13:00:00.000Z",
      "period_end": "2021-11-10T13:59:59.000Z",
      "status": "attention",
      "paid": 1,
      "retries": 1,
      "authorization": 242063633,
      "paid_at": "2021-11-10T13:00:09.000Z",
      "next_notification": "2021-11-07T13:59:59.000Z",
      "notification_flag": null,
      "description": "Insufficient Funds",
      "id": 3953926,
      "created_at": "2021-11-10T13:00:05.000Z",
      "updated_at": "2021-11-10T13:00:10.000Z"
      }

  }  
}
At the beginning of each month, we'll also send a subscription.expiring_cards webhook, which contains information about all subscriptions with cards that expire that month. You can use this to proactively reach out to your customers, and have them update the card on their subscription.

{
  "event":"subscription.expiring_cards",
  "data":[
    {
      "expiry_date":"12/2021",
      "description":"visa ending with 4081",
      "brand":"visa",
      "subscription":{
        "id":94729,
        "subscription_code":"SUB_lejj927x2kxciw1",
        "amount":44000,
        "next_payment_date":"2021-11-11T00:00:01.000Z",
        "plan":{
          "interval":"monthly",
          "id":22637,
          "name":"Premium Service (Monthly)",
          "plan_code":"PLN_pfmwz75o021slex"
        }
      },
      "customer":{
        "id":7808239,
        "first_name":"Bojack",
        "last_name":"Horseman",
        "email":"bojackhoresman@gmail.com",
        "customer_code":"CUS_8v6g420rc16spqw"
      }
    }
  ]
}
Updating subscriptions
To make changes to a subscription, you’ll use the Update PlanAPI endpoint. You should consider whether you want to change existing subscriptions or keep them as they are. For example, if you’re updating the price, or the charge intervals. You’ll use the update_existing_subscriptions parameter to control this:

When set to true : All subscriptions will be updated, and the changes will apply on the next billing cycle.
When set to false: Current subscriptions will stay the same, and only new ones will follow the updates.
If you omit this parameter, the updates will automatically apply to all subscriptions.

Updating the card on a subscription
When a customer's subscription has a card or bank with a payment issue, you can generate a link to a hosted subscription management page, where they can update their authorization. On the page, your customer will have the option to either add a new card, a direct debit account, or cancel their subscription. If they choose to add a new card, Paystack will charge the card a small amount to tokenize it. Don't worry, the charge is immediately refunded.


cURL
Show Response

curl https://api.paystack.co/subscription/:code/manage/link
-H "Authorization: Bearer YOUR_SECRET_KEY"
-X GET
If you already have a page where your subscribers can manage their subscriptions, you can choose to have a button or link on that page that will generate the link and redirect the customer to the subscription management page.

Alternatively, you can trigger an email from Paystack to the customer, with the link included.


cURL
Show Response

curl https://api.paystack.co/subscription/:code/manage/email
-H "Authorization: Bearer YOUR_SECRET_KEY"
-X POST