const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


// meddleware 

app.use(cors({
  origin: [
    // 'http://localhost:5173'
    "https://car-doctor-3153a.web.app",
    "https://car-doctor-3153a.firebaseapp.com"

  ],
  credentials: true
}))
// app.use(cors())
app.use(express.json())
app.use(cookieParser())


// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWPRD}@cluster0.kothmtv.mongodb.net/?retryWrites=true&w=majority`;
var uri = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWPRD}@ac-erszds0-shard-00-00.kothmtv.mongodb.net:27017,ac-erszds0-shard-00-01.kothmtv.mongodb.net:27017,ac-erszds0-shard-00-02.kothmtv.mongodb.net:27017/?ssl=true&replicaSet=atlas-lnpkx1-shard-0&authSource=admin&retryWrites=true&w=majority`;
MongoClient.connect(uri, function (err, client) {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware

const logger = (req,res,next) => {
  console.log(req.method, req.url);
  next()
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token
  // console.log("user token", token);
  if(!token){
    return res.status(401).send({message : "unathorized access"})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err, decoded) => {
    if(err){
      return res.status(401).send({access : "unathorized access"})
    }
    req.user = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servisesCollection = client.db("carsDoctor").collection("servises")
    const bookingCollection = client.db("carsDoctor").collection("bookings")

    // user jwt

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      })
        .send({ success: true })
    })
    app.post("/logout", async (req,res) => {
      const user = req.body;
      console.log(user);
      res.clearCookie('token',{
        maxAge: 0,
        httpOnly: true,
        secure: false
      })
          .send({ success: true })
    })


    // cars services 
    app.get("/services", async (req, res) => {
      const censor = servisesCollection.find()
      const result = await censor.toArray()
      res.send(result)
    })
    app.get("/checkout/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }

      const options = {

        projection: { _id: 1, title: 1, price: 1, img: 1 },
      };

      const result = await servisesCollection.findOne(query, options)
      res.send(result)
    })


    // booking

    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log(req.query);
      // console.log("user cookies ", req.cookies);
      // jwt vrefiey
      console.log("token owner info", req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: "forbidden access"})
      }

      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.post("/bookingsinfo", async (req, res) => {
      const {_id, ...rest} = req.body;
      // console.log(booking);
      const result = await bookingCollection.insertOne({...rest}) //serviceId: _id,
      res.send(result)
    })

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: id }
      const updeteBooking = req.body
      console.log(updeteBooking);
      const updateDoc = {
        $set: {
          status: updeteBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: id }
      const result = await bookingCollection.deleteOne(filter)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("cars doctor in cooming")
})
app.listen(port, (req, res) => {
  console.log(`cars doctor is running on port ${port}`);
})