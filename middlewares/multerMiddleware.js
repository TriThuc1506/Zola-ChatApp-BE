const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../configs/Cloudinary.config");

const uploadImage = new CloudinaryStorage({
  cloudinary,
  params: {
    // folder: "Zalo_Fake_App",
    allowed_formats: ["jpg", "png", "jpeg","webp"],
    public_id: (req, file) => {
      return `zaloFake_${Date.now()}_${req.user.user_id}`;
    },
    access_mode: "public" 
  },
});



const uploadVideo = new CloudinaryStorage({
  cloudinary,
  params: {
    // folder: "Zalo_Fake_App",
    allowed_formats: ["mp4","mkv","webm","ogg","avi","mov"],
    resource_type: "video",
    public_id: (req, file) => {
      return `zaloFake_${Date.now()}_${req.user.user_id}`;
    },
    access_mode: "public" 
  },
});

const uploadFile = new CloudinaryStorage({
  cloudinary,
  params: {
    resource_type: "auto",
    public_id: (req, file) => {
      return `zaloFake_${Date.now()}_${req.user.user_id}`;
    },
    access_mode: "public" 
  },
});

const multerUploadImage = multer({ storage: uploadImage });
const multerUploadVideo = multer({ storage: uploadVideo });
const multerUploadFile = multer({ storage: uploadFile });
module.exports = { multerUploadImage, multerUploadVideo,multerUploadFile };
