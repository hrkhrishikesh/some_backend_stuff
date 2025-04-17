import dotenv from "dotenv"
import connectDB from "./db/dbConnect.js";
import app from "./app.js"

dotenv.config()

//console.log("ENV = " , process.env.PORT , " ", process.env.MONGODB_URI );

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, ()=>{
        console.log("Server Running");
    })
})
.catch((err) => {
    console.log("Error connecting DB : ", err);
})
