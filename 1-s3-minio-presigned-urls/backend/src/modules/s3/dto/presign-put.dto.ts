import {
    IsNotEmpty,
    IsString,
} from "class-validator"

/**
 * Body của POST /presign/put — filename hiển thị + contentType phải khớp khi client upload.
 * (EN: Body of POST /presign/put — display filename + contentType the client must match on upload.)
 */
export class PresignPutDto {
    @IsString()
    @IsNotEmpty()
    filename!: string

    @IsString()
    @IsNotEmpty()
    contentType!: string
}
