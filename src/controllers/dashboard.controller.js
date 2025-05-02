import mongoose from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id;

    const totalVideos = await Video.countDocuments({owner : userId});
    if (totalVideos === null || totalVideos === undefined) {
        throw new ApiError(
          500,
          "Something went wrong while displaying total videos"
        );
    }

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId,
    });
    if (totalSubscribers === null || totalSubscribers === undefined) {
        throw new ApiError(
          500,
          "Something went wrong while displaying total subscribers"
        );
    }

    const totalVideoLikes = await Like.countDocuments({
        video: {
          $in: await Video.find({ owner: userId }).distinct("_id"),
        },
      });
    if (totalVideoLikes === null || totalVideoLikes === undefined) {
        throw new ApiError(
          500,
          "Something went wrong while displaying total likes"
        );
    }

    const totalTweetLikes = await Like.countDocuments({
        tweet: {
          $in: await Tweet.find({ owner: userId }).distinct("_id"),
        },
    });
    if (totalTweetLikes === null || totalTweetLikes === undefined) {
        throw new ApiError(
          500,
          "Something went wrong while displaying total tweet likes"
        );
    }

    const totalViews = await Video.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$views" }, // Sum up the `views` field
          },
        },
      ]);
    
      if (totalViews === null || totalViews === undefined) {
        throw new ApiError(
          500,
          "Something went wrong while displaying total views"
        );
      }
    
    res.status(200).json(
        new ApiResponse(
          200,
          {
            totalVideos,
            totalSubscribers,
            totalVideoLikes,
            totalTweetLikes,
            totalViews: totalViews[0]?.totalViews || 0, // Default to 0 if no views are found
          },
          "Channel stats fetched successfully"
        )
    );

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user._id;

    const video = await Video.find({
        owner : userId,
    }).sort({
        createdAt : -1,
    });

    if (!video || video.length === 0) {
        throw new ApiError(404, "No videos found for this channel");
    }

    res.status(200).json(
        new ApiResponse(200, video, "Channel videos fetched successfully")
    );

})

export {
    getChannelStats, 
    getChannelVideos
}