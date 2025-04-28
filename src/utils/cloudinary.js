import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_API_SECRET // Replace with your actual API secret
});

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })

        //file uploaded successfully
        console.log("File uploaded succesfully on cloudinary : ", response.url);
        fs.unlinkSync(localFilePath);
        //console.log(response);
        return response;

    }catch(error){
        fs.unlinkSync(localFilePath) //remove locally saved temp file 
        console.log("Cloudinary Error while uploading : ", error);
        return null;
    }
}

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const response = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`File with public ID ${publicId} deleted from Cloudinary`);
        return response;
    } catch (error) {
        console.error(`Error deleting file with public ID ${publicId}:`, error.message);
        return null;
    }
};

export {uploadOnCloudinary, deleteFromCloudinary};