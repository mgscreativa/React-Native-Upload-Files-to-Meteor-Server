import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const { debug } = Meteor.settings.public;

const Files = new FilesCollection({
  debug,
  throttle: false,
  storagePath: () => `${Meteor.absolutePath}/uploads`,
  downloadRoute: '/uploads',
  collectionName: 'Files',
  allowClientCode: false,
  cacheControl: 'public, max-age=31536000',
  onbeforeunloadMessage() {
    return 'Upload is still in progress! Upload will be aborted if you leave this page!';
  },
  onBeforeUpload(file) {
    if (Meteor.userId()) {
      if (file.size > 10485760) {
        return 'Please upload image with size less than 10MB.';
      }

      if (
        !RegExp(Meteor.settings.public.allowedUploadFormats, 'i').test(
          file.extension,
        )
      ) {
        return `${file.extension} files are not allowed for upload.`;
      }

      return true;
    }

    return 'Not enough rights to upload a file!';
  },
});

export default Files;
