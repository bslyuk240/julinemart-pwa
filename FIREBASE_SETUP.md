# 🔥 Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in your JulineMart Android app.

---

## 📋 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `JulineMart` (or your preferred name)
4. Accept terms and click **"Continue"**
5. Disable Google Analytics (optional, you can enable it later)
6. Click **"Create project"**
7. Wait for project creation, then click **"Continue"**

---

## 📱 Step 2: Add Android App to Firebase

1. In Firebase Console, click the **Android icon** (robot) to add an Android app
2. **Register app:**
   - **Android package name:** `com.julinemart.app` (IMPORTANT: Must match exactly!)
   - **App nickname (optional):** JulineMart Android
   - **Debug signing certificate SHA-1:** (Get from command below)
   
   To get your SHA-1 certificate:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copy the **SHA-1** from the output (under `Variant: debug` → `Config: debug`)

3. Click **"Register app"**

---

## 📥 Step 3: Download google-services.json

1. Click **"Download google-services.json"**
2. Save the file
3. **Move it to:** `android/app/google-services.json`
   
   Windows path:
   ```
   C:\Users\user\julinemart-pwa\android\app\google-services.json
   ```

4. Click **"Next"**

---

## 🔧 Step 4: Add Firebase SDK (Already Done! ✅)

The Capacitor push-notifications plugin handles this automatically. You can skip this step.

Click **"Next"** in Firebase Console.

---

## 🔑 Step 5: Get FCM Server Key

1. In Firebase Console, click the **gear icon** ⚙️ (top-left) → **"Project settings"**
2. Go to the **"Cloud Messaging"** tab
3. Under **"Cloud Messaging API (Legacy)"**, you'll see:
   - **Server key:** `AAAA...` (long string)
   
4. Copy the **Server key**

5. **Add to Netlify environment variables:**
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Select your site → **"Site configuration"** → **"Environment variables"**
   - Click **"Add a variable"** → **"Add a single variable"**
   - Key: `FCM_SERVER_KEY`
   - Value: `AAAA...` (paste your server key)
   - Click **"Create variable"**

6. **Add to local `.env.local`** (for testing):
   ```env
   FCM_SERVER_KEY=AAAA...your-server-key-here
   ```

---

## 🎯 Step 6: Enable Cloud Messaging API

1. In Firebase Console, go to **"Project settings"** → **"Cloud Messaging"** tab
2. If you see a warning about "Cloud Messaging API (Legacy)", you may need to enable the new API:
   - Click **"Manage API in Google Cloud Console"**
   - Make sure **"Firebase Cloud Messaging API"** is **ENABLED**
3. Return to Firebase Console

---

## ✅ Step 7: Test Your Setup

1. Rebuild your Android app:
   ```bash
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   ```

2. Install the new APK on your phone

3. Open the app and sign in (to register your device)

4. Check Android Logcat for:
   ```
   ✅ Push registration success, token: ...
   ✅ FCM token saved to backend
   ```

5. Test sending a notification using the API:
   ```bash
   curl -X POST https://julinemart.com/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": "123",
       "title": "Test Notification",
       "message": "Hello from JulineMart!",
       "type": "general"
     }'
   ```

---

## 🚀 Common Notification Scenarios

### 1. Order Status Update
```javascript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: order.customer_id,
    title: 'Order Update',
    message: `Your order #${order.id} is now ${order.status}`,
    type: 'order_update',
    data: {
      orderId: order.id,
      orderStatus: order.status
    }
  })
});
```

### 2. Abandoned Cart Reminder
```javascript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: cart.customer_id,
    title: 'Items waiting in your cart!',
    message: 'Complete your purchase and enjoy fast delivery',
    type: 'abandoned_cart',
    data: {
      cartId: cart.id
    }
  })
});
```

### 3. New Product Alert
```javascript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer.id,
    title: 'New Arrival!',
    message: `Check out ${product.name} - Now available!`,
    type: 'product',
    data: {
      productId: product.id
    }
  })
});
```

### 4. Promotion Alert
```javascript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer.id,
    title: '🎉 Special Offer!',
    message: 'Get 20% off all electronics this weekend only!',
    type: 'promotion',
    data: {
      category: 'electronics',
      discount: '20%'
    }
  })
});
```

---

## 🐛 Troubleshooting

### Issue: "Push registration error"
- Make sure `google-services.json` is in `android/app/`
- Rebuild the app: `npx cap sync android` and reinstall APK

### Issue: "FCM token not saved to backend"
- Check if user is logged in (token only saves when `customer` exists)
- Check Network tab in Chrome DevTools for API errors

### Issue: "No notification received"
- Verify `FCM_SERVER_KEY` is set in Netlify environment variables
- Check Netlify Function logs for errors
- Make sure app has notification permission (Android Settings → Apps → JulineMart → Notifications)

### Issue: "Notification received but doesn't open app"
- Check the `pushNotificationActionPerformed` listener in `push-notification-manager.tsx`
- Verify the `data.type` matches your notification payload

---

## 📚 Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)

---

## 🎉 You're All Set!

Your push notification system is now configured. Notifications will:
- ✅ Request permission when app opens
- ✅ Register device with FCM
- ✅ Save FCM token to backend
- ✅ Handle notification taps with deep linking
- ✅ Support multiple notification types (order updates, promotions, etc.)

Enjoy sending notifications to your users! 📱✨
