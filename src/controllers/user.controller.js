import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    
    const {fullName, email, username, password} = req.body
    console.log(fullName, " ", password, " ", email, " ", username);
    
    if([fullName, email, username , password].some((field)=> field?.trim() === ""))
    {
        throw new ApiError(400, "Empty Field");
    }

    const existingUser = await User.findOne({
        $or: [{ email: email }, { username: username }]     // or [{email}, {username}]
    });

    if (existingUser) {
        throw new ApiError(409, "User already exists with this email or username");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //Checking if CoverImage exists
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
    {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    //Cloudinary gives empty string if nothing is uploaded

    if(!avatar){
        throw new ApiError(400, "Avatar File required");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Registering user error by server");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Created Succesfully")
    )
})


export {registerUser}