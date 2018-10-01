import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const { debug } = Meteor.settings.public;

const Avatars = new FilesCollection({
  debug,
  throttle: false,
  storagePath: () => `${Meteor.absolutePath}/uploads`,
  downloadRoute: '/images/',
  collectionName: 'Avatars',
  allowClientCode: true,
});

export default Avatars;
