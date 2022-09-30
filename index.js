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

        const db = client.db("wise-E-commerce")
        let userDetails = db.collection("usersProfile");


        // user profile
        app.post('/profile', async (req, res) => {
            let data = req.body;
            let result = await userDetails.insertOne(data);
            res.send(result);
        });













    } finally {
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