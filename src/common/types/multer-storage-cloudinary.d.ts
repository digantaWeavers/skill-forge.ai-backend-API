// declare module 'multer-storage-cloudinary' {
//     import { StorageEngine } from 'multer';
//     import { Request } from 'express';
//     import { v2 as CloudinaryType } from 'cloudinary';

//     interface Options {
//         cloudinary: typeof CloudinaryType;
//         params?:
//         | Record<string, unknown>
//         | ((req: Request, file: Express.Multer.File) => Promise<Record<string, unknown>>);
//     }

//     export class CloudinaryStorage implements StorageEngine {
//         constructor(options: Options);
//         _handleFile(
//             req: Request,
//             file: Express.Multer.File,
//             callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
//         ): void;
//         _removeFile(
//             req: Request,
//             file: Express.Multer.File,
//             callback: (error: Error | null) => void,
//         ): void;
//     }
// }


// ✅ NO imports at the top level — use import() inline instead
declare module 'multer-storage-cloudinary' {
    import { StorageEngine } from 'multer';
    import { Request } from 'express';
    import { v2 as CloudinaryType } from 'cloudinary';

    interface Options {
        cloudinary: typeof CloudinaryType;
        params?:
        | Record<string, unknown>
        | ((
            req: Request,
            file: Express.Multer.File,
        ) => Promise<Record<string, unknown>>);
    }

    export class CloudinaryStorage implements StorageEngine {
        constructor(options: Options);
        _handleFile(
            req: Request,
            file: Express.Multer.File,
            callback: (
                error?: Error | null,
                info?: Partial<Express.Multer.File>,
            ) => void,
        ): void;
        _removeFile(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null) => void,
        ): void;
    }
}