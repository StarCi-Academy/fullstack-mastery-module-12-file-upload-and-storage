import {
    IsNotEmpty,
    IsString,
} from "class-validator"

/**
 * Body of POST /presign/put — display filename + contentType the client must match on upload.
 */
export class PresignPutDto {
    @IsString()
    @IsNotEmpty()
    filename!: string

    @IsString()
    @IsNotEmpty()
    contentType!: string
}
