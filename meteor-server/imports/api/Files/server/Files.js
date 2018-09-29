import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import {
  onBeforeUpload,
  onAfterRemove,
  onAfterUpload,
  interceptDownload,
} from './helpers';

const { debug } = Meteor.settings.private;

const Files = new FilesCollection({
  debug,
  throttle: false,
  storagePath: () => `${Meteor.absolutePath}/uploads`,
  downloadRoute: '/uploads',
  collectionName: 'Files',
  allowClientCode: false,
  cacheControl: 'public, max-age=31536000',
  onBeforeUpload(file) {
    return onBeforeUpload(file);
  },
  onBeforeRemove() {
    if (debug) {
      console.log('[onBeforeRemove] Init');
    }

    if (Meteor.userId()) {
      return true;
    }

    return false;
  },
  onAfterRemove(cursor) {
    onAfterRemove(cursor);
  },
  onAfterUpload(fileRef) {
    onAfterUpload(fileRef, this);
  },
  interceptDownload(http, fileRef, version) {
    return interceptDownload(http, fileRef, version, this);
  },
});

export default Files;
