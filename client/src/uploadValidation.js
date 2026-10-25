export const MAX_BYTES=4*1024*1024;
export function validateFile(file){if(!file)return 'Choose a leaf image to continue.';if(!file.size)return 'This image is empty. Choose another file.';if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Choose a JPEG, PNG or WebP image.';if(file.size>MAX_BYTES)return 'Choose an image no larger than 4 MB.';return '';}
