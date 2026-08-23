const uploadImageController = async (req, res) => {
    try {
        // Multer attaches the file info to req.file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided."
            });
        }

        // ✅ Cloudinary places the live URL directly inside req.file.path
        const imageUrl = req.file.path;

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully to Cloudinary",
            data: {
                image_url: imageUrl
            }
        });

    } catch (err) {
        console.error("Upload Controller Error:", err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
};

export {
    uploadImageController
};