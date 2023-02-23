const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dtui1ox.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log('db connect');

        let db = client.db("wise-E-commerce")
        let userDetails = db.collection("usersProfile");
        // let booksDetails = db.collection("booksDetails");
        // let recomendedBooksDetails = db.collection("booksDetails");


        const booksOnSaleDetails = db.collection('booksOnSaleDetails');
        const recomandDetails = db.collection('recomendedBooks');
        const cart = db.collection('emailCart');
        const review = db.collection('review');



        // user profile
        app.post('/profile', async (req, res) => {
            let data = req.body;
            let result = await userDetails.insertOne(data);
            res.send(result);
        });


        ///////////////cart22///////////////
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

        ///////////////cart22 close///////////////

        /////////////////review///////////////

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

        /////////////////review close///////////////

        /////////////BooksOnSale Details///////////////

        app.get('/product', async (req, res) => {
            const query = {};
            const options = await booksOnSaleDetails.find(query).toArray();
            res.send(options);
        })


        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id };
            const result = await booksOnSaleDetails.find(query).toArray();
            res.send(result);
        })

        /////////////BooksOnSale Details close///////////////



        //////////recomandBooksOnSale /////////////
        app.get('/recomand', async (req, res) => {
            const query = {};
            const options = await recomandDetails.find(query).toArray();
            res.send(options);
        })
        app.get('/recomand/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id };
            const result = await recomandDetails.find(query).toArray();
            res.send(result);
        })





        // //    books on sale detailes
        // app.get('/product', async (req, res) => {
        //     const query = {};
        //     const options = await booksDetails.find(query).toArray();
        //     res.send(options);
        // })
        // app.get('/product/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { id: id };
        //     const result = await booksDetails.find(query).toArray();
        //     res.send(result);
        // })
        // //   recomemded books  detailes
        // app.get('/product', async (req, res) => {
        //     const query = {};
        //     const options = await recomendedBooksDetails.find(query).toArray();
        //     res.send(options);
        // })
        // app.get('/product/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { id: id };
        //     const result = await recomendedBooksDetails.find(query).toArray();
        //     res.send(result);
        // })

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