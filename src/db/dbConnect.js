import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//console.log(process.env.MONGODB_URI)
//const localdb = `mongodb://localhost:27017/example/${DB_NAME}`;
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("DATABASE CONNECTED")
        //console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB