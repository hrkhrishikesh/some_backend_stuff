import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {

    const {tweet} = req.body
    const user = req.user._id

    if(!tweet || !user){
        throw new ApiError(400, "Tweet required")
    }

    if (tweet.trim().length === 0) {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    const newTweet = await Tweet.create(
        {
            content : tweet,
            owner : user
        }
    )
    if(!newTweet){
        throw new ApiError(500, "Error while creating tweet")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, newTweet, "Tweet created successfully"));

})

const getUserTweets = asyncHandler(async (req, res) => {

    const {page = 1 , limit = 10} = req.query;

    const tweets = await Tweet.find({owner : req.user._id})
        .sort({createdAt : -1})
        .skip((page-1)*limit)
        .limit(parseInt(limit));

    if(!tweets.length){
        throw new ApiError(404, "Tweets not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweet retrieved succesfully"));

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!content || content.trim().length == 0){
        throw new ApiError(400, "Tweet content cannot be empty");
    }
    
    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this tweet");
    }   

    tweet.content = content;
    await tweet.save();

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated succesfully"));

})  

const deleteTweet = asyncHandler(async (req, res) => {
    
    const {tweetId} = req.params;

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this tweet");
    } 

    await tweet.deleteOne();

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted succesfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}