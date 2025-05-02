import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name){
        throw new ApiError(400, "Playlist name is required");
    }

    const playlist = await Playlist.create({
        name : name,
        description : description?description:"",
        owner : req.user._id
    })

    if(!playlist){
        throw new ApiError(500, "Something went wrong while creating playlist");
    }

    return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"));
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(401, "Invalid User")
    }

    const playlists = await Playlist.find(
        {owner : userId}).populate("videos", "title thumbnail");

    if (!playlists || playlists.length === 0) {
        throw new ApiError(404, "No playlists found for this user");
    }

    return res.status(200).json(new ApiResponse(200, playlists, "Playlist  returned" ))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(401, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    
    const {playlistId, videoId} = req.params
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already exists in the playlist");
    }
    playlist.videos.push(videoId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findById(playlistId)
        .populate({
            path : "videos",
            select: "title thumbnail",
            options : {sort : {createdAt: -1}}
        });
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    
    playlist.videos = playlist.videos.filter((id) => id.toString() !== videoId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            select: "title thumbnail",
            options: { sort: { createdAt: -1 } },
        });

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you do not have permission to delete it");
    }

    return res.status(200).json(new ApiResponse(200, playlistId, "playlist deleted succesfully"));

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const updateData = {
        ...(name && {name}),
        ...(description && {description}),
    }

    const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user._id },
        updateData,
        { new: true }
    ).populate({
        path: "videos",
        select: "title thumbnail",
        options: { sort: { createdAt: -1 } },
    });

    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you do not have permission to update it");
    }

    res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}