Perfect 👍
Your output confirms **MongoDB is installed correctly and running** on your VPS.

```
MongoDB version: 6.0.27
OS: Ubuntu 22.04
Architecture: x86_64
```

So now let’s do the **IMPORTANT production steps** that most tutorials forget.

---

## ✅ STEP 1: Check MongoDB Service Status

```bash
sudo systemctl status mongod
```

You should see:

```
active (running)
```

If not running:

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## ⚠️ STEP 2: SECURE MongoDB (VERY IMPORTANT 🔥)

Right now MongoDB is **OPEN by default** (no auth).
This is **dangerous on a VPS**.

### 2.1 Open Mongo Shell

```bash
mongosh
```

---

### 2.2 Switch to admin DB

```js
use admin
```

---

### 2.3 Create Admin User

```js
db.createUser({
  user: "admin",
  pwd: "StrongPasswordHere",
  roles: [{ role: "root", db: "admin" }]
})
```

✅ You should see:

```
{ ok: 1 }
```

Exit shell:

```bash
exit
```

---

## 🔐 STEP 3: Enable Authentication

Edit MongoDB config:

```bash
sudo nano /etc/mongod.conf
```

### Find:

```yaml
#security:
```

### Change to:

```yaml
security:
  authorization: enabled
```

---

### Also make sure MongoDB is local-only (VERY IMPORTANT)

Under `net:` ensure:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

🚫 NEVER use `0.0.0.0` unless you know what you’re doing.

---

### Restart MongoDB

```bash
sudo systemctl restart mongod
```

---

## ✅ STEP 4: Create App Database + User

Login with admin:

```bash
mongosh -u admin -p --authenticationDatabase admin
```

### Create your app DB

```js
use gold_db
```

### Create app user (recommended)

```js
db.createUser({
  user: "gold_user",
  pwd: "GoldStrongPassword",
  roles: [{ role: "readWrite", db: "gold_db" }]
})
```

Exit:

```bash
exit
```

---

## 🔗 STEP 5: Connect MongoDB to Node.js App

### Update `.env`

```env
MONGO_URI=mongodb://gold_user:GoldStrongPassword@127.0.0.1:27017/gold_db
```

---

### Example Mongoose Connection

```js
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));
```

---

## ▶ STEP 6: Start Backend with PM2

```bash
pm2 start app.js --name gold-backend
pm2 save
pm2 startup
```

Check logs:

```bash
pm2 logs gold-backend
```

---

## 🔥 FINAL PRODUCTION CHECKLIST (IMPORTANT)

✔ MongoDB installed
✔ MongoDB authentication enabled
✔ DB bound to localhost only
✔ Separate DB user created
✔ Credentials stored in `.env`
✔ App running via PM2

---

## 🚨 DO THIS NOW (Security)

Enable firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

🚫 Do **NOT** open port `27017`

---

## 🎯 What I Can Help With Next

* Nginx reverse proxy
* HTTPS (SSL) with Certbot
* PM2 auto-restart on crash
* MongoDB backup strategy
* Move uploads to cloud storage

Just tell me 🚀
