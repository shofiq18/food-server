


const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://food-bd-31846.web.app',
        'https://food-bd-31846.firebaseapp.com',
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.user = decoded;
        next();
    });
}

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
        // await client.connect();
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Database and Collections
        const database = client.db("foodDB");
        const foodCollection = database.collection("foods");
        const myRequestsCollection = database.collection("myRequests");
        const newsletterSubscribersCollection = database.collection("newsletterSubscribers");

        // Auth related APIs
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ success: true });
        });

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
                .send({ success: true });
        });

        // Newsletter Subscription Endpoint
        app.post('/newsletter-subscribe', async (req, res) => {
            const { email } = req.body;

            if (!email) {
                return res.status(400).send({ success: false, message: "Email is required" });
            }

            try {
                // Check if email already exists
                const existingSubscriber = await newsletterSubscribersCollection.findOne({ email });
                if (existingSubscriber) {
                    return res.status(409).send({ success: false, message: "Email already subscribed" });
                }

                // Add new subscriber
                const subscriber = {
                    email,
                    subscribedAt: new Date(),
                };
                const result = await newsletterSubscribersCollection.insertOne(subscriber);
                res.status(201).send({ success: true, message: "Subscribed successfully", data: result });
            } catch (error) {
                console.error("Error subscribing to newsletter:", error);
                res.status(500).send({ success: false, message: "Failed to subscribe" });
            }
        });

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

        // GET Route: Fetch Food Details by ID
        app.get('/available-foods/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await foodCollection.findOne(query);
                res.send(result);
            } catch (error) {
                console.error('Error getting food by ID:', error);
                res.status(500).send({ success: false, message: "Failed to fetch food by ID" });
            }
        });

        // GET Route: Fetch Foods Donated by Logged-In User
        app.get('/my-foods', verifyToken, async (req, res) => {
            const userEmail = req.query.email;
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            try {
                const myFoods = await foodCollection.find({ "donator.email": userEmail }).toArray();
                res.status(200).send(myFoods);
            } catch (error) {
                console.error("Error fetching my foods:", error);
                res.status(500).send({ success: false, message: "Failed to fetch my foods" });
            }
        });

        // DELETE Route: Delete a Food
        app.delete('/foods/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
                res.status(200).send({ success: true, message: "Food deleted successfully", data: result });
            } catch (error) {
                console.error("Error deleting food:", error);
                res.status(500).send({ success: false, message: "Failed to delete food" });
            }
        });

        // PATCH Route: Update Food Information details
        app.patch('/foods/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;

            try {
                const result = await foodCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedData }
                );
                res.send({ success: true, message: "Food updated successfully", data: result });
            } catch (error) {
                console.error("Error updating food:", error);
                res.status(500).send({ success: false, message: "Failed to update food" });
            }
        });

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

        // GET Route: Fetch Featured Foods
        app.get('/featured-foods', async (req, res) => {
            try {
                const featuredFoods = await foodCollection
                    .find({ status: "Available" })
                    .sort({ quantity: -1 })
                    .limit(6)
                    .toArray();
                res.status(200).send(featuredFoods);
            } catch (error) {
                console.error("Error fetching featured foods:", error);
                res.status(500).send({ success: false, message: "Failed to fetch featured foods" });
            }
        });

        // GET Route: Fetch My Requests
        app.get('/my-requests', verifyToken, async (req, res) => {
            const userEmail = req.query.email;
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            try {
                const myRequests = await myRequestsCollection.find({ userEmail }).toArray();
                res.status(200).send(myRequests);
            } catch (error) {
                console.error("Error fetching my requests:", error);
                res.status(500).send({ success: false, message: "Failed to fetch my requests" });
            }
        });

        // POST Route: Add to My Requests
        app.post('/my-requests', async (req, res) => {
            const request = req.body;
            try {
                const result = await myRequestsCollection.insertOne(request);
                res.status(201).send({ success: true, message: "Request added successfully", data: result });
            } catch (error) {
                console.error("Error adding to my requests:", error);
                res.status(500).send({ success: false, message: "Failed to add request" });
            }
        });

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error; // Ensure the server doesn't start if MongoDB connection fails
    }
}

run().catch(error => {
    console.error("Server failed to start:", error);
    process.exit(1); // Exit the process if the server fails to start
});

// Root Route
app.get('/', (req, res) => {
    res.send('food cycle successfully show my server');
});

// Start Server
app.listen(port, () => {
    console.log(`Server successfully running on port: ${port}`);
});








































