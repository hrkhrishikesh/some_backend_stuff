import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    if(!req.user){
        throw new ApiError(401, "User must be logged in ");
    }

    const match = {
        ...(query ? {title: {$regex: query, $options : "i"}} : {}),
        ...(userId ? {owner: userId} : {}),
    }

    const videos = await Video.aggregate([
        { $match : match},
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as : "videosByOwner",
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                owner: {
                    $arrayElemAt : ["$videosByOwner", 0],
                }
            }
        },
        {
            $sort : { [sortBy] : sortType === "desc" ? -1 : 1}
        },
        {
            $skip : (page-1) * parseInt(limit),
        },
        {
            $limit : parseInt(limit)
        }
    ]);

    if(!videos?.length){
        throw new ApiError(404, "Videos not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched succesfully"));

});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, isPublished} = req.body
    //get video, upload to cloudinary, create video
    
    if(!title || !description){
        throw new ApiError(400, "Title or Description should not be empty");
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    if(!videoFilePath){
        throw new ApiError(400, "Video file is req");
    }

    const thumbnailFilePath =req.files?.thumbnail[0]?.path;
    if(!thumbnailFilePath){
        throw new ApiError(400, "Thumbnail file is req");
    }

    const video = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
    if (!video.url) {
        throw new ApiError(500, "Failed to upload video to Cloudinary");
    }
    if (!thumbnail.url) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
    }

    const videoInfo = await Video.create({
        title: title,
        description: description,
        videoFile: video.url, // URL of the uploaded video
        thumbnail: thumbnail.url, // URL of the uploaded thumbnail
        duration : video.duration,
        owner: req.user._id, // User who uploaded the video
        isPublished : isPublished
    });

    if (!videoInfo) {
        throw new ApiError(500, "Something went wrong while publishing a video");
    }

    return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published success"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //get video by id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Video not found/Invalid video Id");
    }

    const video = await Video.findById(videoId).populate("owner", "name email");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Video not found/Invalid video Id");
    }

    const { title, description } = req.body;
    const thumbnailFilePath = req.files?.thumbnail?.[0]?.path;

    if (!title && !description && !thumbnailFilePath) {
        throw new ApiError(400, "At least one field (title, description, thumbnail) must be provided for update");
    }

    const updateData = {
        ...(title && { title }),
        ...(description && { description }),
    };

    if (thumbnailFilePath) {
        const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
        updateData.thumbnailUrl = thumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updateData, { new: true });

    if (!updatedVideo) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }
    
    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(400, `video with id ${videoId} is already deleted`)
    }

    const videoPublicId = video.videoFile.split("/").pop().split(".")[0];
    const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];

    try {
        await deleteFromCloudinary(videoPublicId, "video");
        console.log(`Video with public ID ${videoPublicId} deleted from Cloudinary`);
    } catch (error) {
        console.error(`Failed to delete video from Cloudinary: ${error.message}`);
    }

    try {
        await deleteFromCloudinary(thumbnailPublicId, "image");
        console.log(`Thumbnail with public ID ${thumbnailPublicId} deleted from Cloudinary`);
    } catch (error) {
        console.error(`Failed to delete thumbnail from Cloudinary: ${error.message}`);
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "Video deleted succesfully"));

});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    video.isPublished = !video.isPublished;

    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, `Video publish status toggled to ${video.isPublished ? "published" : "unpublished"}`));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}