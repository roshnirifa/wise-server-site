const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const SSLCommerzPayment = require("sslcommerz-lts");

const app = express();
const port = process.env.PORT || 5000;
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox

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
        const orders = db.collection('cartOrder');



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

        // payment
        // app.post('/create-payment-intent', async (req, res) => {
        //     const service = req.body;
        //     const price = service.price;
        //     const amount = price * 100;

        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: 'usd',
        //         payment_method_types: [
        //             'card'
        //         ],
        //     });

        //     res.send({
        //         clientSecret: paymentIntent.client_secret,
        //     })
        // })


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

        // #update cart start
        app.post('/cart/:id', async (req, res) => {
            const id = req.params.id;

            const filter = { _id: ObjectId(id) };
            const options = { new: true };
            const updatedDoc = {
                $set: {
                    subQuantity: req.body.subQuantity,
                },
            };
            const result = await cart.updateOne(filter, updatedDoc);
            res.send(result);
        });
        // #update cart end


        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await cart.deleteOne(query);
            res.send(result);
        })


        ////////////////orderPayment start/////
        app.get('/orders', async (req, res) => {
            const query = {};
            const options = await orders.find(query).toArray();
            res.send(options);
        });
        app.post('/orders', async (req, res) => {
            const order = req.body;


            const transactionId = new ObjectId().toString();


            const data = {
                total_amount: order.totalPrice,
                currency: order.currency,
                tran_id: transactionId, // use unique tran_id for each api call
                success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${transactionId}`,
                fail_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${transactionId}`,
                cancel_url: `${process.env.SERVER_URL}/payment/cancel`,
                ipn_url: "http://localhost:3030/ipn",
                shipping_method: "Courier",
                product_name: "Computer.",
                product_category: "Electronic",
                product_profile: "general",
                cus_name: order.customer,
                cus_email: order.email,
                cus_add1: order.address,
                cus_add2: "Dhaka",
                cus_city: "Dhaka",
                cus_state: "Dhaka",
                cus_postcode: "1000",
                cus_country: "Bangladesh",
                cus_phone: "01711111111",
                cus_fax: "01711111111",
                ship_name: "Customer Name",
                ship_add1: "Dhaka",
                ship_add2: "Dhaka",
                ship_city: "Dhaka",
                ship_state: "Dhaka",
                ship_postcode: order.postcode,
                ship_country: "Bangladesh",
            };

            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
            sslcz.init(data).then((apiResponse) => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL;
                console.log(apiResponse);
                orders.insertOne({
                    ...order,
                    price: order.totalPrice,
                    transactionId,
                    paid: false,
                });
                res.send({ url: GatewayPageURL });
            });


        });
        // app.post('/orders', async (req, res) => {
        //     const order = req.body;
        //     const result = await orders.insertOne(order);
        //     res.send(result);
        // });;

        app.post("/payment/success", async (req, res) => {
            const { transactionId } = req.query;

            if (!transactionId) {
                return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
            }

            const result = await orders.updateOne(
                { transactionId },
                { $set: { paid: true, paidAt: new Date() } }
            );

            if (result.modifiedCount > 0) {
                res.redirect(`${process.env.CLIENT_URL}/payment/success?transactionId=${transactionId}`);
            }
        });

        app.post("/payment/fail", async (req, res) => {
            const { transactionId } = req.query;
            if (!transactionId) {
                return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
            }
            const result = await orders.deleteOne({ transactionId });
            if (result.deletedCount) {
                res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
            }
        });

        app.get("/orders/by-transaction-id/:id", async (req, res) => {
            const { id } = req.params;
            const order = await orders.findOne({ transactionId: id });
            console.log(id, order);
            res.send(order);
        });
        ////////////////orderPayment end/////



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
        });;

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