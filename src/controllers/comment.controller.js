import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, " Video ID invalid");
    }

    const comments = await Comment.find({video : videoId})
        .sort({createdAt : -1})
        .skip((page-1)*limit)
        .limit(parseInt(limit))
        .populate("owner", "username avatar");

    if(!comments.length){
        throw new ApiError(404, "No comments found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comment retrived success"))

})

const addComment = asyncHandler(async (req, res) => {
    
    const {videoId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, " Video ID invalid");
    }
    if (!req.user) {
        throw new ApiError(401, "User needs to be logged in");
    }
    if(!content || content.trim().length === 0){
        throw new ApiError(400, "Comment cannot be empty");
    }

    const comment = await Comment.create({
        video : videoId,
        owner : req.user._id,
        content: content
    })

    if(!comment){
        throw new ApiError(500, "Error while Creating Comment")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "comment added"));
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty");
    }


    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check ownership
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    comment.content = content;
    await comment.save();

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"));

})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check ownership
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await comment.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}