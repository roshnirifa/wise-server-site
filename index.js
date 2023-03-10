const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const ObjectId = require('mongodb').ObjectId;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// middleware
app.use(cors());
app.use(express.json());

// mongodb connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dtui1ox.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}
async function run() {
    try {
        await client.connect();
        console.log('db connect');

        let db = client.db("wise-E-commerce")

        let userDetails = db.collection("usersProfile");
        let userCollection = db.collection("users");
        const booksOnSaleDetails = db.collection('booksOnSaleDetails');
        const recomandDetails = db.collection('recomendedBooks');
        const cart = db.collection('myOrder');
        const review = db.collection('review');



        // make admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }



        })

        // all user
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        // ADD PRODUCT

        app.post('/books', async (req, res) => {
            const addItems = req.body;
            // console.log(addItems);
            const result = await recomandDetails.insertOne(addItems);

            res.json(result);
        });

        app.delete('/delete/:id', async (req, res) => {
            let id = req.params.id;
            let query = { _id: ObjectId(id) };
            let data = await recomandDetails.deleteOne(query);
            res.send(data);
        });

        // manage books
        app.get('/books', async (req, res) => {
            const books = await recomandDetails.find().toArray();
            res.send(books);

        });



        // user profile
        app.post('/profile', async (req, res) => {
            let data = req.body;
            let result = await userDetails.insertOne(data);
            res.send(result);
        });


        // cart calculation
        app.get('/cart', async (req, res) => {
            let query = {};

            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }

            const cursor = cart.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.post('/cart', async (req, res) => {
            const order = req.body;
            const result = await cart.insertOne(order);
            res.send(result);
        });


        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await cart.deleteOne(query);
            res.send(result);
        })


        //   review

        app.get('/review', async (req, res) => {
            const query = {};
            const options = await review.find(query).toArray();
            res.send(options);
        })
        app.get('/review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id };
            const result = await review.find(query).toArray();
            res.send(result);
        })
        app.post('/review', async (req, res) => {
            const order = req.body;
            const result = await review.insertOne(order);
            res.send(result);
        });

        //review close

        //BooksOnSale Details

        app.get('/booksOnSale', async (req, res) => {
            const query = {};
            const options = await booksOnSaleDetails.find(query).toArray();
            res.send(options);
        })


        app.get('/booksOnSale/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id };
            const result = await booksOnSaleDetails.find(query).toArray();
            res.send(result);
        })

        //BooksOnSale Details close



        //recomandBooks details


        app.get('/recomandBooks', async (req, res) => {
            const query = {};
            const options = await recomandDetails.find(query).toArray();
            res.send(options);
        })
        app.get('/recomandBooks/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await recomandDetails.find(query).toArray();
            res.send(result);
        })


        app.post('/recomandBooks', async (req, res) => {
            const order = req.body;
            const result = await recomandDetails.insertOne(order);
            res.send(result);
        })




    }
    finally {
        //   await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('running wise E-commerce')
})

app.listen(port, () => {
    console.log(`wise E-commerce listening on port ${port}`)
})