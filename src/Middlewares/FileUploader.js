import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 *  File Uploader middleware
 * @param req  express.Request
 * @param res  express.Response
 * @param next  express.NextFunction
 */

// var upload = multer({ dest: "Upload_folder_name" })
// If you do not want to use diskStorage then uncomment it

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Uploads is the Upload_folder_name
        const splitUrl = req.baseUrl.split('/');
        const dir = 'uploads/' + splitUrl[splitUrl.length - 1];
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir)
    },
    // Generate filename
    filename: function (req, file, cb) {
        let fileType = file.mimetype.split('/')[1];
        if (fileType.includes('+')) {
            fileType = fileType.split('+')[0];
        }
        cb(null, file.fieldname + "-" + Date.now()+ '.' + fileType)
    }
});

// Define the maximum size for uploading
// picture i.e. 1 MB. it is optional
const maxSize = 50 * 1024 * 1024 * 1024;

const upload = multer({
    storage: storage,
    limits:{fileSize: maxSize},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
});

// Check File Type
function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /doc|docx|pdf|ppt|pptx|xls|xlsx|mp4|mov|jpeg|jpg|png|gif|svg|csv|swf|mp3|AVI|WMV|flv|ogg|webm|wav/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: Images & Videos Only!');
    }
}


export default upload;
