// import { CloudinaryStorage } from 'multer-storage-cloudinary';
// import { Request } from 'express';
// import multer from 'multer';
// import cloudinary from '../types/cloudinary.config';

// const storage = new CloudinaryStorage({
//     cloudinary,
//     params: async (req: Request, file: Express.Multer.File) => {
//         const originalName = file.originalname.split('.')[0];
//         const extension = file.originalname.split('.').pop();
//         return {
//             folder: 'my-app',
//             public_id: `${originalName}_${Date.now()}`,
//             resource_type: 'auto',
//             format: extension,
//         };
//     },
// });

// const upload = multer({ storage });

// export default upload;


import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import multer, { StorageEngine } from 'multer';
import cloudinary from '../types/cloudinary.config';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const storage: StorageEngine = new CloudinaryStorage({
    cloudinary,
    // params: (req: Request, file: Express.Multer.File): Record<string, unknown> => {
    //     const originalName = file.originalname.split('.')[0];
    //     const extension = file.originalname.split('.').pop();
    //     return {
    //         folder: 'my-app',
    //         public_id: `${originalName}_${Date.now()}`,
    //         resource_type: 'auto',
    //         format: extension,
    //     };
    // },
    params: async (req: Request, file: Express.Multer.File) => {
        const originalName = file.originalname.split('.')[0];
        const extension = file.originalname.split('.').pop();
        return {
            folder: 'my-app',
            public_id: `${originalName}_${Date.now()}`,
            resource_type: 'auto',
            format: extension,
        };
    },
}) as StorageEngine;  // ✅ cast to StorageEngine

const upload = multer({ storage });

export { storage };        // ✅ named export
export default upload;