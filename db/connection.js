const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

let db = null;

async function connectDatabase() {
    try {
        if (!db) {
            await client.connect();
            db = client.db('myData');
            console.log("Connected successfully to server");
        }
        return db;
    } catch (err) {
        console.log("Error", err);
        throw err;
    }
}

module.exports = { connectDatabase };