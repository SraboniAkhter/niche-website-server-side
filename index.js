const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");

const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = require('./sunstore-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

// sunstore-firebase-adminsdk.json
// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ggyd6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//  console.log(uri);

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        //  console.log('hit')
        const database = client.db('sunStoreService');
        const productsCollection = database.collection('products');
         const bookingsCollection = database.collection('bookings');
         const reviewCollection = database.collection('review');
         const usersCollection = database.collection('users');

        // Booking POST API
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log('hit the post api', booking);

            const result = await bookingsCollection.insertOne(booking);
            // console.log('connected',result);
            res.json(result)
        });
       // Booking GET API
        app.get('/bookings', async (req, res) => {
            const cursor = bookingsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });

            // post user data
            app.post('/users', async (req, res) => {
                const user = req.body;
                const result = await usersCollection.insertOne(user);
                // console.log(result);
                res.json(result);
            });
            // user
            app.put('/users', async (req, res) => {
                const user = req.body;
                const filter = { email: user.email };
                const options = { upsert: true };
                const updateDoc = { $set: user };
                const result = await usersCollection.updateOne(filter, updateDoc, options);
                res.json(result);
            });
            app.put('/users/admin',verifyToken , async (req, res) => {
                const user = req.body;
                const requester = req.decodedEmail;
                if(requester) {
                    const requesterAccount = await usersCollection.findOne({ email:requester});
                    if(requesterAccount.role === 'admin') {
                        const filter = { email: user.email };
                        const updateDoc = { $set: {role: 'admin' } };
                        const result = await usersCollection.updateOne(filter, updateDoc);
                        res.json(result);
                    }
                }
                else {
                    res.status(403).json({ message: 'you do not have access to make admin' })
                }
                
            });


            app.get('/users/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                let isAdmin = false;
                if (user?.role === 'admin') {
                    isAdmin = true;
                }
                res.json({ admin: isAdmin });
            })

    

        // update api
        // app.put('./bookings/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const updateStatus = req.body
        //     const query = { _id: ObjectId(id) };
        //     const options = {upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             status: updateStatus.status
        //     }
        // }
        //     const result = await bookingsCollection.updateOne(query, options,updateDoc);
        //     res.send(result); 
            
        // })
        

        // GET All Data API
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });
        // get review
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // GET Single product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('getting specific product', id);
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        })

        // POST API
        app.post('/products', async (req, res) => {
            const product = req.body;
            // console.log('hit the post api', product);
             const result = await productsCollection.insertOne(product);
            res.json(result)
        });

        // review post
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            // console.log('hit the post api', product);
             const result = await reviewCollection.insertOne(review);
            res.json(result)
        });

      //  DELETE API
        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.json(result);
        })
      //  DELETE All Product
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })

     }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Running Sun-store Server');
});

app.listen(port, () => {
    console.log('Running Sun-store Server on port', port);
})