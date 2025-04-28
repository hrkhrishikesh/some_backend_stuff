import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    
    try{
        return res
            .status(200)
            .json( new ApiResponse(200, {status : "OK"} , "Everything is working Fine"))
    }
    catch(err){
        throw new ApiError(500, "Healthcheck Failed, Something went wrong");
    }

})

export {
    healthcheck
    }
    