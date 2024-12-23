

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to MongoDB
        await client.connect();
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Database and Collection
        const database = client.db("foodDB");
        const foodCollection = database.collection("foods");



        // get the add food

        // GET Route: Fetch Available Foods
          app.get('/available-foods', async (req, res) => {
          try {
              const availableFoods = await foodCollection.find({ status: "Available" }).toArray();
             res.status(200).send(availableFoods);
            } catch (error) {
               console.error("Error fetching foods:", error);
                res.status(500).send({ success: false, message: "Failed to fetch foods" });
           }
          });

        //   get foods data by id apis

        app.get('/available-foods/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = {_id: new ObjectId(id)}
                const result = await foodCollection.findOne(query);
                res.send(result);

            } catch (error) {
                console.error('Error geting id ', error)
                res.status(500).send({ success: false, message: "Failed to get food id " });

            }
        } )


        // POST Route: Add Food
        app.post('/add-food', async (req, res) => {
            const foodData = req.body;

            try {
                const result = await foodCollection.insertOne(foodData);
                res.status(201).send({ success: true, message: "Food added successfully", data: result });
            } catch (error) {
                console.error("Error adding food:", error);
                res.status(500).send({ success: false, message: "Failed to add food" });
            }
        });



        // get featured food apis
        // GET Route: Fetch Featured Foods
    app.get('/featured-foods', async (req, res) => {
        try {
        const featuredFoods = await foodCollection
            .find({ status: "Available" })
            .sort({ quantity: -1 }) // Sort by quantity in descending order
            .limit(6) // Limit to top 6 items
            .toArray();

        res.status(200).send(featuredFoods);
    } catch (error) {
        console.error("Error fetching featured foods:", error);
        res.status(500).send({ success: false, message: "Failed to fetch featured foods" });
    }
    });


    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

// Root Route
app.get('/', (req, res) => {
    res.send('food cycle successfully show my server');
});

// Start Server
app.listen(port, () => {
    console.log(`Server successfully running on port: ${port}`);
});
















































