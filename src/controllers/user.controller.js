import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})   //becoz we only passing refresh token , not password and other stuff
        
        return {accessToken , refreshToken}
    }
    catch(error){
        throw new ApiError(500, "Something went wrong while generating tokens :(");
    }
}  


const registerUser = asyncHandler(async (req, res) => {
    
    const {fullName, email, username, password} = req.body
    //console.log(fullName, " ", password, " ", email, " ", username);
    
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

const loginUser = asyncHandler(async (req,res) => {
    
    const {email, username, password} = req.body;
    if(!(username || email))
    {
        throw new ApiError(400, "user/email is required");
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedinUser, accessToken, refreshToken
            },
            "User loggedin Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken : 1,
            }
        },
        {
            new : true
        }
    )
    
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse((200), {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized req");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid req token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired/used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken" , accessToken, options)
            .cookie("refreshToken" , newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {
                    accessToken,
                    refreshToken : newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old/prev password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})
    return res.status(200).json(new ApiResponse(200, {}, "Password Change Success"));

})

const getCurrentUser = asyncHandler( async (req,res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user , "Current User Fetched Successfully"));
})

const updateAccountDetails = asyncHandler( async (req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All field are required")
    }

    //-> Need to delete old avatar/cover image
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName : fullName,
                email : email,

            }
        },
        {new : true} 
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user , "Acccount details updated :)"))

})

const updateUserAvatar = asyncHandler( async (req,res) => {

    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400, "Error while updaing/uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated :)"))


})

const updateUserCoverImage = asyncHandler( async (req,res) => {

    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "coverimage file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(400, "Error while updaing/uploading coverimg");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated :)"))

})

const getUserChannelProfile = asyncHandler(async(req, res) => {

    const {username} = req.params;  //getting username from url so params

    if(!username?.trim()){
        throw new ApiError(400, "Username not found/missing")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                avatar:1,
                coverImage:1,
                email: 1,
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400, "Channel not found/does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel retrieved successfully")
        )

})

const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory", 
                    pipeline : [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                 pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1,
                                        }
                                    }
                                 ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first : "$owner"
                                }
                            }
                        } 
                    ]
            }
        }
    ]);

    if (!user || user.length === 0) {
        throw new ApiError(404, "No watch history found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "WatchHistory fetched successfully"))

})


export {
    registerUser, 
    loginUser, 
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}