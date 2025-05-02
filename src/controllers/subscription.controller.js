import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscriberId = req.user._id;

    if (subscriberId.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });


    if(existingSubscription){
        await existingSubscription.deleteOne();
        return res
            .status(200)
            .json(new ApiResponse(200, null, "Unsubscribed successfully"));
    }

    const newSubscription = await Subscription.create({
        subscriber : subscriberId,
        channel : channelId
    })

    return res.status(201).json(new ApiResponse(201, newSubscription, "Subscribed succesfully"))

})

// controller to return subscriber list of a channel
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscriberId = req.user._id;

    const subscribers = await Subscription.find({
        channel : channelId,}).populate("subscriber", "_id username avatar");

    if(!subscribers || subscribers.length===0){
        throw new ApiError(404, "Subscribers not found")
    }

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched success"));

})

// controller to get channels which the user has subscribed
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    
    const subscriberId = req.user._id;

    const subscribedChannels = await Subscription.find({ subscriber : subscriberId})
        .populate("channel" , "_id username avatar")

    if (!subscribedChannels || subscribedChannels.length === 0) {
        throw new ApiError(404, "No subscribers found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "User subscribers fetched"));

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}