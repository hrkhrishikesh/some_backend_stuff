import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//const localdb = `mongodb://localhost:27017/example/${DB_NAME}`;
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //console.log("DATABASE CONNECTED")
        console.log(`\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB